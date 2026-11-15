// Motor de incidente em tempo real. Um atendimento acontece no mapa da rede do cliente:
// a ameaça evolui hora a hora, o técnico executa ferramentas e ações que custam horas,
// e cada decisão certa ou errada está amarrada a um conceito do edital.
// TypeScript puro e serializável (o atendimento em andamento vai para o save).
import { Rng, clamp } from './rng';

export type TipoNo =
  | 'pc' | 'servidor' | 'hub' | 'switch' | 'roteador' | 'repetidor' | 'bridge' | 'modem' | 'internet'
  | 'impressora' | 'fita' | 'slot' | 'depto' | 'objeto' | 'notebook';

export interface NoInc {
  id: string;
  tipo: TipoNo;
  nome: string;
  /** posição em pixels no mapa lógico de 480×270 */
  x: number;
  y: number;
  dono?: string;
  /** 0 = limpo; >0 = comprometido (o valor é o dano acumulado, 0..1) */
  infec: number;
  /** o jogador conhece o estado real deste nó */
  visto: boolean;
  tags: string[];
  /** variação visual (objetos do diagnóstico, cor da pessoa) */
  arte?: number;
}

export interface LinkInc {
  a: string;
  b: string;
  tipo: 'cabo' | 'discada' | 'longo';
  metros?: number;
}

export type TipoEntrada = 'info' | 'pista' | 'alerta' | 'ok' | 'erro' | 'cliente' | 'sistema';
export interface Entrada { id: number; h: number; txt: string; tipo: TipoEntrada; no?: string }

export interface AcaoDef {
  id: string;
  nome: string;
  desc: string;
  horas: number;
  /** tipos de nó onde a ação se aplica; null = ação geral, sem alvo */
  alvo: TipoNo[] | null;
  tipo: 'ferramenta' | 'acao';
  /** nó da árvore de tecnologia que libera a ação */
  requer?: string;
  custo?: number;
  icone?: string;
}

export interface Objetivo { id: string; txt: string; feito: boolean; oculto?: boolean }

export interface Laudo {
  enunciado: string;
  opcoes: string[];
  correta: number;
  escolha?: number;
  item?: string;
  porque: string;
}

export interface Licao { ok: boolean; titulo: string; porque: string; item?: string }

export interface Ataque { id: number; alvo: string; porta: number; rotulo: string; sai: number; chega: number; de: string }

export interface Incidente {
  modo: string;
  titulo: string;
  chamado: string;
  contato: string;
  dif: 1 | 2 | 3;
  ano: number;
  topicos: string[];
  nos: NoInc[];
  links: LinkInc[];
  hora: number;
  limite: number;
  paciencia: number;
  prejuizo: number;
  custos: number;
  log: Entrada[];
  seq: number;
  acao: { id: string; no: string | null; ini: number; fim: number } | null;
  feitas: string[];
  obj: Objetivo[];
  /** dados próprios do modo (sempre JSON puro) */
  d: Record<string, any>;
  ataques: Ataque[];
  perguntasEm: number[];
  pendente: string | null;
  respostas: { item: string; ok: boolean }[];
  licoes: Licao[];
  fim: boolean;
  laudo: Laudo[];
  encerrado: boolean;
  motivoFim?: string;
}

/** Saídas visuais e sonoras do motor. A interface implementa; os testes usam um mudo. */
export interface Fx {
  efeito(tipo: 'infecta' | 'limpa' | 'bloqueia' | 'acerta' | 'erra' | 'pacote' | 'alerta' | 'conclui' | 'quebra', no?: string, extra?: string): void;
}
export const FX_MUDO: Fx = { efeito: () => undefined };

export interface Regras {
  acoes: AcaoDef[];
  /** true = pode; string = por que não pode (aparece desabilitado com a explicação) */
  disponivel?(inc: Incidente, a: AcaoDef, no: NoInc | null): true | string;
  tick(inc: Incidente, dh: number, rng: Rng, fx: Fx): void;
  executar(inc: Incidente, a: AcaoDef, no: NoInc | null, rng: Rng, fx: Fx): void;
  objetivos(inc: Incidente): void;
  laudo(inc: Incidente, rng: Rng): Laudo[];
  /** 0..1: quanto do serviço ficou realmente resolvido (para nota e retorno) */
  resolucao(inc: Incidente): number;
  /** lições finais calculadas a partir do estado (o que faltou) */
  balanco?(inc: Incidente): Licao[];
}

// ---------------- utilidades ----------------

export function novoIncidente(base: Pick<Incidente, 'modo' | 'titulo' | 'chamado' | 'contato' | 'dif' | 'ano' | 'topicos' | 'nos' | 'links' | 'limite'> & { d?: Record<string, any> }): Incidente {
  const inc: Incidente = {
    ...base,
    d: base.d ?? {},
    hora: 0, paciencia: 100, prejuizo: 0, custos: 0,
    log: [], seq: 0, acao: null, feitas: [], obj: [], ataques: [],
    perguntasEm: [], pendente: null, respostas: [], licoes: [],
    fim: false, laudo: [], encerrado: false,
  };
  return inc;
}

export const no = (inc: Incidente, id: string | null | undefined): NoInc | undefined => (id ? inc.nos.find((n) => n.id === id) : undefined);
export const tem = (n: NoInc | null | undefined, tag: string): boolean => !!n?.tags.includes(tag);
export function marcar(n: NoInc, tag: string, sim = true): void {
  const i = n.tags.indexOf(tag);
  if (sim && i < 0) n.tags.push(tag);
  if (!sim && i >= 0) n.tags.splice(i, 1);
}

export function registrar(inc: Incidente, txt: string, tipo: TipoEntrada = 'info', noId?: string): void {
  inc.log.push({ id: ++inc.seq, h: inc.hora, txt, tipo, ...(noId ? { no: noId } : {}) });
  if (inc.log.length > 120) inc.log.splice(0, inc.log.length - 120);
}

export function licao(inc: Incidente, ok: boolean, titulo: string, porque: string, item?: string): void {
  if (inc.licoes.some((l) => l.titulo === titulo)) return;
  inc.licoes.push({ ok, titulo, porque, ...(item ? { item } : {}) });
}

/** Vizinhos alcançáveis por cabo a partir de um nó, atravessando equipamentos de rede ligados. */
export function alcancaveis(inc: Incidente, origem: string, passa: (n: NoInc) => boolean = () => true): string[] {
  const vistos = new Set<string>([origem]);
  const fila = [origem];
  const ativo = (n: NoInc | undefined) => !!n && !tem(n, 'isolado') && !tem(n, 'desligado');
  if (!ativo(no(inc, origem))) return [];
  while (fila.length) {
    const atual = fila.shift() as string;
    for (const l of inc.links) {
      const outro = l.a === atual ? l.b : l.b === atual ? l.a : null;
      if (!outro || vistos.has(outro)) continue;
      const n = no(inc, outro);
      if (!ativo(n)) continue;
      vistos.add(outro);
      if (n && EQUIP.has(n.tipo) && passa(n)) fila.push(outro);
    }
  }
  vistos.delete(origem);
  return [...vistos];
}
export const EQUIP = new Set<TipoNo>(['hub', 'switch', 'roteador', 'repetidor', 'bridge', 'modem']);

export function ligados(inc: Incidente, a: string, b: string): boolean {
  return alcancaveis(inc, a).includes(b);
}

export function horaTxt(inc: Incidente, h = inc.hora): string {
  const t = 8 + h;
  const hh = Math.floor(t) % 24;
  const mm = Math.floor((t % 1) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ---------------- ciclo ----------------

export function acaoDef(r: Regras, id: string): AcaoDef | undefined {
  return r.acoes.find((a) => a.id === id);
}

export function podeAgir(inc: Incidente, r: Regras, a: AcaoDef, n: NoInc | null, temNo: (id: string) => boolean): true | string {
  if (inc.fim) return 'A visita acabou.';
  if (a.requer && !temNo(a.requer)) return 'Bloqueado na árvore de Tecnologia.';
  if (a.alvo && (!n || !a.alvo.includes(n.tipo))) return 'Não se aplica a este equipamento.';
  if (!a.alvo && n && r.acoes.some((x) => x.alvo && x.id === a.id)) return 'Escolha um alvo.';
  return r.disponivel ? r.disponivel(inc, a, n) : true;
}

export function iniciar(inc: Incidente, r: Regras, acaoId: string, noId: string | null, mult: number, temNo: (id: string) => boolean, rng: Rng, fx: Fx): boolean {
  const a = acaoDef(r, acaoId);
  if (!a || inc.acao || inc.pendente) return false;
  const n = no(inc, noId) ?? null;
  if (podeAgir(inc, r, a, n, temNo) !== true) return false;
  if (a.horas <= 0) {
    concluirAcao(inc, r, a, n, rng, fx);
    return true;
  }
  inc.acao = { id: a.id, no: n?.id ?? null, ini: inc.hora, fim: inc.hora + a.horas * mult };
  return true;
}

export function cancelar(inc: Incidente): void {
  inc.acao = null;
}

function concluirAcao(inc: Incidente, r: Regras, a: AcaoDef, n: NoInc | null, rng: Rng, fx: Fx): void {
  inc.feitas.push(`${a.id}@${n?.id ?? '*'}`);
  if (a.custo) inc.custos += a.custo;
  r.executar(inc, a, n, rng, fx);
  r.objetivos(inc);
}

/** Avança o incidente dh horas de jogo. */
export function passo(inc: Incidente, r: Regras, dh: number, rng: Rng, fx: Fx): void {
  if (inc.fim || inc.pendente) return;
  // passos pequenos para a ameaça não pular etapas em velocidade alta
  let resto = dh;
  while (resto > 0 && !inc.fim && !inc.pendente) {
    const d = Math.min(resto, 0.05);
    resto -= d;
    inc.hora += d;
    r.tick(inc, d, rng, fx);
    if (inc.hora > inc.limite) inc.paciencia = clamp(inc.paciencia - 10 * d, 0, 100);
    if (inc.acao && inc.hora >= inc.acao.fim) {
      const a = acaoDef(r, inc.acao.id);
      const n = no(inc, inc.acao.no) ?? null;
      inc.acao = null;
      if (a) concluirAcao(inc, r, a, n, rng, fx);
    }
    const prox = inc.perguntasEm[0];
    if (prox !== undefined && inc.hora >= prox && !inc.acao) {
      inc.perguntasEm.shift();
      inc.pendente = '?';
    }
    if (inc.paciencia <= 0) {
      registrar(inc, `${inc.contato} perdeu a paciência e pediu para você ir embora.`, 'alerta');
      encerrar(inc, r, rng, 'paciencia');
    }
  }
  r.objetivos(inc);
}

export function responderPergunta(inc: Incidente, item: string, ok: boolean): void {
  inc.respostas.push({ item, ok });
  inc.paciencia = clamp(inc.paciencia + (ok ? 6 : -8), 0, 100);
  registrar(inc, ok ? `${inc.contato} ficou impressionado com a explicação.` : `${inc.contato} desconfiou da resposta.`, ok ? 'ok' : 'erro');
  inc.pendente = null;
}

export function encerrar(inc: Incidente, r: Regras, rng: Rng, motivo = 'entregue'): void {
  if (inc.fim) return;
  inc.fim = true;
  inc.acao = null;
  inc.motivoFim = motivo;
  r.objetivos(inc);
  for (const l of r.balanco?.(inc) ?? []) licao(inc, l.ok, l.titulo, l.porque, l.item);
  inc.laudo = r.laudo(inc, rng);
}

export interface Resultado {
  resolucao: number;
  danos: number;
  laudo: number;
  tempo: number;
  nota: number;
  estrelas: number;
  retorno: boolean;
}

export function resultado(inc: Incidente, r: Regras): Resultado {
  const resolucao = clamp(r.resolucao(inc), 0, 1);
  const danos = clamp(1 - inc.prejuizo / 100, 0, 1);
  const lt = inc.laudo.length;
  const laudo = lt ? inc.laudo.filter((l) => l.escolha === l.correta).length / lt : 1;
  const extra = Math.max(0, inc.hora - inc.limite);
  const tempo = clamp(1 - extra / (inc.limite * 0.6), 0, 1) * (0.7 + 0.3 * (inc.paciencia / 100));
  const nota = clamp(0.42 * resolucao + 0.23 * danos + 0.2 * laudo + 0.15 * tempo, 0, 1);
  const estrelas = Math.max(1, Math.round(nota * 10) / 2);
  return { resolucao, danos, laudo, tempo, nota, estrelas, retorno: resolucao < 0.75 };
}
