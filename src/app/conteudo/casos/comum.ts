import { CasoPratico, Etapa, EtapaEscolha, Ferramenta, Linha } from '../../core/caso';
import { Rng, embaralhar, escolher } from '../../core/rng';

export interface Ctx {
  rng: Rng;
  ano: number;
  dif: 1 | 2 | 3;
  cliente: { nome: string; setor: string; contato: string };
}

export type Gerador = (ctx: Ctx) => CasoPratico;

export const sub = (s: string, ctx: Ctx): string => s.replaceAll('{p}', ctx.cliente.contato).replaceAll('{c}', ctx.cliente.nome);

/** Mistura linhas suspeitas no meio das linhas normais, sem mudar a ordem relativa de cada grupo. */
export function misturar(rng: Rng, normais: string[], suspeitas: Linha[]): Linha[] {
  const out: Linha[] = normais.map((t) => ({ t }));
  for (const s of suspeitas) out.splice(1 + Math.floor(rng() * out.length), 0, s);
  return out;
}

export function ferramenta(id: string, nome: string, desc: string, horas: number, linhas: Linha[], requer?: string): Ferramenta {
  return { id, nome, desc, horas, linhas, ...(requer ? { requer } : {}) };
}

/** Escolha com as alternativas embaralhadas; `certa` é o texto correto. */
export function escolha(rng: Rng, titulo: string, pergunta: string, certa: string, erradas: string[], explicacao: string, item?: string, extra: Partial<EtapaEscolha> = {}): EtapaEscolha {
  const opcoes = embaralhar(rng, [certa, ...erradas.filter((e) => e !== certa)].slice(0, 5));
  return { tipo: 'escolha', titulo, pergunta, opcoes, correta: opcoes.indexOf(certa), explicacao, ...(item ? { item } : {}), horasErro: 1, ...extra };
}

/** Etapa de ordenação: `certos` na ordem correta, `distratores` não deveriam ser escolhidos. */
export function ordem(rng: Rng, titulo: string, pergunta: string, certos: string[], distratores: string[], explicacao: string, item?: string): Etapa {
  const opcoes = embaralhar(rng, [...certos, ...distratores]);
  return { tipo: 'ordem', titulo, pergunta, opcoes, certa: certos.map((c) => opcoes.indexOf(c)), explicacao, ...(item ? { item } : {}), horasErro: 1.5 };
}

export function novoCaso(base: Omit<CasoPratico, 'horas' | 'achadas' | 'marcadas' | 'falsas' | 'fase' | 'etapa'>): CasoPratico {
  return { ...base, horas: 0, achadas: [], marcadas: [], falsas: 0, fase: 'investigar', etapa: 0 };
}

export { escolher, embaralhar };

// ---------- IPv4 ----------
export const ipNum = (s: string): number => s.split('.').reduce((a, o) => a * 256 + Number(o), 0);
export const ipStr = (n: number): string => [24, 16, 8, 0].map((k) => Math.floor(n / 2 ** k) % 256).join('.');
export const mascara = (p: number): string => ipStr(p === 0 ? 0 : (0xffffffff - (2 ** (32 - p) - 1)) >>> 0);
export const prefixoPara = (hosts: number): number => {
  for (let p = 30; p >= 8; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
  return 8;
};
export const hora = (rng: Rng): string => `${String(8 + Math.floor(rng() * 10)).padStart(2, '0')}:${String(Math.floor(rng() * 60)).padStart(2, '0')}`;
