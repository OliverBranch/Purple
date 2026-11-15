// Motor do atendimento prático. TypeScript puro.
// Um caso é: chamado → investigação (ferramentas reais, marcar evidências) → resolução (decisões técnicas)
// → verificação opcional → laudo. Cada decisão aponta para um conceito do edital (item do banco).

export interface Linha {
  t: string;
  /** id da evidência que esta linha revela, se for suspeita */
  pista?: string;
}

export interface Ferramenta {
  id: string;
  nome: string;
  desc: string;
  horas: number;
  linhas: Linha[];
  /** nó da árvore que libera a ferramenta */
  requer?: string;
  usada?: boolean;
}

export interface Pergunta {
  p: string;
  r: string;
  horas: number;
  pista?: string;
  feita?: boolean;
}

export interface Evidencia {
  id: string;
  nome: string;
}

interface EtapaBase {
  titulo: string;
  pergunta: string;
  explicacao: string;
  item?: string;
  laudo?: boolean;
  horasErro?: number;
  nota?: number; // 0..1 depois de respondida
}

export interface EtapaEscolha extends EtapaBase { tipo: 'escolha'; opcoes: string[]; correta: number; resp?: number; removidas?: number[] }
export interface EtapaMulti extends EtapaBase { tipo: 'multi'; opcoes: { t: string; ok: boolean }[]; mono?: boolean; resp?: number[] }
export interface EtapaOrdem extends EtapaBase { tipo: 'ordem'; opcoes: string[]; certa: number[]; resp?: number[] }
export interface Campo { aceita: string[]; opcoes?: string[]; dica?: string }
export interface EtapaCampos extends EtapaBase { tipo: 'campos'; cab: string[]; linhas: { rotulo: string[]; campos: Campo[] }[]; resp?: string[][] }
export interface EtapaCE extends EtapaBase { tipo: 'ce'; afirmacoes: { t: string; certo: boolean; item?: string; por: string }[]; resp?: boolean[] }

export type Etapa = EtapaEscolha | EtapaMulti | EtapaOrdem | EtapaCampos | EtapaCE;

export type FaseCaso = 'investigar' | 'resolver' | 'verificar' | 'laudo' | 'fim';

export interface CasoPratico {
  servico: string;
  titulo: string;
  chamado: string;
  horasPrazo: number;
  horas: number;
  perguntas: Pergunta[];
  ferramentas: Ferramenta[];
  evidencias: Evidencia[];
  achadas: string[]; // evidências encontradas
  marcadas: string[]; // `${ferramenta}:${linha}`
  falsas: number;
  causaRaiz?: string;
  etapas: Etapa[];
  fase: FaseCaso;
  etapa: number;
  verificacao: { texto: string; horas: number; resultado: string; feita?: boolean };
  vista?: string; // ferramenta aberta no terminal
}

export const normalizar = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, '').replace(/^\//, '');

export function usarFerramenta(c: CasoPratico, id: string, multHoras: number, temNo: (no: string) => boolean): boolean {
  const f = c.ferramentas.find((x) => x.id === id);
  if (!f) return false;
  if (f.requer && !temNo(f.requer)) return false;
  if (!f.usada) {
    f.usada = true;
    c.horas += f.horas * multHoras;
  }
  c.vista = id;
  return true;
}

export function perguntar(c: CasoPratico, i: number): void {
  const p = c.perguntas[i];
  if (!p || p.feita) return;
  p.feita = true;
  c.horas += p.horas;
  if (p.pista && !c.achadas.includes(p.pista)) c.achadas.push(p.pista);
}

/** Marca ou desmarca uma linha como evidência. Marcar linha inocente conta como falso indício. */
export function marcar(c: CasoPratico, ferramenta: string, i: number): 'nova' | 'falsa' | 'desmarcada' | 'nada' {
  if (c.fase !== 'investigar') return 'nada';
  const f = c.ferramentas.find((x) => x.id === ferramenta);
  const l = f?.linhas[i];
  if (!f || !l) return 'nada';
  const k = `${ferramenta}:${i}`;
  if (c.marcadas.includes(k)) {
    c.marcadas = c.marcadas.filter((x) => x !== k);
    if (!l.pista) c.falsas = Math.max(0, c.falsas - 1);
    else if (!c.marcadas.some((m) => pistaDe(c, m) === l.pista) && !c.perguntas.some((p) => p.feita && p.pista === l.pista)) c.achadas = c.achadas.filter((x) => x !== l.pista);
    return 'desmarcada';
  }
  c.marcadas.push(k);
  if (!l.pista) {
    c.falsas++;
    return 'falsa';
  }
  if (!c.achadas.includes(l.pista)) c.achadas.push(l.pista);
  return 'nova';
}

function pistaDe(c: CasoPratico, k: string): string | undefined {
  const [fid, li] = k.split(':');
  return c.ferramentas.find((x) => x.id === fid)?.linhas[Number(li)]?.pista;
}

export function concluirInvestigacao(c: CasoPratico): void {
  if (c.fase !== 'investigar') return;
  c.fase = 'resolver';
  c.etapa = c.etapas.findIndex((e) => !e.laudo);
  if (c.etapa < 0) c.etapa = 0;
}

/** Nota de uma etapa entre 0 e 1. */
export function corrigir(e: Etapa): number {
  switch (e.tipo) {
    case 'escolha':
      return e.resp === e.correta ? 1 : 0;
    case 'multi': {
      const r = new Set(e.resp ?? []);
      const certos = e.opcoes.filter((o) => o.ok).length || 1;
      let ok = 0;
      let errado = 0;
      e.opcoes.forEach((o, i) => {
        if (r.has(i) && o.ok) ok++;
        if (r.has(i) && !o.ok) errado++;
      });
      return Math.max(0, (ok - errado) / certos);
    }
    case 'ordem': {
      const r = e.resp ?? [];
      let pos = 0;
      e.certa.forEach((v, i) => { if (r[i] === v) pos++; });
      const intrusos = r.filter((v) => !e.certa.includes(v)).length;
      return Math.max(0, (pos - intrusos * 0.5) / e.certa.length);
    }
    case 'campos': {
      let total = 0;
      let ok = 0;
      e.linhas.forEach((l, i) => l.campos.forEach((c, j) => {
        total++;
        const v = normalizar(e.resp?.[i]?.[j] ?? '');
        if (c.aceita.some((a) => normalizar(a) === v)) ok++;
      }));
      return total ? ok / total : 1;
    }
    case 'ce': {
      const n = e.afirmacoes.length || 1;
      return e.afirmacoes.filter((a, i) => e.resp?.[i] === a.certo).length / n;
    }
  }
}

export function responderEtapa(c: CasoPratico): number {
  const e = c.etapas[c.etapa];
  if (!e) return 0;
  e.nota = corrigir(e);
  if (e.nota < 0.99) c.horas += e.horasErro ?? 0.5;
  return e.nota;
}

/** Avança para a próxima etapa; entre a resolução e o laudo há a escolha de verificar. */
export function proximaEtapa(c: CasoPratico): void {
  const atual = c.etapas[c.etapa];
  const prox = c.etapas.findIndex((e, i) => i > c.etapa && e.nota === undefined);
  if (prox < 0) {
    c.fase = 'fim';
    return;
  }
  if (!atual?.laudo && c.etapas[prox]?.laudo) {
    c.fase = 'verificar';
    c.etapa = prox;
    return;
  }
  c.etapa = prox;
}

export function decidirVerificacao(c: CasoPratico, fazer: boolean): void {
  if (c.fase !== 'verificar') return;
  if (fazer) {
    c.verificacao.feita = true;
    c.horas += c.verificacao.horas;
  }
  c.fase = 'laudo';
}

export interface Resultado {
  correcao: number;
  laudo: number;
  raiz: number;
  eficiencia: number;
  qualidade: number;
  retorno: boolean;
}

export function avaliar(c: CasoPratico, rng: () => number, chanceRetorno = 1): Resultado {
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1);
  const correcao = media(c.etapas.filter((e) => !e.laudo).map((e) => e.nota ?? 0));
  const laudo = media(c.etapas.filter((e) => e.laudo).map((e) => e.nota ?? 0));
  const fracEvid = c.evidencias.length ? c.evidencias.filter((e) => c.achadas.includes(e.id)).length / c.evidencias.length : 1;
  const raiz = c.causaRaiz ? (c.achadas.includes(c.causaRaiz) ? 0.6 : 0) + 0.4 * fracEvid : fracEvid;
  const sobra = c.horas <= c.horasPrazo ? 1 : Math.max(0, 1 - (c.horas - c.horasPrazo) / c.horasPrazo);
  const eficiencia = Math.max(0, sobra - c.falsas * 0.04);
  const qualidade = Math.round(100 * Math.max(0, Math.min(1, 0.45 * correcao + 0.2 * laudo + 0.15 * raiz + 0.2 * eficiencia)));
  const pRetorno = c.verificacao.feita ? 0 : (1 - raiz) * 0.6 + (1 - correcao) * 0.3;
  return { correcao, laudo, raiz, eficiencia, qualidade, retorno: rng() < pRetorno * chanceRetorno };
}

/** Itens do banco tocados por uma etapa, com o acerto de cada um. */
export function itensDaEtapa(e: Etapa): { item: string; acerto: boolean }[] {
  if (e.tipo === 'ce') {
    return e.afirmacoes.flatMap((a, i) => (a.item ? [{ item: a.item, acerto: e.resp?.[i] === a.certo }] : []));
  }
  return e.item ? [{ item: e.item, acerto: (e.nota ?? 0) >= 0.99 }] : [];
}
