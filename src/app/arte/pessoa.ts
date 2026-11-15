// Personagens 32x32 em camadas: corpo, roupa, cabeça, cabelo, barba e acessório.
import { Aparencia } from '../core/tipos';
import { CORES_CABELO, CORES_CALCA, CORES_ROUPA, Ctx, PELES, claro, contornar, ctx2d, escuro, mix, novaTela, ret } from './pixel';

export type Dir = 'baixo' | 'cima' | 'lado';
type R4 = [number, number, number, number];

const cache = new Map<string, HTMLCanvasElement>();

/** Sprite pronto (com contorno) e guardado em cache. frame 0..3; 1 e 3 são passos. */
export function spritePessoa(ap: Aparencia, dir: Dir, frame: number, piscar: boolean, marca: string): HTMLCanvasElement {
  const chave = `${ap.pele}.${ap.cabelo}.${ap.corCabelo}.${ap.barba}.${ap.roupa}.${ap.corRoupa}.${ap.corCalca}.${ap.acessorio}.${dir}.${frame}.${piscar ? 1 : 0}.${marca}`;
  let cv = cache.get(chave);
  if (!cv) {
    cv = novaTela(32, 32);
    desenhar(ctx2d(cv), ap, dir, frame, piscar, marca);
    contornar(cv);
    cache.set(chave, cv);
  }
  return cv;
}

const BASE_FRENTE: R4[] = [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 3], [8, 7, 2, 2], [22, 7, 2, 2], [10, 7, 4, 1]];
const BASE_COSTAS: R4[] = [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 9], [9, 13, 14, 1]];
const BASE_LADO: R4[] = [[11, 2, 10, 1], [10, 3, 12, 1], [9, 4, 14, 3], [9, 7, 5, 6], [19, 7, 3, 1]];

function cabeloRets(estilo: number, dir: Dir): { cab: R4[]; sombra: R4[]; luz: R4[]; raspado: R4[] } {
  const o = { cab: [] as R4[], sombra: [] as R4[], luz: [] as R4[], raspado: [] as R4[] };
  const f = dir === 'baixo';
  const c = dir === 'cima';
  const base = f ? BASE_FRENTE : c ? BASE_COSTAS : BASE_LADO;
  const luzBase: R4 = f ? [12, 3, 5, 1] : c ? [11, 4, 6, 1] : [13, 3, 5, 1];
  switch (estilo) {
    case 0: // curto
      o.cab = [...base]; o.luz = [luzBase]; break;
    case 1: // topete
      o.cab = [...base, ...(f ? [[11, 0, 9, 1], [10, 1, 11, 1], [15, 7, 6, 1]] : c ? [[11, 0, 9, 1], [10, 1, 11, 1]] : [[15, 0, 8, 1], [14, 1, 10, 1], [20, 7, 3, 1]]) as R4[]];
      o.luz = [f ? [12, 1, 5, 1] : c ? [12, 1, 5, 1] : [16, 1, 5, 1]]; break;
    case 2: // comprido
      o.cab = f ? [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 3], [7, 5, 2, 15], [23, 5, 2, 15], [9, 7, 1, 3], [22, 7, 1, 3], [10, 7, 3, 1], [19, 7, 3, 1]]
        : c ? [...base, [7, 5, 18, 15]] : [[11, 2, 10, 1], [10, 3, 12, 1], [9, 4, 14, 3], [8, 6, 6, 14], [19, 7, 3, 1]];
      o.sombra = c ? [[7, 19, 18, 1], [12, 8, 1, 10], [19, 8, 1, 10]] : f ? [[7, 19, 2, 1], [23, 19, 2, 1]] : [[8, 19, 6, 1]];
      o.luz = [luzBase]; break;
    case 3: // cacheado
      o.cab = f ? [[10, 0, 12, 1], [8, 1, 16, 1], [7, 2, 18, 2], [6, 4, 20, 3], [6, 7, 3, 3], [23, 7, 3, 3], [9, 7, 3, 1], [20, 7, 3, 1]]
        : c ? [[10, 0, 12, 1], [8, 1, 16, 1], [7, 2, 18, 2], [6, 4, 20, 9], [7, 13, 18, 2]] : [[11, 0, 10, 1], [9, 1, 14, 1], [8, 2, 16, 2], [7, 4, 17, 3], [7, 7, 7, 7], [20, 7, 3, 1]];
      o.sombra = [[9, 2, 1, 1], [13, 1, 1, 1], [17, 2, 1, 1], [21, 3, 1, 1], [7, 5, 1, 1], [11, 5, 1, 1], [15, 5, 1, 1], [19, 4, 1, 1], ...(c ? [[9, 8, 1, 1], [13, 9, 1, 1], [17, 8, 1, 1], [21, 10, 1, 1], [11, 12, 1, 1], [19, 12, 1, 1]] as R4[] : [])];
      o.luz = [[12, 3, 1, 1], [16, 3, 1, 1], [20, 5, 1, 1], [9, 4, 1, 1]]; break;
    case 4: // rabo de cavalo
      o.cab = [...base, ...(f ? [[24, 6, 2, 2], [25, 8, 2, 5]] : c ? [[14, 12, 4, 8], [15, 20, 2, 2]] : [[5, 7, 4, 2], [4, 9, 3, 6], [5, 15, 2, 2]]) as R4[]];
      o.sombra = c ? [[15, 11, 2, 1]] : f ? [] : [[8, 8, 1, 2]];
      o.luz = [luzBase]; break;
    case 5: // careca
      break;
    case 6: // moicano
      o.cab = f ? [[14, 0, 4, 2], [13, 2, 6, 3], [14, 5, 4, 2]] : c ? [[14, 0, 4, 2], [13, 2, 6, 12]] : [[10, 0, 12, 2], [11, 2, 10, 3]];
      o.raspado = f ? [[8, 4, 5, 2], [19, 4, 5, 2], [9, 3, 4, 1], [19, 3, 4, 1]] : c ? [[8, 4, 5, 9], [19, 4, 5, 9]] : [[9, 5, 5, 8]];
      break;
    case 7: // chanel
      o.cab = f ? [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 3], [7, 5, 2, 10], [23, 5, 2, 10], [9, 7, 14, 1], [9, 8, 1, 6], [22, 8, 1, 6]]
        : c ? [[10, 2, 12, 1], [9, 3, 14, 1], [7, 4, 18, 12]] : [[11, 2, 10, 1], [10, 3, 12, 1], [9, 4, 14, 3], [8, 6, 9, 9], [18, 7, 4, 1]];
      o.sombra = c ? [[7, 15, 18, 1]] : f ? [[7, 14, 2, 1], [23, 14, 2, 1]] : [[8, 14, 9, 1]];
      o.luz = [luzBase]; break;
    case 8: // tigela
      o.cab = f ? [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 5]] : c ? [[10, 2, 12, 1], [9, 3, 14, 1], [8, 4, 16, 6]] : [[11, 2, 10, 1], [10, 3, 12, 1], [9, 4, 14, 5]];
      o.sombra = f ? [[8, 8, 16, 1]] : c ? [[8, 9, 16, 1]] : [[9, 8, 14, 1]];
      o.luz = [luzBase]; break;
    default: // mullet
      o.cab = [...base, ...(f ? [[7, 11, 2, 8], [23, 11, 2, 8]] : c ? [[9, 14, 14, 6]] : [[8, 12, 5, 8]]) as R4[]];
      o.sombra = c ? [[9, 19, 14, 1]] : [];
      o.luz = [luzBase]; break;
  }
  return o;
}

function desenhar(c: Ctx, ap: Aparencia, dir: Dir, frame: number, piscar: boolean, marca: string): void {
  const pele = PELES[ap.pele] ?? '#e9b98e';
  const peleS = escuro(pele, 0.2);
  const cab = CORES_CABELO[ap.corCabelo] ?? '#2b1d16';
  const rou = CORES_ROUPA[ap.corRoupa] ?? '#7446c4';
  const rouS = escuro(rou, 0.28);
  const cal = CORES_CALCA[ap.corCalca] ?? '#34406b';
  const calS = escuro(cal, 0.3);
  const sap = '#2a2233';
  const olho = '#241a2e';
  const b = frame % 2 === 1 ? -1 : 0;
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const longa = ap.roupa === 1 || ap.roupa === 2 || ap.roupa === 3;
  const regata = ap.roupa === 4;
  const hy = 3 + b;

  const braco = (x: number, y: number, w: number) => {
    if (regata) { p(x, y, w, 7, pele); return; }
    if (longa) { p(x, y, w, 6, rouS); p(x, y + 6, w, 1, pele); return; }
    p(x, y, w, 3, rouS); p(x, y + 3, w, 4, pele);
  };

  if (dir === 'lado') {
    // pernas
    p(12, 25, 8, 1, cal);
    if (frame === 1) { p(11, 26, 3, 2, calS); p(10, 28, 4, 2, sap); p(17, 26, 3, 3, cal); p(17, 29, 5, 2, sap); }
    else if (frame === 3) { p(17, 26, 3, 2, calS); p(17, 28, 5, 2, sap); p(12, 26, 3, 3, cal); p(11, 29, 5, 2, sap); }
    else { p(13, 26, 3, 3, calS); p(16, 26, 3, 3, cal); p(13, 29, 4, 2, sap); p(16, 29, 4, 2, sap); }
    // tronco e braço
    p(12, 17 + b, 8, 8, rou); p(12, 24 + b, 8, 1, rouS);
    if (ap.roupa === 1) p(10, 15 + b, 3, 4, rouS);
    if (ap.roupa === 2) { p(12, 20 + b, 8, 1, rouS); p(15, 17 + b, 1, 8, rouS); }
    const bx = frame === 1 ? 16 : frame === 3 ? 12 : 14;
    braco(bx, 17 + b, 3);
    // cabeça
    p(11, hy, 10, 1, pele); p(10, hy + 1, 12, 1, pele); p(9, hy + 2, 14, 10, pele); p(10, hy + 12, 12, 1, pele); p(11, hy + 13, 10, 1, peleS);
    p(23, hy + 8, 1, 1, pele);
    p(14, hy + 6, 2, 3, peleS);
    if (piscar) p(19, hy + 7, 2, 1, olho); else { p(19, hy + 6, 2, 3, olho); p(19, hy + 6, 1, 1, '#ffffff'); }
    p(18, hy + 9, 1, 1, mix(pele, '#e86a6a', 0.4));
    p(20, hy + 11, 2, 1, mix(pele, '#7a2f3a', 0.55));
  } else {
    const frente = dir === 'baixo';
    // pernas
    const le = frame === 1 ? -1 : 0;
    const ld = frame === 3 ? -1 : 0;
    p(12, 25, 8, 1, cal);
    p(12, 26, 3, 3 + le, cal); p(17, 26, 3, 3 + ld, cal);
    p(14, 26, 1, 3 + le, calS); p(19, 26, 1, 3 + ld, calS);
    p(11, 29 + le, 4, 2, sap); p(17, 29 + ld, 4, 2, sap);
    // tronco
    p(10, 17 + b, 12, 8, rou); p(20, 17 + b, 2, 8, rouS); p(10, 24 + b, 12, 1, rouS);
    const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    braco(8, 17 + b + sw, 2);
    braco(22, 17 + b - sw, 2);
    if (frente) {
      if (ap.roupa === 0) p(14, 20 + b, 4, 3, marca);
      if (ap.roupa === 1) { p(12, 17 + b, 8, 1, rouS); p(14, 18 + b, 1, 2, '#f1ece0'); p(17, 18 + b, 1, 2, '#f1ece0'); p(12, 22 + b, 8, 2, rouS); }
      if (ap.roupa === 2) { p(14, 17 + b, 4, 2, '#f1ece0'); p(12, 17 + b, 1, 8, rouS); p(18, 17 + b, 1, 8, rouS); p(10, 20 + b, 12, 1, rouS); p(10, 23 + b, 12, 1, rouS); }
      if (ap.roupa === 3) { p(13, 17 + b, 2, 2, '#f6f1e6'); p(17, 17 + b, 2, 2, '#f6f1e6'); p(15, 17 + b, 2, 1, pele); p(15, 19 + b, 1, 1, rouS); p(15, 21 + b, 1, 1, rouS); p(15, 23 + b, 1, 1, rouS); }
      if (regata) { p(10, 17 + b, 2, 2, pele); p(20, 17 + b, 2, 2, pele); p(14, 17 + b, 4, 2, pele); }
    } else {
      if (ap.roupa === 1) { p(11, 16 + b, 10, 4, rouS); p(12, 17 + b, 8, 2, rou); }
      if (ap.roupa === 2) { p(12, 17 + b, 1, 8, rouS); p(18, 17 + b, 1, 8, rouS); p(10, 20 + b, 12, 1, rouS); p(10, 23 + b, 12, 1, rouS); }
      if (regata) { p(10, 17 + b, 2, 2, pele); p(20, 17 + b, 2, 2, pele); }
    }
    // cabeça
    p(10, hy, 12, 1, pele); p(9, hy + 1, 14, 1, pele); p(8, hy + 2, 16, 10, pele); p(9, hy + 12, 14, 1, pele); p(10, hy + 13, 12, 1, peleS);
    p(23, hy + 3, 1, 8, peleS);
    p(7, hy + 6, 1, 3, peleS); p(24, hy + 6, 1, 3, peleS);
    if (frente) {
      if (piscar) { p(11, hy + 7, 2, 1, olho); p(19, hy + 7, 2, 1, olho); }
      else { p(11, hy + 6, 2, 3, olho); p(19, hy + 6, 2, 3, olho); p(11, hy + 6, 1, 1, '#ffffff'); p(19, hy + 6, 1, 1, '#ffffff'); }
      const blush = mix(pele, '#e86a6a', 0.4);
      p(9, hy + 9, 2, 1, blush); p(21, hy + 9, 2, 1, blush);
      p(15, hy + 11, 2, 1, mix(pele, '#7a2f3a', 0.55));
    }
  }

  // cabelo
  const h = cabeloRets(ap.cabelo, dir);
  const cabS = escuro(cab, 0.3);
  for (const [x, y, w, hh] of h.raspado) p(x, y + b, w, hh, mix(pele, cab, 0.35));
  for (const [x, y, w, hh] of h.cab) p(x, y + b, w, hh, cab);
  for (const [x, y, w, hh] of h.sombra) p(x, y + b, w, hh, cabS);
  for (const [x, y, w, hh] of h.luz) p(x, y + b, w, hh, claro(cab, 0.2));
  if (ap.cabelo === 5 && dir !== 'cima') p(dir === 'baixo' ? 12 : 14, hy + 1, 2, 1, claro(pele, 0.4));
  if (ap.cabelo === 4) { // elástico do rabo de cavalo
    if (dir === 'cima') p(15, 11 + b, 2, 1, marca); else if (dir === 'lado') p(8, 8 + b, 1, 2, marca);
  }

  // barba
  if (ap.barba > 0 && dir !== 'cima') {
    const bc = escuro(cab, 0.1);
    if (dir === 'baixo') {
      if (ap.barba === 1) { p(8, hy + 9, 3, 3, bc); p(21, hy + 9, 3, 3, bc); p(9, hy + 12, 14, 1, bc); p(10, hy + 13, 12, 1, bc); p(11, hy + 11, 4, 1, bc); p(17, hy + 11, 4, 1, bc); p(12, hy + 10, 8, 1, bc); p(15, hy + 11, 2, 1, mix(pele, '#7a2f3a', 0.55)); }
      if (ap.barba === 2) p(12, hy + 10, 8, 1, bc);
      if (ap.barba === 3) { p(13, hy + 10, 6, 1, bc); p(14, hy + 12, 4, 2, bc); }
    } else {
      if (ap.barba === 1) { p(16, hy + 9, 7, 4, bc); p(17, hy + 13, 4, 1, bc); p(20, hy + 11, 2, 1, mix(pele, '#7a2f3a', 0.55)); p(18, hy + 9, 2, 1, pele); }
      if (ap.barba === 2) p(19, hy + 10, 4, 1, bc);
      if (ap.barba === 3) { p(19, hy + 10, 4, 1, bc); p(19, hy + 12, 3, 2, bc); }
    }
  }

  // acessórios
  const arm = '#1e1a26';
  const a = ap.acessorio;
  if (a === 1 || a === 2) {
    if (dir === 'baixo') {
      if (a === 1) {
        for (const x of [10, 18]) { p(x, hy + 5, 4, 1, arm); p(x, hy + 9, 4, 1, arm); p(x, hy + 5, 1, 5, arm); p(x + 3, hy + 5, 1, 5, arm); }
      } else { p(10, hy + 5, 4, 4, arm); p(18, hy + 5, 4, 4, arm); p(11, hy + 6, 1, 1, '#5b5670'); p(19, hy + 6, 1, 1, '#5b5670'); }
      p(14, hy + 6, 4, 1, arm); p(8, hy + 6, 2, 1, arm); p(22, hy + 6, 2, 1, arm);
    } else if (dir === 'lado') {
      if (a === 1) { p(17, hy + 5, 5, 1, arm); p(17, hy + 9, 5, 1, arm); p(17, hy + 5, 1, 5, arm); p(21, hy + 5, 1, 5, arm); }
      else { p(17, hy + 5, 5, 4, arm); p(18, hy + 6, 1, 1, '#5b5670'); }
      p(13, hy + 6, 4, 1, arm);
    }
  }
  if (a === 3) {
    const fc = '#2a2a33';
    if (dir === 'lado') { p(11, hy - 2, 8, 2, fc); p(13, hy + 4, 4, 6, fc); p(14, hy + 6, 2, 2, marca); }
    else { p(8, hy - 2, 16, 2, fc); p(6, hy + 4, 3, 6, fc); p(23, hy + 4, 3, 6, fc); p(6, hy + 6, 1, 2, marca); p(25, hy + 6, 1, 2, marca); }
  }
  if (a === 4) {
    const bs = escuro(marca, 0.3);
    if (dir === 'lado') { p(10, hy - 2, 12, 1, marca); p(9, hy - 1, 14, 5, marca); p(20, hy + 3, 6, 2, bs); }
    else if (dir === 'baixo') { p(9, hy - 2, 14, 1, marca); p(8, hy - 1, 16, 5, marca); p(8, hy + 4, 16, 2, bs); p(15, hy, 2, 2, '#ffffff'); }
    else { p(9, hy - 2, 14, 1, marca); p(8, hy - 1, 16, 5, marca); p(14, hy + 3, 4, 1, bs); }
  }
  if (a === 5) {
    const bn = '#c9442f';
    if (dir === 'lado') { p(9, hy + 1, 14, 3, bn); p(7, hy + 3, 2, 4, bn); p(12, hy + 2, 1, 1, '#ffffff'); p(17, hy + 2, 1, 1, '#ffffff'); }
    else { p(8, hy + 1, 16, 3, bn); p(11, hy + 2, 1, 1, '#ffffff'); p(15, hy + 2, 1, 1, '#ffffff'); p(19, hy + 2, 1, 1, '#ffffff'); if (dir === 'baixo') p(24, hy + 2, 2, 3, bn); else p(14, hy + 4, 3, 4, bn); }
  }
}
