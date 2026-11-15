// Motor de estudo: revisão espaçada, maestria e escolha de itens. TypeScript puro.
import { EstadoEstudo, EstadoItem, Faixa, Item } from './tipos';
import { Rng, escolher } from './rng';

/** Intervalo em dias reais até a próxima revisão, por caixa. */
export const INTERVALOS = [0, 1, 3, 7, 16, 35, 75];
const PESO_CAIXA = [0, 0.2, 0.5, 0.7, 0.85, 1, 1];
export const SACHES_POR_DIA = 3;

/** Dia local corrente, como número inteiro. */
export function hoje(): number {
  const d = new Date();
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

export function novoEstudo(): EstadoEstudo {
  return { v: 1, itens: {}, caderno: [], sequencia: 0, sacheDia: 0, sachesUsados: 0, revisaoDia: 0, totalRespondidos: 0, totalAcertos: 0 };
}

export function estadoDe(e: EstadoEstudo, id: string): EstadoItem {
  let s = e.itens[id];
  if (!s) {
    s = { caixa: 0, vence: 0, vistos: 0, acertos: 0, errouAntes: false };
    e.itens[id] = s;
  }
  return s;
}

export interface ResultadoResposta {
  insight: number;
  consolidada: boolean;
  adiantado: boolean;
}

/** Registra uma resposta. Treino adiantado (antes do prazo) não avança a caixa nem rende Insight. */
export function responder(e: EstadoEstudo, item: Item, acerto: boolean, dia: number, usouDica: boolean, bonus = 1): ResultadoResposta {
  const s = estadoDe(e, item.id);
  const adiantado = s.caixa > 0 && s.vence > dia;
  s.vistos++;
  e.totalRespondidos++;
  let insight = 0;
  let consolidada = false;
  if (acerto) {
    s.acertos++;
    e.totalAcertos++;
    e.sequencia++;
    if (!adiantado) {
      s.caixa = s.caixa === 0 ? 2 : Math.min(6, s.caixa + 1);
      s.vence = dia + (INTERVALOS[s.caixa] as number);
      insight = item.dif * 2 + (e.sequencia >= 3 ? 1 : 0);
      if (s.errouAntes) {
        consolidada = true;
        insight += 2;
        s.errouAntes = false;
        for (const r of e.caderno) if (r.itemId === item.id) r.resolvido = true;
      }
      if (usouDica) insight = Math.max(1, Math.floor(insight / 2));
      insight = Math.round(insight * bonus);
    }
  } else {
    e.sequencia = 0;
    s.caixa = 1;
    s.vence = dia + 1;
    s.errouAntes = true;
    if (!e.caderno.some((r) => r.itemId === item.id && !r.resolvido)) {
      e.caderno.unshift({ itemId: item.id, dia, resolvido: false });
    }
  }
  return { insight, consolidada, adiantado };
}

export interface Maestria {
  valor: number;
  faixa: Faixa;
  vencidos: number;
  vistos: number;
  total: number;
}

export function faixaDe(valor: number): Faixa {
  return valor >= 85 ? 'Ouro' : valor >= 60 ? 'Prata' : valor >= 35 ? 'Bronze' : 'Novo';
}

/** Maestria de um conjunto de itens (um tópico). Item vencido pesa menos: é o playbook enferrujando. */
export function maestria(e: EstadoEstudo, itens: Item[], dia: number): Maestria {
  let soma = 0;
  let vencidos = 0;
  let vistos = 0;
  for (const it of itens) {
    const s = e.itens[it.id];
    if (!s || s.caixa === 0) continue;
    vistos++;
    let p = PESO_CAIXA[s.caixa] as number;
    if (s.vence <= dia) {
      vencidos++;
      p *= 0.7;
    }
    soma += p;
  }
  const valor = itens.length ? Math.round((soma / itens.length) * 100) : 0;
  return { valor, faixa: faixaDe(valor), vencidos, vistos, total: itens.length };
}

export function itensVencidos(e: EstadoEstudo, todos: Item[], dia: number): Item[] {
  return todos.filter((it) => {
    const s = e.itens[it.id];
    return !!s && s.caixa > 0 && s.vence <= dia;
  });
}

/**
 * Diretor de Estudos: escolhe o próximo item de um conjunto.
 * Composição-alvo: 60% vencidos ou fracos, 25% novos, 15% dominados.
 */
export function escolherItem(e: EstadoEstudo, pool: Item[], dia: number, rng: Rng, excluir: Set<string>): Item {
  const livres = pool.filter((it) => !excluir.has(it.id));
  const base = livres.length ? livres : pool;
  const venc: Item[] = [];
  const novos: Item[] = [];
  const dom: Item[] = [];
  for (const it of base) {
    const s = e.itens[it.id];
    if (!s || s.caixa === 0) novos.push(it);
    else if (s.vence <= dia || s.caixa <= 1) venc.push(it);
    else dom.push(it);
  }
  const r = rng();
  const ordem = r < 0.6 ? [venc, novos, dom] : r < 0.85 ? [novos, venc, dom] : [dom, venc, novos];
  for (const grupo of ordem) {
    if (grupo.length) {
      // dentro dos novos, prefere os mais fáceis primeiro
      if (grupo === novos) {
        const minDif = Math.min(...grupo.map((g) => g.dif));
        const faceis = grupo.filter((g) => g.dif === minDif);
        return escolher(rng, faceis);
      }
      return escolher(rng, grupo);
    }
  }
  return base[0] as Item;
}

export function sachesRestantes(e: EstadoEstudo, dia: number, extra: number): number {
  if (e.sacheDia !== dia) return SACHES_POR_DIA + extra;
  return Math.max(0, SACHES_POR_DIA + extra - e.sachesUsados);
}

export function usarSache(e: EstadoEstudo, dia: number): void {
  if (e.sacheDia !== dia) {
    e.sacheDia = dia;
    e.sachesUsados = 0;
  }
  e.sachesUsados++;
}
