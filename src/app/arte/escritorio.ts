// Escritório do cliente visto de cima (3/4), em pixel art desenhada por código.
// Fundo estático em cache; equipamentos, pessoas, cabos e estados redesenhados a cada quadro.
import { Incidente, LinkInc, NoInc, no, tem } from '../core/incidente';
import { Aparencia } from '../core/tipos';
import { CONTORNO, Ctx, claro, ctx2d, escuro, mix, novaTela, ret, texto } from './pixel';
import { spritePessoa } from './pessoa';

export const W = 480;
export const H = 270;
const PAREDE = 58;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PAREDES = ['#5b4a7a', '#4a6074', '#6b5a48', '#4f6b5a', '#6d4f5f', '#55597a'];
const PISOS: [string, string][] = [['#8a6a4a', '#7d5f42'], ['#6a6f7d', '#61656f'], ['#7a7f5c', '#6f7354'], ['#8c7a68', '#81705f'], ['#5e6b78', '#56626e']];

// ---------------- fundo ----------------

export function fundoEscritorio(inc: Incidente, cliente: string): HTMLCanvasElement {
  const cv = novaTela(W, H);
  const c = ctx2d(cv);
  const h = hash(cliente);
  const parede = PAREDES[h % PAREDES.length] as string;
  const [p1, p2] = PISOS[(h >> 4) % PISOS.length] as [string, string];
  const tabuas = ((h >> 8) & 1) === 0;
  // piso
  for (let y = PAREDE; y < H; y += 8) {
    for (let x = 0; x < W + 32; x += tabuas ? 32 : 16) {
      const off = tabuas && ((y / 8) | 0) % 2 ? 16 : 0;
      const alt = tabuas ? (((x + off) / 32 + y / 8) | 0) % 3 === 0 : (((x / 16) | 0) + ((y / 8) | 0)) % 2 === 0;
      ret(c, x - off, y, tabuas ? 32 : 16, 8, alt ? p2 : p1);
      ret(c, x - off, y + 7, tabuas ? 32 : 16, 1, escuro(p1, 0.12));
      if (tabuas) ret(c, x - off, y, 1, 7, escuro(p1, 0.1));
    }
  }
  // tapete central
  const tap = mix(parede, '#c9442f', 0.35);
  ret(c, 150, 128, 180, 120, escuro(tap, 0.1));
  ret(c, 153, 131, 174, 114, tap);
  for (let x = 157; x < 323; x += 6) ret(c, x, 134, 2, 2, claro(tap, 0.25)), ret(c, x, 240, 2, 2, claro(tap, 0.25));
  // parede
  ret(c, 0, 0, W, PAREDE, parede);
  for (let x = 0; x < W; x += 24) ret(c, x, 0, 1, PAREDE - 10, escuro(parede, 0.08));
  ret(c, 0, PAREDE - 12, W, 10, escuro(parede, 0.18));
  ret(c, 0, PAREDE - 12, W, 1, claro(parede, 0.12));
  ret(c, 0, PAREDE - 2, W, 2, '#2a2038');
  // janelas
  for (const jx of [118, 330]) {
    ret(c, jx - 2, 6, 52, 36, '#3a2c22');
    ret(c, jx, 8, 48, 32, '#9fd0f0');
    ret(c, jx, 26, 48, 14, '#b8e0f6');
    ret(c, jx + 6, 14, 12, 4, '#ffffff'), ret(c, jx + 10, 12, 8, 2, '#ffffff');
    ret(c, jx + 30, 30, 18, 10, '#7f9a8a'), ret(c, jx + 34, 24, 8, 16, '#6c8577');
    ret(c, jx + 23, 8, 2, 32, '#3a2c22');
    ret(c, jx, 23, 48, 2, '#3a2c22');
    ret(c, jx - 4, 42, 56, 3, '#4a3a2c');
  }
  // placa com o nome do cliente
  const nome = cliente.length > 26 ? cliente.slice(0, 26) : cliente;
  const lw = nome.length * 4 + 10;
  const px = Math.round(240 - lw / 2);
  ret(c, px - 1, 13, lw + 2, 13, CONTORNO);
  ret(c, px, 14, lw, 11, '#e8dcc0');
  ret(c, px, 23, lw, 2, '#c8b890');
  texto(c, nome, px + 5, 17, '#3a2c22');
  // quadros e decoração
  ret(c, 196, 32, 12, 14, '#2a2038'), ret(c, 197, 33, 10, 12, (h & 1) ? '#e0a526' : '#3f8f93');
  ret(c, 272, 30, 16, 12, '#2a2038'), ret(c, 273, 31, 14, 10, '#f2efe6'), ret(c, 275, 34, 10, 1, '#999'), ret(c, 275, 37, 7, 1, '#999');
  // relógio de parede
  ret(c, 452, 14, 12, 12, CONTORNO), ret(c, 453, 15, 10, 10, '#f2efe6'), ret(c, 457, 17, 1, 4, '#333'), ret(c, 457, 20, 3, 1, '#333');
  // planta no canto e bebedouro
  planta(c, 8, 236);
  planta(c, 456, 232);
  ret(c, 6, 70, 12, 26, '#d8dde6'), ret(c, 7, 62, 10, 9, '#8fc4ea'), ret(c, 6, 70, 12, 1, '#9aa'), ret(c, 9, 80, 3, 2, '#3b82f6');
  // mesas sob micros e setores
  for (const n of inc.nos) {
    if (n.tipo === 'pc' || n.tipo === 'notebook') mesa(c, n.x, n.y);
    if (n.tipo === 'depto') mesaLonga(c, n.x, n.y);
  }
  // sombra suave nas bordas
  const g = c.createLinearGradient(0, H - 30, 0, H);
  g.addColorStop(0, 'rgba(20,12,36,0)');
  g.addColorStop(1, 'rgba(20,12,36,0.35)');
  c.fillStyle = g;
  c.fillRect(0, H - 30, W, 30);
  return cv;
}

function planta(c: Ctx, x: number, y: number): void {
  ret(c, x + 2, y + 10, 12, 10, '#a0522d'), ret(c, x + 2, y + 10, 12, 2, '#c0703d');
  for (const [dx, dy, w] of [[0, 4, 6], [8, 2, 7], [4, -2, 6], [2, 0, 4], [9, 6, 6]] as [number, number, number][]) {
    ret(c, x + dx, y + dy, w, 4, '#2f9c6a');
    ret(c, x + dx + 1, y + dy, w - 2, 1, '#4ac48a');
  }
}

function mesa(c: Ctx, x: number, y: number): void {
  ret(c, x - 20, y - 8, 40, 13, CONTORNO);
  ret(c, x - 19, y - 7, 38, 10, '#b88a5a');
  ret(c, x - 19, y - 7, 38, 1, '#d4a670');
  ret(c, x - 19, y + 3, 38, 6, '#8a6038');
  ret(c, x - 20, y + 9, 40, 1, CONTORNO);
  ret(c, x - 18, y + 10, 36, 3, 'rgba(0,0,0,0.18)');
}

function mesaLonga(c: Ctx, x: number, y: number): void {
  ret(c, x - 34, y - 6, 68, 14, CONTORNO);
  ret(c, x - 33, y - 5, 66, 9, '#b88a5a');
  ret(c, x - 33, y - 5, 66, 1, '#d4a670');
  ret(c, x - 33, y + 4, 66, 4, '#8a6038');
}

// ---------------- cabos ----------------

export function ancora(n: NoInc): { x: number; y: number } {
  if (n.tipo === 'pc' || n.tipo === 'notebook') return { x: n.x + 14, y: n.y + 2 };
  if (n.tipo === 'depto') return { x: n.x, y: n.y - 8 };
  if (n.tipo === 'internet') return { x: n.x + 14, y: n.y + 8 };
  return { x: n.x, y: n.y + 4 };
}

export function caminho(inc: Incidente, l: LinkInc): { x: number; y: number }[] {
  const a = no(inc, l.a), b = no(inc, l.b);
  if (!a || !b) return [];
  const pa = ancora(a), pb = ancora(b);
  if (l.tipo === 'discada') return [pa, pb];
  const meioY = Math.round(Math.max(pa.y, pb.y) > PAREDE + 30 ? (pa.y < pb.y ? pb.y - 14 : pa.y - 14) : (pa.y + pb.y) / 2);
  return [pa, { x: pa.x, y: meioY }, { x: pb.x, y: meioY }, pb];
}

export function pontoEm(pts: { x: number; y: number }[], f: number): { x: number; y: number } {
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  const seg: number[] = [];
  let tot = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.abs(pts[i]!.x - pts[i - 1]!.x) + Math.abs(pts[i]!.y - pts[i - 1]!.y);
    seg.push(d);
    tot += d;
  }
  let alvo = Math.max(0, Math.min(1, f)) * tot;
  for (let i = 0; i < seg.length; i++) {
    const d = seg[i] as number;
    if (alvo <= d || i === seg.length - 1) {
      const t = d ? alvo / d : 0;
      const p = pts[i]!, q = pts[i + 1]!;
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    }
    alvo -= d;
  }
  return pts[pts.length - 1]!;
}

export function desenharCabos(c: Ctx, inc: Incidente, sel: string | null, t: number): void {
  for (const l of inc.links) {
    const pts = caminho(inc, l);
    if (pts.length < 2) continue;
    const a = no(inc, l.a)!, b = no(inc, l.b)!;
    const cortado = tem(a, 'isolado') || tem(b, 'isolado');
    const destaque = sel === l.a || sel === l.b;
    const cor = l.tipo === 'discada' ? '#c9a46a' : l.tipo === 'longo' ? '#a98be0' : destaque ? '#e8dcff' : '#8b93ad';
    if (l.tipo === 'discada') {
      c.fillStyle = cor;
      const p = pts[0]!, q = pts[1]!;
      const n = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
      for (let i = 0; i < n; i += 4) c.fillRect(Math.round(p.x + ((q.x - p.x) * i) / n), Math.round(p.y + ((q.y - p.y) * i) / n), 2, 1);
      continue;
    }
    const lim = cortado ? 0.45 : 1;
    // o cabo é desenhado de quem está ligado até o meio quando cortado
    const desdeB = tem(a, 'isolado');
    for (let k = 0; k <= 80; k++) {
      const f = k / 80;
      if (f > lim) break;
      const p = pontoEm(pts, desdeB ? 1 - f : f);
      ret(c, p.x - 1, p.y - 1, 3, 3, CONTORNO);
    }
    for (let k = 0; k <= 80; k++) {
      const f = k / 80;
      if (f > lim) break;
      const p = pontoEm(pts, desdeB ? 1 - f : f);
      ret(c, p.x, p.y, 1, 1, cor);
    }
    if (cortado) {
      const p = pontoEm(pts, desdeB ? 1 - lim : lim);
      ret(c, p.x - 2, p.y - 2, 4, 4, '#d9d2c0');
      ret(c, p.x - 1, p.y - 1, 2, 2, '#e0a526');
    }
    if (l.metros) {
      const p = pontoEm(pts, 0.5);
      texto(c, `${l.metros}M`, p.x - 6, p.y - 8, '#e8dcff');
    }
    void t;
  }
}

// ---------------- pessoas ----------------

export function aparenciaDe(seed: number): Aparencia {
  return {
    pele: seed % 6, cabelo: (seed >> 3) % 10, corCabelo: (seed >> 5) % 12 < 8 ? (seed >> 5) % 8 : (seed >> 5) % 12,
    barba: (seed >> 9) % 7 < 4 ? 0 : (seed >> 9) % 4, roupa: (seed >> 11) % 5, corRoupa: (seed >> 2) % 10, corCalca: (seed >> 4) % 6,
    acessorio: (seed >> 7) % 3 === 0 ? (seed >> 13) % 6 : 0,
  };
}

/** Funcionário sentado de costas, de frente para o próprio micro. */
export function funcionario(c: Ctx, n: NoInc, t: number, agitado: boolean): void {
  if (n.arte === undefined) return;
  const ap = aparenciaDe(n.arte);
  const spr = spritePessoa(ap, 'cima', 0, false, '#7446c4');
  const bob = agitado ? Math.round(Math.sin(t * 18) * 1) : Math.round(Math.sin(t * 1.3 + n.x) * 0.4);
  // cadeira
  ret(c, n.x - 7, n.y + 20, 14, 3, '#2a2038');
  ret(c, n.x - 1, n.y + 23, 2, 3, '#2a2038');
  c.drawImage(spr, 0, 0, 32, 22, n.x - 16 + (agitado ? bob : 0), n.y + 2 + (agitado ? 0 : bob), 32, 22);
}

// ---------------- equipamentos ----------------

const TELA_OK = '#3d6fd6';

type Sinal = 'nada' | 'texto' | 'ruido' | 'caveira' | 'erro';
function crt(c: Ctx, x: number, y: number, tela: string, t: number, sinal: Sinal): void {
  ret(c, x - 9, y - 22, 18, 16, CONTORNO);
  ret(c, x - 8, y - 21, 16, 14, '#d9d2c0');
  ret(c, x - 8, y - 21, 16, 1, '#efe9da');
  ret(c, x - 6, y - 19, 12, 9, tela);
  if (sinal === 'texto') for (let i = 0; i < 3; i++) ret(c, x - 5, y - 18 + i * 3, 4 + ((i * 5 + Math.floor(t * 2)) % 6), 1, claro(tela, 0.5));
  if (sinal === 'ruido') for (let i = 0; i < 9; i++) ret(c, x - 6 + ((i * 7 + Math.floor(t * 20)) % 12), y - 19 + ((i * 5 + Math.floor(t * 13)) % 9), 2, 1, i % 2 ? '#ffd0d0' : '#2a0000');
  if (sinal === 'caveira') { ret(c, x - 2, y - 18, 5, 4, '#f2efe6'); ret(c, x - 1, y - 17, 1, 1, '#000'), ret(c, x + 1, y - 17, 1, 1, '#000'); ret(c, x - 1, y - 14, 3, 2, '#f2efe6'); }
  if (sinal === 'erro') texto(c, 'NO', x - 3, y - 17, '#cccccc');
  ret(c, x - 6, y - 19, 12, 1, 'rgba(255,255,255,0.18)');
  ret(c, x - 3, y - 7, 6, 2, '#b9b2a0');
  // teclado
  ret(c, x - 7, y - 3, 14, 4, CONTORNO), ret(c, x - 6, y - 2, 12, 2, '#cfc8b6');
  // gabinete deitado ao lado
  ret(c, x + 9, y - 13, 9, 11, CONTORNO), ret(c, x + 10, y - 12, 7, 9, '#cfc8b6'), ret(c, x + 11, y - 10, 5, 1, '#8a8478');
}

export interface EstadoVisual { sel: boolean; hover: boolean; gato: boolean }

export function desenharNo(c: Ctx, inc: Incidente, n: NoInc, t: number, v: EstadoVisual): void {
  const infectadoVisto = n.visto && n.infec > 0;
  if (v.sel || v.hover) {
    const r = n.tipo === 'pc' ? 24 : n.tipo === 'depto' ? 38 : 16;
    c.fillStyle = v.sel ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.12)';
    c.beginPath();
    c.ellipse(n.x, n.y + (n.tipo === 'pc' ? 2 : 6), r, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (infectadoVisto || tem(n, 'pane')) {
    const a = 0.25 + 0.15 * Math.sin(t * 6);
    c.fillStyle = `rgba(239,68,68,${a})`;
    c.beginPath();
    c.ellipse(n.x, n.y + 2, n.tipo === 'depto' ? 40 : 24, 10, 0, 0, Math.PI * 2);
    c.fill();
  }
  switch (n.tipo) {
    case 'pc': case 'notebook': {
      const desl = tem(n, 'desligado');
      let tela = TELA_OK;
      let sinal: Sinal = 'texto';
      if (desl) { tela = '#101018'; sinal = 'nada'; }
      else if (tem(n, 'cifrado')) { tela = '#8a1010'; sinal = 'caveira'; }
      else if (tem(n, 'nao-liga')) { tela = '#000000'; sinal = 'erro'; }
      else if (infectadoVisto) { tela = Math.sin(t * 9) > 0 ? '#b0202a' : '#701018'; sinal = 'ruido'; }
      crt(c, n.x, n.y, tela, t, sinal);
      if (tem(n, 'caixa')) { ret(c, n.x - 18, n.y - 8, 7, 5, '#3a3a3a'), ret(c, n.x - 17, n.y - 7, 5, 2, '#4ade80'); }
      break;
    }
    case 'servidor': {
      const x = n.x - 9, y = n.y - 26;
      ret(c, x - 1, y - 1, 20, 32, CONTORNO);
      ret(c, x, y, 18, 30, '#d4cdb8');
      ret(c, x, y, 18, 1, '#ece6d4');
      ret(c, x + 2, y + 3, 14, 4, '#9a9484'), ret(c, x + 2, y + 9, 14, 4, '#9a9484');
      for (let i = 0; i < 3; i++) ret(c, x + 3 + i * 4, y + 20, 2, 2, Math.sin(t * (7 + i * 3) + i) > 0 ? (infectadoVisto ? '#ef4444' : '#4ade80') : '#2a3a2a');
      ret(c, x + 2, y + 25, 14, 2, '#8a8478');
      ret(c, x + 1, y + 30, 16, 2, 'rgba(0,0,0,0.25)');
      if (tem(n, 'cifrado')) { ret(c, x + 5, y - 9, 8, 7, '#8a1010'), ret(c, x + 7, y - 7, 1, 1, '#fff'), ret(c, x + 10, y - 7, 1, 1, '#fff'); }
      if (inc.modo === 'servidor') barraComp(c, n.x, y - 8, (inc.d['comp'] as number) / 100);
      break;
    }
    case 'hub': case 'switch': case 'bridge': case 'repetidor': case 'roteador': {
      equipamento(c, n, t, inc);
      break;
    }
    case 'slot': {
      const a = 0.5 + 0.5 * Math.sin(t * 4);
      c.fillStyle = `rgba(232,220,255,${0.35 + a * 0.4})`;
      for (let i = 0; i < 24; i += 3) { c.fillRect(n.x - 12 + i, n.y - 6, 2, 1); c.fillRect(n.x - 12 + i, n.y + 7, 2, 1); }
      for (let i = 0; i < 13; i += 3) { c.fillRect(n.x - 12, n.y - 6 + i, 1, 2); c.fillRect(n.x + 12, n.y - 6 + i, 1, 2); }
      ret(c, n.x - 1, n.y - 3, 2, 8, '#e8dcff'), ret(c, n.x - 4, n.y, 8, 2, '#e8dcff');
      break;
    }
    case 'modem': {
      ret(c, n.x - 10, n.y - 5, 20, 9, CONTORNO), ret(c, n.x - 9, n.y - 4, 18, 7, '#d9d2c0'), ret(c, n.x - 9, n.y - 4, 18, 1, '#efe9da');
      const desl = tem(n, 'desligado');
      for (let i = 0; i < 4; i++) ret(c, n.x - 7 + i * 4, n.y, 2, 1, desl ? '#333' : Math.sin(t * (9 + i * 4)) > 0.2 ? '#f87171' : '#4a2020');
      ret(c, n.x - 13, n.y - 2, 3, 6, '#6b6252'), ret(c, n.x - 14, n.y - 4, 5, 2, '#6b6252');
      break;
    }
    case 'internet': nuvem(c, n.x, n.y, t); break;
    case 'impressora': {
      ret(c, n.x - 12, n.y - 7, 24, 12, CONTORNO), ret(c, n.x - 11, n.y - 6, 22, 10, '#d4cdb8'), ret(c, n.x - 11, n.y - 6, 22, 2, '#ece6d4');
      ret(c, n.x - 8, n.y - 11, 16, 5, '#f8f6f0'), ret(c, n.x - 6, n.y - 10, 10, 1, '#999'), ret(c, n.x - 8, n.y + 3, 16, 2, '#7a7468');
      break;
    }
    case 'fita': {
      ret(c, n.x - 10, n.y - 18, 20, 22, CONTORNO), ret(c, n.x - 9, n.y - 17, 18, 20, '#6b5a48');
      for (let i = 0; i < 3; i++) ret(c, n.x - 7, n.y - 15 + i * 6, 14, 4, '#2a2a2a'), ret(c, n.x - 5, n.y - 14 + i * 6, 4, 2, '#e0a526');
      break;
    }
    case 'depto': {
      const ok = tem(n, 'ok');
      const qtd = Math.max(2, Math.min(5, (n.arte ?? 2) + 1));
      for (let i = 0; i < qtd; i++) {
        const x = n.x - 26 + i * (52 / Math.max(1, qtd - 1));
        ret(c, x - 5, n.y - 14, 10, 9, CONTORNO), ret(c, x - 4, n.y - 13, 8, 7, '#d9d2c0');
        ret(c, x - 3, n.y - 12, 6, 4, tem(n, 'pane') ? (Math.sin(t * 8) > 0 ? '#b0202a' : '#301010') : ok ? TELA_OK : '#3a3a48');
      }
      if (ok) ret(c, n.x + 30, n.y - 20, 6, 6, '#16a34a'), ret(c, n.x + 31, n.y - 18, 2, 2, '#bbf7d0'), ret(c, n.x + 33, n.y - 19, 2, 3, '#bbf7d0');
      {
        const rot = n.nome.split(' · ')[0]!.replace('Enlace com a filial', 'FILIAL').slice(0, 12);
        const qtd = n.nome.split(' · ')[1]?.split(' ')[0] ?? '';
        const txt = `${rot} ${qtd}`;
        const w = txt.length * 4 + 4;
        ret(c, n.x - w / 2 - 1, n.y + 10, w + 2, 9, CONTORNO);
        ret(c, n.x - w / 2, n.y + 11, w, 7, ok ? '#14532d' : '#2a2038');
        texto(c, txt, n.x - w / 2 + 2, n.y + 12, ok ? '#bbf7d0' : '#e8dcff');
      }
      break;
    }
    case 'objeto': objeto(c, n, t); break;
  }
  // marcadores
  const topo = n.tipo === 'pc' ? n.y - 30 : n.tipo === 'servidor' ? n.y - 46 : n.tipo === 'depto' ? n.y - 28 : n.y - 18;
  if (tem(n, 'suspeito') && !n.visto) balao(c, n.x, topo - Math.round(Math.sin(t * 5) * 1.5), '?', '#e0a526');
  else if (infectadoVisto) balao(c, n.x, topo - Math.round(Math.abs(Math.sin(t * 7)) * 2), '!', '#ef4444');
  else if (tem(n, 'pane')) balao(c, n.x, topo, '!', '#ef4444');
  if (tem(n, 'isolado')) iconeCabo(c, n.x - 22, n.y - 18);
  if (n.visto && tem(n, 'limpo') && n.infec <= 0) { ret(c, n.x + 14, n.y - 26, 7, 7, CONTORNO), ret(c, n.x + 15, n.y - 25, 5, 5, '#16a34a'), ret(c, n.x + 16, n.y - 23, 1, 1, '#fff'), ret(c, n.x + 17, n.y - 22, 1, 1, '#fff'), ret(c, n.x + 18, n.y - 24, 1, 2, '#fff'); }
  if (tem(n, 'imune')) { ret(c, n.x + 14, n.y - 17, 6, 6, '#2563eb'), ret(c, n.x + 15, n.y - 16, 4, 4, '#93c5fd'); }
}

function barraComp(c: Ctx, x: number, y: number, f: number): void {
  ret(c, x - 15, y, 30, 5, CONTORNO);
  ret(c, x - 14, y + 1, 28, 3, '#2a2038');
  ret(c, x - 14, y + 1, Math.round(28 * Math.min(1, f)), 3, f > 0.66 ? '#ef4444' : f > 0.33 ? '#f59e0b' : '#4ade80');
}

function equipamento(c: Ctx, n: NoInc, t: number, inc: Incidente): void {
  const cores: Record<string, [string, string]> = { hub: ['#9aa0aa', '#b9bec8'], switch: ['#3b6fb0', '#6c9bd8'], bridge: ['#4f8a6a', '#7cb896'], repetidor: ['#a08860', '#c8b080'], roteador: ['#2f2f3a', '#55556a'] };
  const [base, luz] = cores[n.tipo] ?? ['#888', '#aaa'];
  const w = n.tipo === 'repetidor' ? 14 : n.tipo === 'bridge' ? 18 : 26;
  ret(c, n.x - w / 2 - 1, n.y - 6, w + 2, 11, CONTORNO);
  ret(c, n.x - w / 2, n.y - 5, w, 9, base);
  ret(c, n.x - w / 2, n.y - 5, w, 1, luz);
  const portas = Math.floor((w - 4) / 3);
  const trafego = inc.modo === 'rede' ? 1 : 0.6;
  for (let i = 0; i < portas; i++) {
    const on = Math.sin(t * (11 + i * 2.3) + i * 1.7) > 1 - trafego;
    ret(c, n.x - w / 2 + 2 + i * 3, n.y - 2, 2, 1, on ? (n.tipo === 'hub' ? '#fbbf24' : '#4ade80') : '#1f2a1f');
    ret(c, n.x - w / 2 + 2 + i * 3, n.y + 1, 2, 2, '#1c1330');
  }
  if (n.tipo === 'roteador') { ret(c, n.x - 9, n.y - 11, 1, 5, '#2f2f3a'), ret(c, n.x + 8, n.y - 11, 1, 5, '#2f2f3a'); }
  ret(c, n.x - w / 2, n.y + 5, w, 2, 'rgba(0,0,0,0.25)');
}

function nuvem(c: Ctx, x: number, y: number, t: number): void {
  const b = Math.round(Math.sin(t * 1.2) * 1);
  const pts: [number, number, number][] = [[-12, 4, 8], [-4, -2, 10], [8, 0, 9], [14, 6, 7], [0, 8, 10]];
  c.fillStyle = CONTORNO;
  for (const [dx, dy, r] of pts) { c.beginPath(); c.arc(x + dx, y + dy + b, r + 1, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#e8eef8';
  for (const [dx, dy, r] of pts) { c.beginPath(); c.arc(x + dx, y + dy + b, r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#c3d0e6';
  c.fillRect(x - 14, y + 10 + b, 30, 3);
  // globo
  ret(c, x - 3, y + b, 7, 7, '#2563eb'), ret(c, x - 2, y + 1 + b, 3, 2, '#4ade80'), ret(c, x + 1, y + 4 + b, 2, 2, '#4ade80');
}

function balao(c: Ctx, x: number, y: number, s: string, cor: string): void {
  ret(c, x - 5, y - 6, 11, 10, CONTORNO);
  ret(c, x - 4, y - 5, 9, 8, cor);
  ret(c, x - 1, y + 4, 3, 2, CONTORNO);
  texto(c, s, x - 1, y - 4, '#ffffff');
}

function iconeCabo(c: Ctx, x: number, y: number): void {
  ret(c, x, y, 9, 9, CONTORNO);
  ret(c, x + 1, y + 1, 7, 7, '#d9d2c0');
  ret(c, x + 3, y + 2, 3, 3, '#6b6252');
  ret(c, x + 2, y + 5, 1, 1, '#ef4444'), ret(c, x + 6, y + 5, 1, 1, '#ef4444'), ret(c, x + 3, y + 6, 1, 1, '#ef4444'), ret(c, x + 5, y + 6, 1, 1, '#ef4444'), ret(c, x + 4, y + 5, 1, 1, '#ef4444');
}

function objeto(c: Ctx, n: NoInc, t: number): void {
  const x = n.x, y = n.y;
  switch (n.arte) {
    case 0: mesa(c, x, y); crt(c, x, y, TELA_OK, t, 'texto'); if (n.tags.some((s) => s === 'achado:postit')) ret(c, x + 5, y - 21, 4, 4, '#f2e05a'); break;
    case 1: ret(c, x - 8, y - 18, 16, 24, CONTORNO), ret(c, x - 7, y - 17, 14, 22, '#d4cdb8'), ret(c, x - 5, y - 4, 2, 2, Math.sin(t * 8) > 0 ? '#4ade80' : '#1f2a1f'); break;
    case 2: ret(c, x - 14, y - 16, 28, 20, '#3a2c22'), ret(c, x - 12, y - 14, 24, 16, '#9fd0f0'), ret(c, x - 1, y - 14, 2, 16, '#3a2c22'); break;
    case 3: ret(c, x - 9, y - 26, 18, 30, CONTORNO), ret(c, x - 8, y - 25, 16, 29, '#8a6038'), ret(c, x + 4, y - 11, 2, 2, '#e0a526'); break;
    case 4: ret(c, x - 11, y - 24, 22, 28, CONTORNO), ret(c, x - 10, y - 23, 20, 26, '#7a7f8a'), ret(c, x - 10, y - 11, 20, 1, '#5a5f6a'), ret(c, x - 2, y - 18, 4, 1, '#ccc'), ret(c, x - 2, y - 6, 4, 1, '#ccc'); break;
    case 5: ret(c, x - 6, y - 10, 12, 14, CONTORNO), ret(c, x - 5, y - 9, 10, 12, '#6a7a6a'), ret(c, x - 4, y - 12, 7, 3, '#f8f6f0'); break;
    case 6: ret(c, x - 14, y - 30, 28, 12, CONTORNO), ret(c, x - 13, y - 29, 26, 10, '#e8e6e0'), ret(c, x - 11, y - 23, 22, 1, '#999'); ret(c, x - 1, y - 18 + ((t * 20) | 0) % 16, 2, 3, '#60a5fa'); ret(c, x - 5, y - 2, 10, 6, '#3b82f6'); break;
    case 7: ret(c, x - 18, y - 8, 36, 14, CONTORNO), ret(c, x - 17, y - 7, 34, 12, '#c9a46a'), ret(c, x - 17, y - 7, 34, 2, '#e0c08a'), ret(c, x + 6, y - 12, 8, 5, '#3a3a3a'); break;
    case 8: equipamento(c, { ...n, tipo: 'roteador' }, t, { modo: '' } as Incidente); break;
    case 9: ret(c, x - 3, y - 14, 6, 16, CONTORNO), ret(c, x - 2, y - 13, 4, 14, '#dc2626'), ret(c, x - 2, y - 16, 4, 3, '#333'); break;
    case 10: ret(c, x - 12, y - 3, 24, 6, CONTORNO), ret(c, x - 11, y - 2, 22, 4, '#f2efe6'); for (let i = 0; i < 4; i++) ret(c, x - 9 + i * 5, y - 1, 2, 2, '#333'); break;
    case 11: ret(c, x - 14, y - 26, 28, 20, CONTORNO), ret(c, x - 13, y - 25, 26, 18, '#b88a5a'), ret(c, x - 10, y - 22, 8, 7, '#f8f6f0'), ret(c, x + 1, y - 21, 8, 6, '#fde68a'), ret(c, x - 4, y - 14, 9, 5, '#bfdbfe'); break;
  }
  if (!n.visto) {
    const a = 0.45 + 0.45 * Math.sin(t * 3 + x);
    const by = y - 34 - Math.round(Math.abs(Math.sin(t * 2.5 + x)) * 2);
    c.globalAlpha = 0.55 + a * 0.45;
    ret(c, x - 4, by, 9, 9, CONTORNO);
    ret(c, x - 3, by + 1, 7, 7, '#e8dcff');
    texto(c, '?', x - 1, by + 2, '#4a3b78');
    c.globalAlpha = 1;
  } else if (tem(n, 'achado')) {
    ret(c, x + 8, y - 28, 9, 9, CONTORNO), ret(c, x + 9, y - 27, 7, 7, '#f59e0b'), texto(c, '!', x + 11, y - 26, '#fff');
  }
}

// ---------------- técnico e gato ----------------

/** Onde o técnico fica para trabalhar num nó. */
export function postoDe(n: NoInc | undefined): { x: number; y: number } {
  if (!n) return { x: 240, y: 140 };
  if (n.tipo === 'pc') return { x: n.x - 30, y: n.y - 10 };
  if (n.tipo === 'internet') return { x: n.x + 40, y: n.y + 40 };
  if (n.tipo === 'depto') return { x: n.x - 44, y: n.y - 22 };
  return { x: n.x - 22, y: n.y - 14 };
}

/** Luz do fim de tarde e da noite conforme a visita se alonga. */
export function luzDaHora(c: Ctx, hora: number): void {
  const h = 8 + hora;
  if (h < 16.5) return;
  const f = Math.min(1, (h - 16.5) / 3.5);
  c.fillStyle = h < 18.5 ? `rgba(255,140,60,${0.12 * f})` : `rgba(30,20,80,${0.1 + 0.3 * Math.min(1, (h - 18.5) / 2)})`;
  c.fillRect(0, 0, W, H);
}
