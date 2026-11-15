// Gatos 32x32: andando (de lado), sentado (de frente) e dormindo (enrolado).
import { GatoDef } from '../core/tipos';
import { Ctx, contornar, ctx2d, novaTela, ret } from './pixel';

export type PoseGato = 'andar' | 'sentar' | 'dormir';

export const PELAGENS = [
  { nome: 'Laranja', base: '#e08a3c', esc: '#b5601c', luz: '#f7cf9a', padrao: 'tigrado' },
  { nome: 'Preto', base: '#2e2936', esc: '#17141c', luz: '#463f52', padrao: 'liso' },
  { nome: 'Branco', base: '#f2eee6', esc: '#cfc8bc', luz: '#ffffff', padrao: 'liso' },
  { nome: 'Cinza', base: '#8e929c', esc: '#696d78', luz: '#b6bac4', padrao: 'liso' },
  { nome: 'Frajola', base: '#2e2936', esc: '#17141c', luz: '#f2eee6', padrao: 'frajola' },
  { nome: 'Tigrado', base: '#a08a6c', esc: '#5e4c38', luz: '#cdbb9c', padrao: 'tigrado' },
  { nome: 'Tricolor', base: '#f2eee6', esc: '#2e2936', luz: '#e08a3c', padrao: 'tricolor' },
  { nome: 'Siamês', base: '#eadcc4', esc: '#5a4334', luz: '#f8f0de', padrao: 'siames' },
];
export const OLHOS_GATO = ['#f2c94c', '#7bd66f', '#62b0f0', '#f08a3a'];
export const NOMES_OLHOS_GATO = ['Amarelos', 'Verdes', 'Azuis', 'Âmbar'];
export const ACESSORIOS_GATO = ['Nenhum', 'Coleira', 'Gravata-borboleta', 'Lenço', 'Sininho'];
export const CORES_ACESSORIO_GATO = ['#c9442f', '#7446c4', '#2f6fb0', '#2f9c6a', '#e0a526', '#d9609a'];

const cache = new Map<string, HTMLCanvasElement>();

export function spriteGato(g: GatoDef, pose: PoseGato, frame: number, piscar = false): HTMLCanvasElement {
  const chave = `${g.pelagem}.${g.olhos}.${g.acessorio}.${g.corAcessorio}.${pose}.${frame}.${piscar ? 1 : 0}`;
  let cv = cache.get(chave);
  if (!cv) {
    cv = novaTela(32, 32);
    const c = ctx2d(cv);
    if (pose === 'andar') lado(c, g, frame);
    else if (pose === 'sentar') frente(c, g, piscar, frame);
    else dormindo(c, g, frame);
    contornar(cv);
    cache.set(chave, cv);
  }
  return cv;
}

const ROSA = '#f29aa8';
const PUPILA = '#1c1420';

function lado(c: Ctx, g: GatoDef, frame: number): void {
  const pl = PELAGENS[g.pelagem] ?? PELAGENS[0]!;
  const olho = OLHOS_GATO[g.olhos] ?? '#f2c94c';
  const ac = CORES_ACESSORIO_GATO[g.corAcessorio] ?? '#c9442f';
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const { base, esc, luz, padrao } = pl;
  const pata = padrao === 'frajola' ? luz : padrao === 'siames' ? esc : base;
  const rabo = padrao === 'siames' ? esc : base;
  // rabo
  const tx = frame % 2 === 1 ? 1 : 0;
  p(5, 17, 2, 5, rabo); p(4 - tx, 13, 2, 5, rabo); p(5 - tx, 12, 2, 1, padrao === 'frajola' ? luz : rabo);
  if (padrao === 'tigrado') { p(4 - tx, 15, 2, 1, esc); p(5, 19, 2, 1, esc); }
  // pernas
  const xs = frame === 1 ? [9, 11, 18, 19] : frame === 3 ? [7, 13, 16, 21] : [8, 12, 17, 20];
  xs.forEach((x, i) => {
    const cor = i % 2 === 0 ? base : pl.padrao === 'liso' || padrao === 'tigrado' ? pl.esc : base;
    p(x, 27, 2, 2, padrao === 'tricolor' ? base : cor);
    p(x, 29, 2, 2, pata);
  });
  // corpo
  p(8, 20, 13, 1, base); p(7, 21, 15, 6, base); p(8, 27, 13, 1, padrao === 'frajola' ? luz : base);
  p(7, 26, 15, 1, padrao === 'liso' || padrao === 'tigrado' ? esc : base);
  if (padrao === 'tigrado') { p(10, 20, 1, 4, esc); p(13, 20, 1, 4, esc); p(16, 20, 1, 3, esc); }
  if (padrao === 'frajola') { p(17, 23, 5, 4, luz); p(9, 26, 9, 1, luz); }
  if (padrao === 'tricolor') { p(8, 20, 5, 4, luz); p(14, 21, 4, 3, esc); p(7, 26, 15, 1, base); }
  // cabeça
  p(18, 13, 8, 1, base); p(17, 14, 10, 7, base); p(18, 21, 8, 1, base);
  p(19, 10, 1, 1, base); p(18, 11, 3, 2, base); p(24, 10, 1, 1, base); p(23, 11, 3, 2, base);
  p(19, 12, 1, 1, ROSA); p(24, 12, 1, 1, ROSA);
  if (padrao === 'tigrado') { p(20, 13, 1, 2, esc); p(22, 13, 1, 2, esc); p(18, 16, 2, 1, esc); }
  if (padrao === 'frajola') { p(23, 17, 4, 4, luz); p(22, 19, 4, 3, luz); }
  if (padrao === 'tricolor') { p(18, 13, 4, 3, luz); p(18, 11, 3, 2, luz); p(23, 11, 3, 2, esc); p(24, 13, 2, 2, esc); }
  if (padrao === 'siames') { p(22, 15, 5, 5, esc); p(18, 10, 3, 3, esc); p(23, 10, 3, 3, esc); }
  p(23, 16, 2, 2, olho); p(24, 16, 1, 2, PUPILA);
  p(26, 18, 1, 1, ROSA); p(25, 19, 1, 1, PUPILA);
  // acessório
  if (g.acessorio === 1 || g.acessorio === 4) { p(17, 19, 1, 2, ac); p(18, 21, 2, 1, ac); if (g.acessorio === 4) p(19, 22, 1, 1, '#f2c94c'); }
  if (g.acessorio === 2) { p(18, 21, 4, 2, ac); p(20, 21, 1, 2, '#ffffff'); }
  if (g.acessorio === 3) { p(17, 20, 4, 1, ac); p(18, 21, 3, 1, ac); p(19, 22, 1, 1, ac); }
}

function frente(c: Ctx, g: GatoDef, piscar: boolean, frame: number): void {
  const pl = PELAGENS[g.pelagem] ?? PELAGENS[0]!;
  const olho = OLHOS_GATO[g.olhos] ?? '#f2c94c';
  const ac = CORES_ACESSORIO_GATO[g.corAcessorio] ?? '#c9442f';
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const { base, esc, luz, padrao } = pl;
  const rabo = padrao === 'siames' ? esc : base;
  // rabo
  const ty = frame % 2 === 1 ? -1 : 0;
  p(21, 27, 5, 2, rabo); p(25, 23 + ty, 2, 4, rabo); p(25, 22 + ty, 2, 1, padrao === 'frajola' ? luz : rabo);
  // corpo
  p(12, 19, 9, 4, base); p(11, 23, 11, 8, base);
  p(11, 30, 11, 1, padrao === 'liso' || padrao === 'tigrado' ? esc : base);
  if (padrao === 'tigrado') { p(11, 24, 2, 1, esc); p(20, 24, 2, 1, esc); p(11, 26, 2, 1, esc); p(20, 26, 2, 1, esc); }
  if (padrao === 'frajola') p(13, 20, 7, 8, luz);
  if (padrao === 'tricolor') { p(17, 22, 5, 4, luz); p(11, 25, 4, 3, esc); }
  const pata = padrao === 'frajola' ? luz : padrao === 'siames' ? esc : base;
  p(13, 28, 2, 3, pata); p(18, 28, 2, 3, pata); p(15, 28, 1, 3, padrao === 'frajola' ? '#cfc8bc' : esc); p(17, 28, 1, 3, padrao === 'frajola' ? '#cfc8bc' : esc);
  // cabeça
  p(11, 8, 11, 1, base); p(10, 9, 13, 1, base); p(9, 10, 15, 8, base); p(10, 18, 13, 1, base); p(11, 19, 11, 1, base);
  // orelhas
  p(10, 5, 1, 1, base); p(10, 6, 2, 1, base); p(10, 7, 3, 1, base); p(22, 5, 1, 1, base); p(21, 6, 2, 1, base); p(20, 7, 3, 1, base);
  p(11, 7, 1, 1, ROSA); p(21, 7, 1, 1, ROSA);
  if (padrao === 'tigrado') { p(14, 8, 1, 2, esc); p(16, 8, 1, 3, esc); p(18, 8, 1, 2, esc); p(9, 13, 2, 1, esc); p(22, 13, 2, 1, esc); p(9, 15, 2, 1, esc); p(22, 15, 2, 1, esc); }
  if (padrao === 'frajola') { p(15, 10, 3, 4, luz); p(13, 14, 7, 5, luz); p(12, 16, 9, 3, luz); }
  if (padrao === 'tricolor') { p(9, 10, 6, 4, luz); p(11, 8, 4, 2, luz); p(10, 5, 3, 3, luz); p(18, 8, 4, 2, esc); p(18, 10, 6, 3, esc); p(20, 5, 3, 3, esc); p(11, 7, 1, 1, ROSA); p(21, 7, 1, 1, ROSA); }
  if (padrao === 'siames') { p(12, 11, 9, 7, esc); p(10, 5, 3, 3, esc); p(20, 5, 3, 3, esc); p(11, 7, 1, 1, ROSA); p(21, 7, 1, 1, ROSA); }
  // rosto
  if (piscar) { p(12, 13, 2, 1, PUPILA); p(19, 13, 2, 1, PUPILA); }
  else { p(12, 12, 2, 3, olho); p(19, 12, 2, 3, olho); p(13, 12, 1, 3, PUPILA); p(19, 12, 1, 3, PUPILA); p(12, 12, 1, 1, '#ffffff'); p(20, 12, 1, 1, '#ffffff'); }
  p(16, 15, 1, 1, ROSA); p(15, 16, 1, 1, PUPILA); p(17, 16, 1, 1, PUPILA);
  // acessório
  if (g.acessorio === 1 || g.acessorio === 4) { p(12, 19, 9, 1, ac); if (g.acessorio === 4) { p(16, 20, 1, 2, '#f2c94c'); } }
  if (g.acessorio === 2) { p(13, 19, 3, 3, ac); p(17, 19, 3, 3, ac); p(16, 20, 1, 1, '#ffffff'); }
  if (g.acessorio === 3) { p(12, 19, 9, 1, ac); p(13, 20, 7, 1, ac); p(14, 21, 5, 1, ac); p(15, 22, 3, 1, ac); p(16, 23, 1, 1, ac); }
}

function dormindo(c: Ctx, g: GatoDef, frame: number): void {
  const pl = PELAGENS[g.pelagem] ?? PELAGENS[0]!;
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const { base, esc, luz, padrao } = pl;
  const resp = frame % 2 === 1;
  // corpo enrolado
  if (resp) p(12, 20, 9, 1, base);
  p(11, 21, 11, 1, base); p(9, 22, 15, 1, base); p(8, 23, 17, 6, base); p(9, 29, 15, 1, base); p(11, 30, 11, 1, padrao === 'liso' || padrao === 'tigrado' ? esc : base);
  if (padrao === 'tigrado') { p(11, 22, 1, 3, esc); p(14, 21, 1, 3, esc); p(17, 21, 1, 3, esc); }
  if (padrao === 'tricolor') { p(9, 23, 5, 3, luz); p(15, 22, 4, 2, esc); }
  // cabeça apoiada
  p(18, 23, 7, 6, base);
  p(18, 21, 1, 1, base); p(17, 22, 3, 1, base); p(24, 22, 1, 1, base); p(23, 23, 3, 1, base);
  if (padrao === 'siames') { p(19, 24, 6, 5, esc); p(17, 21, 3, 2, esc); p(23, 22, 3, 2, esc); }
  if (padrao === 'frajola') { p(20, 26, 4, 3, luz); }
  if (padrao === 'tricolor') { p(18, 23, 3, 3, luz); p(23, 22, 3, 2, esc); }
  const linha = padrao === 'siames' || base === '#2e2936' ? '#8a8496' : PUPILA;
  p(19, 25, 2, 1, linha); p(22, 25, 2, 1, linha); p(21, 27, 1, 1, ROSA);
  // rabo em volta
  const rabo = padrao === 'siames' ? esc : padrao === 'liso' || padrao === 'tigrado' ? esc : base;
  p(9, 28, 9, 2, rabo); p(8, 26, 2, 3, rabo); p(17, 29, 2, 1, padrao === 'frajola' ? luz : rabo);
  if (g.acessorio > 0) p(17, 28, 1, 1, CORES_ACESSORIO_GATO[g.corAcessorio] ?? '#c9442f');
}
