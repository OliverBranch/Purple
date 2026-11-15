// Peças comuns aos geradores de incidente: planta do escritório, nomes, sorteios.
import { LinkInc, NoInc, TipoNo } from '../../core/incidente';
import { Rng, embaralhar } from '../../core/rng';

export interface Ctx {
  rng: Rng;
  ano: number;
  dif: 1 | 2 | 3;
  cliente: { nome: string; setor: string; contato: string };
}

export const FUNCIONARIOS = ['Dona Neide', 'Juca', 'Carla', 'Beto', 'Rosana', 'Tião', 'Marli', 'Seu Zé', 'Paulinha', 'Wanderley', 'Cris', 'Dalva', 'Rogerinho', 'Lurdes'];

export function nN(id: string, tipo: TipoNo, nome: string, x: number, y: number, extra: Partial<NoInc> = {}): NoInc {
  return { id, tipo, nome, x, y, infec: 0, visto: false, tags: [], ...extra };
}

/** Posições das mesas: duas fileiras no chão do escritório. */
export function mesas(n: number): { x: number; y: number }[] {
  const fileiras = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const out: { x: number; y: number }[] = [];
  fileiras.forEach((qtd, f) => {
    const y = f === 0 ? (fileiras.length === 1 ? 190 : 160) : 228;
    const larg = 380;
    for (let i = 0; i < qtd; i++) out.push({ x: Math.round(50 + (larg / qtd) * (i + 0.5)), y });
  });
  return out;
}

export interface Planta {
  nos: NoInc[];
  links: LinkInc[];
  pcs: NoInc[];
}

/** Escritório típico de cliente pequeno nos anos 90: micros num hub, modem, às vezes servidor e fita. */
export function escritorio(c: Ctx, nPcs: number, op: { servidor?: boolean; fita?: boolean; impressora?: boolean; central?: TipoNo } = {}): Planta {
  const nomes = embaralhar(c.rng, FUNCIONARIOS.filter((x) => x !== c.cliente.contato));
  const nos: NoInc[] = [];
  const links: LinkInc[] = [];
  const centralId = 'hub';
  nos.push(nN('internet', 'internet', 'Internet', 34, 30));
  nos.push(nN('modem', 'modem', 'Modem 28.8k', 92, 84));
  nos.push(nN(centralId, op.central ?? 'hub', op.central === 'switch' ? 'Switch' : 'Hub de 8 portas', 240, 92));
  links.push({ a: 'internet', b: 'modem', tipo: 'discada' }, { a: 'modem', b: centralId, tipo: 'cabo' });
  if (op.servidor) {
    nos.push(nN('srv', 'servidor', 'Servidor de arquivos', 352, 84, { tags: ['compart'] }));
    links.push({ a: 'srv', b: centralId, tipo: 'cabo' });
  }
  if (op.fita) nos.push(nN('fita', 'fita', 'Fitas de backup', 410, 88));
  if (op.impressora) {
    nos.push(nN('imp', 'impressora', 'Impressora matricial', 160, 86));
    links.push({ a: 'imp', b: centralId, tipo: 'cabo' });
  }
  const pcs: NoInc[] = [];
  mesas(nPcs).forEach((p, i) => {
    const dono = i === 0 ? c.cliente.contato : (nomes[i] as string);
    const pc = nN(`pc${i + 1}`, 'pc', `Micro ${i === 0 ? 'do dono' : 'd' + (/^(Dona|Seu)/.test(dono) ? 'e ' : 'e ') + dono}`, p.x, p.y, { dono, arte: Math.floor(c.rng() * 1000) });
    pc.nome = `Micro de ${dono}`;
    pcs.push(pc);
    nos.push(pc);
    links.push({ a: pc.id, b: centralId, tipo: 'cabo' });
  });
  return { nos, links, pcs };
}

export function sortear<T>(rng: Rng, xs: readonly T[], n: number): T[] {
  return embaralhar(rng, [...xs]).slice(0, n);
}

/** Embaralha as opções e devolve a posição da correta. */
export function opcoes(rng: Rng, certa: string, erradas: string[], n = 5): { opcoes: string[]; correta: number } {
  const op = embaralhar(rng, [certa, ...sortear(rng, erradas.filter((e) => e !== certa), n - 1)]);
  return { opcoes: op, correta: op.indexOf(certa) };
}
