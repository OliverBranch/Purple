// Utilitários de pixel art. Toda a arte do jogo é desenhada por código nestes módulos.
export type Ctx = CanvasRenderingContext2D;

export const ret = (c: Ctx, x: number, y: number, w: number, h: number, cor: string): void => {
  c.fillStyle = cor;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}

export const escuro = (hex: string, t = 0.28): string => mix(hex, '#170f2b', t);
export const claro = (hex: string, t = 0.28): string => mix(hex, '#fff6e8', t);

export function novaTela(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

export function ctx2d(cv: HTMLCanvasElement): Ctx {
  const c = cv.getContext('2d') as Ctx;
  c.imageSmoothingEnabled = false;
  return c;
}

export const CONTORNO = '#1c1330';

/** Acrescenta contorno escuro de 1 px em volta da silhueta do sprite. */
export function contornar(cv: HTMLCanvasElement, cor = CONTORNO): void {
  const c = ctx2d(cv);
  const { width: w, height: h } = cv;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = rgb(cor);
  const opaco = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (d[(y * w + x) * 4 + 3] as number) > 40;
  const marcar: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!opaco(x, y) && (opaco(x - 1, y) || opaco(x + 1, y) || opaco(x, y - 1) || opaco(x, y + 1))) marcar.push((y * w + x) * 4);
    }
  }
  for (const i of marcar) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

// Fonte 3x5 para letreiros e telas. Cada glifo: 5 linhas de 3 bits.
const G: { [ch: string]: number[] } = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6], '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 6],
  '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2], '&': [2, 5, 2, 5, 3], ':': [0, 2, 0, 2, 0], '>': [4, 2, 1, 2, 4], '?': [6, 1, 2, 0, 2],
};

export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function larguraTexto(s: string): number {
  return semAcento(s).length * 4 - 1;
}

export function texto(c: Ctx, s: string, x: number, y: number, cor: string): void {
  c.fillStyle = cor;
  let cx = Math.round(x);
  for (const ch of semAcento(s)) {
    const g = G[ch];
    if (g) {
      for (let l = 0; l < 5; l++) {
        const bits = g[l] as number;
        for (let k = 0; k < 3; k++) if (bits & (4 >> k)) c.fillRect(cx + k, Math.round(y) + l, 1, 1);
      }
    }
    cx += 4;
  }
}

// Paletas de personalização.
export const PELES = ['#f6d3b3', '#e9b98e', '#cf9767', '#a8703f', '#7d4e2a', '#5a3620'];
export const CORES_CABELO = ['#2b1d16', '#5a3a22', '#8a5a2b', '#c98f3c', '#e6c15a', '#b8402a', '#9aa0a8', '#e9e6df', '#7a4fc0', '#2f6fb0', '#d94f8a', '#2f9c6a'];
export const CORES_ROUPA = ['#7446c4', '#2f6fb0', '#2f9c6a', '#c9442f', '#e0a526', '#2b2b33', '#e9e6df', '#d9609a', '#3f8f93', '#8a5a2b'];
export const CORES_CALCA = ['#34406b', '#22232b', '#7a6850', '#4a4a52', '#7a2f3a', '#2f5d3a'];
export const CORES_MARCA = ['#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6'];

export const NOMES_CABELO = ['Curto', 'Topete', 'Comprido', 'Cacheado', 'Rabo de cavalo', 'Careca', 'Moicano', 'Chanel', 'Tigela', 'Mullet'];
export const NOMES_BARBA = ['Sem barba', 'Barba', 'Bigode', 'Cavanhaque'];
export const NOMES_ROUPA = ['Camiseta', 'Moletom', 'Flanela xadrez', 'Camisa social', 'Regata'];
export const NOMES_ACESSORIO = ['Nenhum', 'Óculos', 'Óculos escuros', 'Fone de ouvido', 'Boné', 'Bandana'];
