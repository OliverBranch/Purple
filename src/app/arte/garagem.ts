// Cenário da garagem (480x270), desenhado por código. Anos 90, bloco aparente, CRT e sofá herdado.
import { Ctx, claro, escuro, larguraTexto, mix, ret, texto } from './pixel';

export const LARG = 480;
export const ALT = 270;

export interface CenaOpts {
  compras: string[];
  marca: string;
  empresa: string;
  /** telefone tocando (emergência no mural) */
  toca?: boolean;
  /** recado na secretária eletrônica (contrato novo no mural) */
  recado?: boolean;
}

/** Conceitos que aparecem no quadro branco, um de cada vez (fonte 3x5: sem barra nem igual). */
const QUADRO: [string, string][] = [
  ['TRIADE', 'C  I  D'], ['OSI', '7 CAMADAS'], ['SSH', 'PORTA 22'], ['DNS', 'PORTA 53'], ['MASCARA 26', '62 HOSTS'],
  ['APIPA', '169.254'], ['HUB: L1', 'SWITCH: L2'], ['WORM', 'SEM HOSPED.'], ['BACKUP', 'OFFLINE!'], ['RISCO', 'AMEACA X VUL'],
  ['TELNET 23', 'TEXTO CLARO'], ['RFC 1918', '10 172 192'], ['ROTEADOR', 'SEM BROADCAST'], ['HTTPS', 'PORTA 443'],
];

const h2 = (x: number, y: number): number => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/** 0 de dia, 1 de noite, com transições ao amanhecer e ao anoitecer. */
export function noite(hora: number): number {
  if (hora >= 7 && hora < 17) return 0;
  if (hora >= 17 && hora < 20) return (hora - 17) / 3;
  if (hora >= 20 || hora < 5) return 1;
  return 1 - (hora - 5) / 2;
}

const CEU: [number, string, string][] = [
  [0, '#0b0f2e', '#1b2250'], [5, '#1a1f52', '#5a3a6a'], [6.5, '#5a6fb8', '#f2a06a'], [9, '#5aa6e8', '#a8d8f6'],
  [16, '#5aa0e0', '#b8dcf2'], [18, '#5a5fae', '#f08a5a'], [19.5, '#2a2a6a', '#a8506a'], [21, '#0b0f2e', '#1b2250'], [24, '#0b0f2e', '#1b2250'],
];

function coresCeu(hora: number): [string, string] {
  for (let i = 0; i < CEU.length - 1; i++) {
    const a = CEU[i]!;
    const b = CEU[i + 1]!;
    if (hora >= a[0] && hora < b[0]) {
      const t = (hora - a[0]) / (b[0] - a[0]);
      return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
    }
  }
  return ['#0b0f2e', '#1b2250'];
}

function ceu(c: Ctx, x: number, y: number, w: number, h: number, hora: number, t: number, completo: boolean): void {
  const [topo, base] = coresCeu(hora);
  const n = noite(hora);
  for (let i = 0; i < h; i += 2) ret(c, x, y + i, w, 2, mix(topo, base, i / h));
  if (n > 0.4) {
    for (let i = 0; i < (completo ? 16 : 3); i++) {
      const sx = x + Math.floor(h2(i, x) * w);
      const sy = y + Math.floor(h2(x, i + 7) * h * 0.7);
      if (Math.sin(t * 1.3 + i * 2.1) > -0.6) ret(c, sx, sy, 1, 1, '#f4f0d8');
    }
  }
  if (!completo) return;
  if (n > 0.5) {
    ret(c, x + w - 16, y + 6, 6, 6, '#f4f0d8'); ret(c, x + w - 17, y + 7, 8, 4, '#f4f0d8'); ret(c, x + w - 15, y + 5, 4, 8, '#f4f0d8');
    ret(c, x + w - 14, y + 8, 2, 2, '#d8d2b8');
  } else {
    for (let i = 0; i < 2; i++) {
      const cx = x + ((Math.floor(t * (2 + i)) + i * 37) % (w + 24)) - 14;
      const cy = y + 6 + i * 9;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      ret(c, cx, cy + 2, 14, 3, '#ffffff'); ret(c, cx + 3, cy, 7, 3, '#ffffff'); ret(c, cx + 2, cy + 4, 11, 1, '#dcecf8');
      c.restore();
    }
  }
  // telhados ao fundo
  const sil = mix(base, '#1a1630', 0.55 + 0.35 * n);
  const alturas = [7, 12, 8, 15, 9, 6, 11, 8];
  let bx = x;
  alturas.forEach((a, i) => {
    const bw = i % 2 ? 7 : 9;
    ret(c, bx, y + h - a, bw, a, sil);
    if (n > 0.5 && h2(i, 3) > 0.35) ret(c, bx + 2, y + h - a + 2, 2, 2, '#f2c94c');
    if (i === 3) ret(c, bx + 3, y + h - a - 5, 1, 5, sil);
    bx += bw;
  });
}

export interface MonitorGeo { x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number }
export function geoMonitor(grande: boolean): MonitorGeo {
  return grande ? { x: 116, y: 80, w: 48, h: 34, tx: 120, ty: 84, tw: 40, th: 25 } : { x: 122, y: 86, w: 36, h: 28, tx: 125, ty: 89, tw: 30, th: 20 };
}

/** Fundo estático. Redesenhado só quando compras ou marca mudam. */
export function desenharFundo(c: Ctx, o: CenaOpts): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const tem = (id: string) => o.compras.includes(id);

  // parede de blocos
  p(0, 0, LARG, 104, '#52476c');
  for (let row = 0; row < 9; row++) {
    const y0 = -8 + row * 13;
    const off = row % 2 ? 13 : 0;
    for (let x = off - 26; x < LARG; x += 26) {
      const v = h2(x, row);
      if (v > 0.7) p(x + 1, y0, 25, 12, '#594e75'); else if (v < 0.14) p(x + 1, y0, 25, 12, '#4b4164');
      p(x, y0, 1, 12, '#453b5c');
      if (v > 0.5) p(x + 1, y0, 25, 1, '#5d5279');
    }
    p(0, y0 + 12, LARG, 1, '#453b5c');
  }
  for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(20,12,44,${0.5 - i * 0.04})`; c.fillRect(0, i, LARG, 1); }
  p(0, 100, LARG, 4, '#2f2640'); p(0, 100, LARG, 1, '#40355a');

  // piso de concreto
  p(0, 104, LARG, 166, '#6d6676');
  for (let y = 104; y < ALT; y++) for (let x = 0; x < LARG; x++) {
    const v = h2(x, y);
    if (v > 0.965) p(x, y, 1, 1, '#7a7384'); else if (v < 0.03) p(x, y, 2, 1, '#625c6c');
  }
  p(0, 104, LARG, 3, '#59536a');
  p(0, 174, LARG, 1, '#5c5668'); p(0, 175, LARG, 1, '#767082');
  p(160, 104, 1, 166, '#5c5668'); p(320, 104, 1, 166, '#5c5668');
  // vaga do carro que não existe mais
  c.fillStyle = 'rgba(30,22,44,0.10)';
  for (let y = 106; y < ALT; y += 4) { c.fillRect(336, y, 13, 3); c.fillRect(410, y, 13, 3); }
  c.fillStyle = 'rgba(222,196,96,0.26)';
  for (let y = 112; y < 262; y += 10) { c.fillRect(324, y, 2, 6); c.fillRect(434, y, 2, 6); }
  for (let dy = -7; dy <= 7; dy++) {
    const w = Math.round(Math.sqrt(1 - (dy / 8) ** 2) * 24);
    c.fillStyle = 'rgba(34,24,46,0.20)'; c.fillRect(379 - w, 190 + dy, w * 2, 1);
    if (Math.abs(dy) < 4) { c.fillStyle = 'rgba(34,24,46,0.18)'; c.fillRect(379 - w + 8, 190 + dy, w * 2 - 16, 1); }
  }

  // janela (o vidro é dinâmico)
  p(24, 32, 74, 56, '#5c3b27'); p(26, 34, 70, 52, '#7a5136'); p(26, 34, 70, 1, '#96694a');
  p(22, 86, 78, 4, '#8f6444'); p(22, 86, 78, 1, '#a87a56'); p(22, 89, 78, 1, '#5c3b27');

  // prateleiras
  for (const sy of [50, 74]) {
    p(110, sy, 82, 3, '#8f6444'); p(110, sy, 82, 1, '#a87a56'); p(110, sy + 3, 82, 1, '#5c3b27');
    p(116, sy + 3, 2, 4, '#3a3348'); p(184, sy + 3, 2, 4, '#3a3348');
  }
  p(114, 41, 9, 9, '#c9442f'); p(114, 40, 9, 2, '#d8d4cc'); p(116, 44, 5, 3, '#f1ece0'); p(121, 41, 2, 9, '#a03624');
  p(125, 43, 8, 7, '#2f6fb0'); p(125, 42, 8, 2, '#d8d4cc'); p(131, 43, 2, 7, '#24578c');
  p(137, 36, 16, 14, '#b08a5a'); p(137, 36, 16, 2, '#c9a474'); p(144, 36, 2, 14, '#d9bf8a'); p(151, 36, 2, 14, '#8f6e44');
  p(157, 39, 18, 11, '#3a3348'); p(159, 41, 7, 7, '#22202b'); p(160, 42, 1, 1, '#5a5670'); p(162, 44, 1, 1, '#5a5670'); p(164, 42, 1, 1, '#5a5670'); p(160, 46, 1, 1, '#5a5670'); p(164, 46, 1, 1, '#5a5670');
  p(168, 42, 5, 2, '#e0a526'); p(168, 46, 2, 2, '#9aa0a8'); p(171, 46, 2, 2, '#9aa0a8'); p(173, 31, 1, 8, '#9aa0a8');
  p(178, 42, 11, 8, '#2f6fb0'); p(180, 44, 7, 3, '#f1ece0'); p(178, 42, 11, 1, '#4a8fd0');
  const livros: [number, number, string][] = [[3, 11, '#c9442f'], [4, 13, '#2f9c6a'], [3, 10, '#e0a526'], [3, 12, '#7446c4'], [4, 11, '#2f6fb0'], [3, 13, '#d9609a'], [3, 9, '#3f8f93'], [4, 12, '#8a5a2b']];
  let lx = 113;
  for (const [w, h, cor] of livros) { p(lx, 74 - h, w, h, cor); p(lx + w - 1, 74 - h, 1, h, escuro(cor, 0.3)); p(lx, 74 - h + 2, w - 1, 1, claro(cor, 0.35)); lx += w; }
  p(150, 63, 7, 11, '#9ad0c8'); p(150, 62, 7, 2, '#d8d4cc'); p(152, 68, 1, 1, '#6a6e78'); p(154, 70, 1, 1, '#6a6e78'); p(151, 71, 1, 1, '#6a6e78');
  p(162, 64, 20, 10, '#c9442f'); p(162, 64, 20, 2, '#e0624a'); p(180, 64, 2, 10, '#a03624'); p(168, 61, 8, 1, '#3a3348'); p(168, 61, 1, 3, '#3a3348'); p(175, 61, 1, 3, '#3a3348'); p(171, 68, 2, 2, '#e0a526');

  // samambaia pendurada
  if (tem('planta')) {
    p(104, 0, 1, 30, '#9aa0a8'); p(99, 30, 12, 7, '#b8603a'); p(98, 30, 14, 2, '#cf7a4c');
    const v1 = '#3f8a4a'; const v2 = '#62b46c';
    p(96, 33, 3, 1, v1); p(94, 34, 2, 2, v1); p(93, 36, 2, 5, v2); p(92, 41, 1, 4, v1);
    p(111, 33, 3, 1, v1); p(113, 34, 2, 2, v1); p(114, 36, 2, 5, v2); p(116, 41, 1, 4, v1);
    p(100, 37, 1, 7, v2); p(102, 37, 1, 10, v1); p(105, 37, 1, 12, v2); p(107, 37, 1, 8, v1); p(109, 37, 1, 6, v2);
    p(101, 28, 2, 2, v2); p(104, 27, 3, 3, v1); p(108, 28, 2, 2, v2);
  }

  // cartaz
  p(204, 32, 30, 46, '#e8dcc0'); p(204, 32, 30, 1, '#f6eeda'); p(233, 32, 1, 46, '#c9bc9c');
  p(206, 34, 26, 30, '#3f8f93'); p(206, 54, 26, 10, '#357b7e');
  p(206, 42, 26, 2, '#5c3b27');
  p(215, 44, 6, 12, '#e08a3c'); p(214, 40, 2, 4, '#e08a3c'); p(220, 40, 2, 4, '#e08a3c'); p(214, 45, 8, 6, '#e08a3c');
  p(214, 44, 2, 1, '#b5601c'); p(220, 44, 2, 1, '#b5601c'); p(216, 47, 1, 1, '#241a2e'); p(219, 47, 1, 1, '#241a2e'); p(221, 55, 1, 5, '#e08a3c'); p(216, 52, 1, 3, '#b5601c'); p(219, 52, 1, 3, '#b5601c');
  texto(c, 'AGUENTA', 205, 64, '#3a3348'); texto(c, 'FIRME', 209, 70, '#3a3348');
  p(218, 33, 2, 1, '#c9442f');

  // calendário (o ano é dinâmico)
  p(240, 36, 20, 26, '#f1ece0'); p(240, 36, 20, 8, '#c9442f'); p(259, 36, 1, 26, '#cfc8bc');
  for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) p(242 + k * 4, 47 + r * 4, 2, 2, r === 1 && k === 3 ? '#c9442f' : '#b8b2a4');
  p(249, 35, 2, 2, '#3a3348');

  // geladeira
  p(240, 78, 24, 38, '#e4dfd0'); p(262, 78, 2, 38, '#bdb7a6'); p(240, 78, 24, 1, '#f4f0e4'); p(240, 91, 24, 1, '#a8a292');
  p(243, 83, 1, 5, '#8a8578'); p(243, 95, 1, 9, '#8a8578'); p(250, 82, 2, 2, '#c9442f'); p(256, 85, 2, 2, '#2f6fb0'); p(252, 97, 6, 7, '#f6e58a'); p(253, 99, 4, 1, '#b8a84a'); p(253, 101, 3, 1, '#b8a84a');
  p(240, 116, 24, 2, '#3a3348');
  if (tem('cafeteira')) {
    p(245, 65, 14, 13, '#2b2b33'); p(245, 65, 14, 1, '#44444e'); p(247, 70, 7, 7, '#c8e0e8'); p(247, 72, 7, 5, '#5a3a22'); p(248, 71, 1, 3, '#ffffff'); p(254, 72, 2, 1, '#c8e0e8'); p(256, 68, 1, 1, '#ff5a5a');
  }

  // painel de ferramentas e caixas
  p(268, 34, 30, 42, '#9a8a70'); p(268, 34, 30, 1, '#b4a488'); p(297, 34, 1, 42, '#7a6c56');
  for (let y = 37; y < 75; y += 4) for (let x = 271; x < 297; x += 4) p(x, y, 1, 1, '#7a6c56');
  p(273, 42, 2, 14, '#8f6444'); p(271, 39, 6, 4, '#6a6e78'); p(271, 39, 6, 1, '#9aa0a8');
  p(280, 41, 2, 15, '#9aa0a8'); p(279, 38, 4, 3, '#9aa0a8'); p(280, 38, 2, 1, '#9a8a70');
  p(287, 47, 1, 10, '#9aa0a8'); p(286, 40, 3, 7, '#c9442f'); p(286, 40, 1, 7, '#e0624a');
  p(290, 61, 6, 6, '#e0a526'); p(292, 63, 2, 2, '#9a8a70');
  p(275, 78, 16, 10, '#a57d4e'); p(275, 78, 16, 2, '#c9a474'); p(282, 78, 2, 10, '#d9bf8a');
  p(270, 88, 28, 26, '#b08a5a'); p(270, 88, 28, 3, '#c9a474'); p(283, 88, 2, 26, '#d9bf8a'); p(295, 88, 3, 26, '#8f6e44');
  texto(c, 'CABOS', 272, 101, '#5c3b27');

  // portão
  p(304, 26, 154, 78, '#2e2640');
  for (let i = 0; i < 9; i++) {
    const y = 30 + i * 8;
    p(308, y, 146, 7, '#8d93a8'); p(308, y, 146, 1, '#aab0c4'); p(308, y + 6, 146, 1, '#6c7186'); p(308, y + 7, 146, 1, '#4a4e60');
  }
  for (let i = 0; i < 4; i++) p(317 + i * 34, 38, 28, 8, '#3a3348');
  p(374, 95, 14, 2, '#3a3348'); p(380, 91, 2, 3, '#3a3348');
  // placa da empresa
  const nome = o.empresa.trim() || 'PURPLE';
  const esc2 = larguraTexto(nome) * 2 <= 94;
  const lw = esc2 ? larguraTexto(nome) * 2 : Math.min(94, larguraTexto(nome));
  p(350, 47, 1, 7, '#22202b'); p(412, 47, 1, 7, '#22202b');
  p(330, 54, 102, 18, '#5c3b27'); p(332, 56, 98, 14, '#7a5136'); p(332, 56, 98, 1, '#96694a'); p(332, 69, 98, 1, '#5c3b27');
  c.save();
  c.translate(381 - Math.floor(lw / 2), esc2 ? 58 : 61);
  if (esc2) c.scale(2, 2);
  texto(c, nome, 0.5, 0.5, '#2a1c14');
  texto(c, nome, 0, 0, claro(o.marca, 0.35));
  c.restore();

  // sofá herdado
  p(14, 98, 84, 20, '#b8763a'); p(14, 98, 84, 2, '#d39c5c');
  for (let x = 20; x < 96; x += 8) p(x, 100, 1, 18, '#9a5e2a');
  p(14, 107, 84, 1, '#d39c5c');
  p(10, 104, 10, 34, '#a86a32'); p(10, 104, 10, 3, '#d39c5c'); p(92, 104, 10, 34, '#a86a32'); p(92, 104, 10, 3, '#d39c5c'); p(100, 107, 2, 31, '#8a5426');
  p(20, 118, 72, 12, '#c9873f'); p(20, 118, 72, 1, '#dca55f'); p(55, 118, 1, 12, '#9a5e2a'); p(20, 130, 72, 8, '#9a5e2a'); p(20, 130, 72, 1, '#804c20');
  p(30, 121, 7, 6, '#3f8f93'); p(30, 121, 7, 1, '#f1ece0'); p(30, 126, 7, 1, '#f1ece0');
  p(12, 138, 4, 3, '#3a2a22'); p(96, 138, 4, 3, '#3a2a22');
  c.fillStyle = 'rgba(24,16,40,0.22)'; c.fillRect(12, 141, 90, 3);

  // tapete
  p(104, 152, 108, 58, '#3b2a5e'); p(107, 155, 102, 52, '#5b3f9a'); p(110, 158, 96, 46, '#6a4bb0');
  for (let i = 0; i < 5; i++) {
    const cx = 122 + i * 18;
    for (let d = 0; d < 5; d++) { p(cx - d, 176 + d, d * 2 + 1, 1, '#8b6fd0'); p(cx - d, 186 - d, d * 2 + 1, 1, '#8b6fd0'); }
    p(cx, 181, 1, 1, '#f2c94c');
  }
  p(110, 162, 96, 1, '#8b6fd0'); p(110, 199, 96, 1, '#8b6fd0');
  for (let y = 153; y < 210; y += 3) { p(102, y, 2, 1, '#d9cdf0'); p(212, y, 2, 1, '#d9cdf0'); }

  // mesa
  c.fillStyle = 'rgba(24,16,40,0.25)'; c.fillRect(100, 156, 106, 3);
  p(106, 136, 68, 20, '#2b2036');
  p(100, 136, 6, 22, '#7a5030'); p(174, 136, 28, 20, '#8a5c36'); p(200, 136, 4, 22, '#7a5030');
  p(176, 138, 24, 7, '#9a6a40'); p(176, 147, 24, 7, '#9a6a40'); p(186, 141, 4, 1, '#3a2a22'); p(186, 150, 4, 1, '#3a2a22');
  p(100, 106, 104, 24, '#c08a52'); p(100, 106, 104, 1, '#dcaa70');
  p(104, 112, 30, 1, '#ad7843'); p(150, 118, 40, 1, '#ad7843'); p(110, 125, 50, 1, '#ad7843');
  p(100, 130, 104, 6, '#8a5c36'); p(100, 130, 104, 1, '#6e4728');
  // luminária
  p(103, 113, 9, 3, '#2f6d5a'); p(107, 97, 2, 16, '#3a3348'); p(101, 92, 14, 6, '#2f6d5a'); p(101, 92, 14, 1, '#4a9078');
  // caneca, disquetes, modem, mouse
  p(112, 120, 6, 7, '#f1ece0'); p(112, 122, 6, 2, o.marca); p(118, 122, 1, 3, '#f1ece0'); p(113, 120, 4, 1, '#5a3a22');
  p(178, 109, 9, 9, '#2b2b33'); p(180, 110, 5, 3, '#f1ece0'); p(180, 115, 5, 3, '#9aa0a8');
  p(189, 112, 9, 9, '#2f6fb0'); p(191, 113, 5, 3, '#f1ece0'); p(191, 118, 5, 3, '#9aa0a8');
  p(176, 122, 22, 5, '#3a3a44'); p(176, 122, 22, 1, '#55555f');
  p(159, 119, 11, 9, '#3f8f93'); p(162, 121, 4, 6, '#e8e0cc'); p(163, 121, 2, 2, '#b5a98c'); p(164, 117, 1, 4, '#22202b');
  // monitor CRT (a tela é dinâmica)
  const m = geoMonitor(tem('monitor15'));
  p(m.x, m.y, m.w, m.h, '#d8cdb4'); p(m.x, m.y, m.w, 1, '#ece4d0'); p(m.x + m.w - 2, m.y, 2, m.h, '#b5a98c'); p(m.x, m.y + m.h - 2, m.w, 2, '#b5a98c');
  p(m.tx - 1, m.ty - 1, m.tw + 2, m.th + 2, '#3a3348');
  p(m.x + m.w - 7, m.y + m.h - 4, 2, 1, '#7bd66f'); p(m.x + 3, m.y + m.h - 4, 6, 1, '#b5a98c');
  p(134, m.y + m.h, 12, 3, '#b5a98c'); p(130, m.y + m.h + 3, 20, 2, '#d8cdb4');
  p(m.x + m.w - 1, m.y + 8, 5, 5, '#f6e58a'); p(m.x + m.w, m.y + 10, 3, 1, '#b8a84a');
  // teclado
  p(124, 121, 32, 6, '#d8cdb4'); p(124, 126, 32, 1, '#b5a98c');
  for (let x = 125; x < 155; x += 2) { p(x, 122, 1, 1, '#b5a98c'); p(x, 124, 1, 1, '#b5a98c'); }

  // gabinete, hub ou switch, nobreak
  p(208, 116, 18, 38, '#d8cdb4'); p(208, 116, 18, 1, '#ece4d0'); p(224, 116, 2, 38, '#b5a98c');
  p(210, 120, 14, 3, '#b5a98c'); p(211, 126, 12, 2, '#3a3348'); p(212, 132, 3, 3, '#b5a98c');
  for (let y = 142; y < 152; y += 2) p(211, y, 12, 1, '#b5a98c');
  c.fillStyle = 'rgba(24,16,40,0.25)'; c.fillRect(208, 154, 19, 2);
  if (tem('switch')) { p(206, 109, 22, 7, '#2f6fb0'); p(206, 109, 22, 1, '#4a8fd0'); for (let i = 0; i < 8; i++) p(208 + i * 2 + (i > 3 ? 2 : 0), 113, 1, 2, '#17141c'); }
  else { p(207, 110, 20, 6, '#6a6e78'); p(207, 110, 20, 1, '#8a8e98'); for (let i = 0; i < 5; i++) p(209 + i * 3, 113, 2, 2, '#17141c'); }
  p(204, 126, 4, 1, '#22202b'); p(200, 127, 5, 1, '#22202b');
  if (tem('nobreak')) { p(230, 136, 15, 18, '#22202b'); p(230, 136, 15, 2, '#3a3a44'); p(233, 146, 9, 5, '#17141c'); c.fillStyle = 'rgba(24,16,40,0.25)'; c.fillRect(230, 154, 16, 2); }

  // caixas e vassoura no canto
  p(440, 62, 2, 68, '#c9a474'); p(437, 124, 8, 8, '#e0c15a'); p(437, 124, 8, 1, '#c9442f');
  p(446, 100, 34, 32, '#b08a5a'); p(446, 100, 34, 3, '#c9a474'); p(462, 100, 2, 32, '#d9bf8a');
  texto(c, 'FRAGIL', 449, 114, '#5c3b27');
  p(450, 82, 30, 18, '#a57d4e'); p(450, 82, 30, 2, '#c9a474'); p(456, 70, 18, 12, '#b08a5a'); p(456, 70, 18, 2, '#c9a474');
  c.fillStyle = 'rgba(24,16,40,0.22)'; c.fillRect(444, 132, 36, 3);
  detalhesChao(c);
}

/** Vida no chão da garagem: sombra junto à parede, extensão, pizza, quadro branco e bancada de conserto. */
function detalhesChao(c: Ctx): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  // sombra de contato junto à parede
  const g = c.createLinearGradient(0, 104, 0, 120);
  g.addColorStop(0, 'rgba(20,12,36,0.35)'); g.addColorStop(1, 'rgba(20,12,36,0)');
  c.fillStyle = g; c.fillRect(0, 104, LARG, 16);
  // rachaduras no concreto
  for (const [x, y, n] of [[60, 236, 9], [250, 150, 7], [420, 248, 8]] as [number, number, number][]) {
    let cx = x, cy = y;
    for (let i = 0; i < n; i++) { p(cx, cy, 2, 1, '#5a5466'); cx += 2; cy += h2(cx, cy) > 0.5 ? 1 : -1; }
  }
  // tomada na parede e extensão até a mesa
  p(227, 95, 6, 6, '#e8e0cc'); p(229, 97, 1, 2, '#3a3348'); p(231, 97, 1, 2, '#3a3348');
  c.fillStyle = '#2a2234';
  for (let x = 204; x < 231; x++) c.fillRect(x, 158 + Math.round(Math.sin(x * 0.35) * 1.5), 1, 1);
  for (let y = 101; y < 158; y += 1) c.fillRect(231 + Math.round(Math.sin(y * 0.3)), y, 1, 1);
  p(218, 156, 10, 5, '#e8e0cc'); p(218, 156, 10, 1, '#fffaf0'); p(220, 158, 1, 1, '#c9442f'); p(223, 158, 2, 1, '#3a3348');
  // rolo de cabo de rede
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; c.fillStyle = a % 7 ? '#3b82f6' : '#2563eb'; c.fillRect(Math.round(268 + Math.cos(t) * 7), Math.round(168 + Math.sin(t) * 3), 2, 1); }
  for (let a = 0; a < 30; a++) { const t = a / 30 * Math.PI * 2; c.fillStyle = '#2f6fb0'; c.fillRect(Math.round(268 + Math.cos(t) * 4), Math.round(168 + Math.sin(t) * 2), 1, 1); }
  // caixas de pizza perto do sofá
  for (let i = 0; i < 3; i++) { p(14 + i, 158 - i * 3, 22, 3, i === 2 ? '#d8c08a' : '#c9a86a'); p(14 + i, 158 - i * 3, 22, 1, '#e8d4a4'); }
  texto(c, 'PIZZA', 17, 152, '#a0402a');
  c.fillStyle = 'rgba(24,16,40,0.22)'; c.fillRect(14, 161, 24, 2);
  // quadro branco de rodinhas
  p(10, 176, 2, 34, '#8a8e98'); p(64, 176, 2, 34, '#8a8e98'); p(8, 210, 8, 2, '#3a3348'); p(60, 210, 8, 2, '#3a3348');
  p(8, 168, 60, 30, '#3a3348'); p(9, 169, 58, 28, '#c9ced8'); p(10, 170, 56, 26, '#f4f6fa');
  p(12, 197, 52, 2, '#9aa0aa'); p(20, 196, 6, 1, '#2563eb'); p(30, 196, 6, 1, '#c9442f');
  c.fillStyle = 'rgba(24,16,40,0.22)'; c.fillRect(8, 212, 62, 2);
  // bancada de conserto com micro de cliente aberto
  p(196, 222, 76, 4, '#8a5c36'); p(196, 222, 76, 1, '#a8784a'); p(198, 226, 3, 22, '#6e4728'); p(267, 226, 3, 22, '#6e4728'); p(200, 240, 68, 2, '#6e4728');
  p(204, 206, 24, 16, '#d8cdb4'); p(204, 206, 24, 1, '#ece4d0'); p(206, 208, 20, 12, '#3a3348');
  p(208, 210, 8, 4, '#2f9c6a'); p(218, 210, 6, 2, '#e0a526'); p(208, 216, 14, 2, '#64748b'); p(210, 209, 1, 9, '#c9442f');
  p(228, 207, 2, 15, '#b5a98c');
  p(236, 214, 12, 3, '#2f9c6a'); p(237, 214, 1, 3, '#e0a526'); p(240, 214, 1, 3, '#e0a526'); p(243, 214, 1, 3, '#e0a526');
  p(252, 218, 14, 2, '#c9442f'); p(264, 217, 4, 4, '#64748b');
  p(232, 219, 3, 3, '#f1ece0');
  texto(c, 'CONSERTO', 214, 230, '#e8dcc0');
  c.fillStyle = 'rgba(24,16,40,0.25)'; c.fillRect(196, 248, 76, 3);
  // telefone com secretária eletrônica em cima da caixa de cabos
  p(271, 87, 18, 9, '#2b2b33'); p(271, 87, 18, 1, '#4a4a55'); p(273, 89, 6, 3, '#5a5a66'); p(281, 90, 6, 1, '#1a1a22');
}

export type ModoTela = 'ocioso' | 'trabalho' | 'alerta';

/** Camada animada sobre o fundo: céu, tela, LEDs. */
export function desenharDinamico(c: Ctx, o: CenaOpts, hora: number, t: number, modo: ModoTela, ano: number): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  const tem = (id: string) => o.compras.includes(id);
  const n = noite(hora);
  // janela
  ceu(c, 30, 38, 62, 44, hora, t, true);
  p(60, 38, 2, 44, '#7a5136'); p(30, 59, 62, 2, '#7a5136');
  c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(34, 40, 2, 16); c.fillRect(38, 40, 1, 10);
  // cacto no parapeito
  p(82, 79, 8, 7, '#b8603a'); p(81, 79, 10, 2, '#cf7a4c'); p(84, 69, 4, 10, '#4f9a5a'); p(85, 69, 1, 10, '#72be78'); p(88, 73, 2, 1, '#4f9a5a'); p(89, 71, 1, 3, '#4f9a5a'); p(85, 68, 2, 1, '#f29aa8');
  // quadro branco: um conceito por vez
  const k = Math.floor(t / 9) % QUADRO.length;
  const [l1, l2] = QUADRO[k] as [string, string];
  texto(c, l1, 38 - Math.round(l1.length * 2), 175, '#2563eb');
  texto(c, l2, 38 - Math.round(l2.length * 2), 184, '#c9442f');
  if (Math.floor(t / 9) !== Math.floor((t - 0.25) / 9)) p(10, 170, 56, 26, '#e8ecf4');
  // poeira dançando no feixe da janela
  if (n < 0.8) {
    for (let i = 0; i < 16; i++) {
      const fy = ((h2(i, 7) * 92 + t * (2 + h2(i, 3) * 3)) % 92);
      const y = 196 - fy;
      const esq = 30 + (y - 104) * (48 / 92), dir = 92 + (y - 104) * (76 / 92);
      const x = esq + (dir - esq) * ((h2(i, 11) + Math.sin(t * 0.4 + i) * 0.08 + 1) % 1);
      c.fillStyle = `rgba(255,240,200,${(0.35 + 0.35 * Math.sin(t * 2 + i)) * (1 - n)})`;
      c.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // telefone: LED de recado e toque de emergência
  const tremeTel = o.toca ? Math.round(Math.sin(t * 60)) : 0;
  p(273 + tremeTel, 84, 10, 3, '#3a3a44'); p(272 + tremeTel, 83, 3, 2, '#3a3a44'); p(281 + tremeTel, 83, 3, 2, '#3a3a44');
  if (o.recado || o.toca) p(285, 89, 2, 2, Math.sin(t * 6) > 0 ? '#ef4444' : '#5a1a1a');
  if (o.toca && Math.sin(t * 8) > -0.2) { texto(c, 'TRIM', 288, 74, '#ffffff'); p(286, 80, 1, 1, '#ffffff'); }
  // vidros do portão
  for (let i = 0; i < 4; i++) ceu(c, 318 + i * 34, 39, 26, 6, hora, t, false);
  // lâmpada fluorescente (com defeito desde 1993)
  p(202, 20, 76, 3, '#3a3348');
  const pisca = n > 0.3 && Math.sin(t * 9.1) > 0.97;
  p(206, 23, 68, 3, pisca ? '#eef4ff' : n > 0.3 ? '#77778c' : '#c9cede');
  // calendário
  texto(c, String(ano), 243, 38, '#ffffff');
  // luminária de mesa
  p(104, 98, 8, 2, n > 0.15 ? '#fff0b8' : '#d8cc9c');
  // tela
  const m = geoMonitor(tem('monitor15'));
  if (modo === 'trabalho') {
    p(m.tx, m.ty, m.tw, m.th, '#08160f');
    const linhas = Math.floor(m.th / 3);
    const rol = Math.floor(t * 5);
    for (let i = 0; i < linhas; i++) {
      const s = i + rol;
      const w = 4 + Math.floor(h2(s, 11) * (m.tw - 8));
      const ind = Math.floor(h2(s, 5) * 3) * 2;
      p(m.tx + 2 + ind, m.ty + 1 + i * 3, Math.min(w, m.tw - 4 - ind), 1, h2(s, 9) > 0.85 ? '#f2c94c' : '#58e08a');
    }
    if (Math.floor(t * 3) % 2) p(m.tx + 2, m.ty + m.th - 2, 2, 1, '#b8ffd0');
  } else if (modo === 'alerta') {
    const on = Math.floor(t * 4) % 2 === 0;
    p(m.tx, m.ty, m.tw, m.th, on ? '#5a1420' : '#2a0a12');
    const cx = m.tx + Math.floor(m.tw / 2);
    p(cx - 1, m.ty + 4, 3, m.th - 11, '#ff8a8a'); p(cx - 1, m.ty + m.th - 5, 3, 2, '#ff8a8a');
  } else {
    p(m.tx, m.ty, m.tw, m.th, '#0b0a1c');
    const nome = o.empresa.trim() || 'PURPLE';
    const lw = Math.min(larguraTexto(nome), m.tw - 2);
    const rx = m.tw - lw - 2;
    const ry = m.th - 7;
    const bx = Math.abs(((t * 9) % (rx * 2 || 1)) - rx);
    const by = Math.abs(((t * 6) % (ry * 2 || 1)) - ry);
    c.save(); c.beginPath(); c.rect(m.tx, m.ty, m.tw, m.th); c.clip();
    texto(c, nome, m.tx + 1 + bx, m.ty + 1 + by, claro(o.marca, 0.2));
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(m.tx, m.ty, m.tw, 1); c.fillRect(m.tx, m.ty, 1, m.th);
  // modem e gabinete
  for (let i = 0; i < 5; i++) {
    const on = h2(Math.floor(t * (3 + i)), i) > 0.45;
    p(179 + i * 4, 124, 2, 1, on ? (i === 0 ? '#ff5a5a' : '#7bd66f') : '#22202b');
  }
  p(218, 133, 2, 2, '#7bd66f'); p(221, 133, 2, 2, modo === 'trabalho' && h2(Math.floor(t * 12), 2) > 0.4 ? '#f2a03a' : '#5a4a2a');
  if (tem('switch')) for (let i = 0; i < 8; i++) p(208 + i * 2 + (i > 3 ? 2 : 0), 111, 1, 1, h2(Math.floor(t * 6), i + 20) > 0.4 ? '#7bd66f' : '#1c3a26');
  else p(224, 112, 1, 1, h2(Math.floor(t * 4), 40) > 0.3 ? '#f2a03a' : '#5a4a2a');
  if (tem('nobreak')) p(233, 140, 2, 2, '#7bd66f');
  if (tem('cafeteira')) p(256, 68, 1, 1, Math.floor(t) % 2 ? '#ff5a5a' : '#7a2020');
  // fresta de luz sob o portão
  if (n < 0.6) { c.fillStyle = `rgba(255,236,190,${0.5 * (1 - n)})`; c.fillRect(308, 102, 146, 1); }
}

function furo(c: Ctx, x: number, y: number, r: number, a: number): void {
  const g = c.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Luz ambiente: escuridão à noite com focos de luz, e facho de sol de dia. */
export function desenharLuz(c: Ctx, aux: Ctx, hora: number, modo: ModoTela): void {
  const n = noite(hora);
  if (n > 0.02) {
    aux.globalCompositeOperation = 'source-over';
    aux.clearRect(0, 0, LARG, ALT);
    aux.fillStyle = `rgba(14,8,48,${0.6 * n})`;
    aux.fillRect(0, 0, LARG, ALT);
    aux.globalCompositeOperation = 'destination-out';
    furo(aux, 110, 112, 86, 0.95);
    furo(aux, 140, 108, 60, 0.7);
    furo(aux, 60, 96, 70, 0.55);
    furo(aux, 380, 46, 50, 0.3);
    aux.globalCompositeOperation = 'source-over';
    c.drawImage(aux.canvas, 0, 0);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(108, 108, 2, 108, 108, 84);
    g.addColorStop(0, `rgba(255,176,92,${0.2 * n})`); g.addColorStop(1, 'rgba(255,176,92,0)');
    c.fillStyle = g; c.fillRect(20, 20, 180, 180);
    const cor = modo === 'alerta' ? '255,90,90' : modo === 'trabalho' ? '110,255,160' : '150,130,255';
    const g2 = c.createRadialGradient(140, 104, 2, 140, 104, 56);
    g2.addColorStop(0, `rgba(${cor},${0.13 * n})`); g2.addColorStop(1, `rgba(${cor},0)`);
    c.fillStyle = g2; c.fillRect(80, 46, 120, 120);
    c.globalCompositeOperation = 'source-over';
  }
  if (n < 0.8) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,236,190,${0.1 * (1 - n)})`;
    c.beginPath(); c.moveTo(30, 104); c.lineTo(92, 104); c.lineTo(168, 196); c.lineTo(78, 196); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  // vinheta suave
  const v = c.createRadialGradient(LARG / 2, ALT / 2, ALT * 0.45, LARG / 2, ALT / 2, ALT * 0.95);
  v.addColorStop(0, 'rgba(12,6,28,0)');
  v.addColorStop(1, 'rgba(12,6,28,0.38)');
  c.fillStyle = v;
  c.fillRect(0, 0, LARG, ALT);
}

export function desenharAssento(c: Ctx, cadeira: boolean): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  if (cadeira) {
    p(128, 154, 24, 11, '#3f3552'); p(128, 154, 24, 2, '#5a4c74'); p(131, 157, 18, 6, '#4d4066');
    p(139, 166, 2, 7, '#22202b'); p(127, 164, 26, 4, '#3f3552'); p(127, 164, 26, 1, '#5a4c74');
    p(130, 173, 20, 2, '#22202b'); p(129, 175, 3, 2, '#17141c'); p(138, 175, 3, 2, '#17141c'); p(148, 175, 3, 2, '#17141c');
  } else {
    p(130, 162, 20, 4, '#a8703f'); p(130, 162, 20, 1, '#c98f58'); p(132, 166, 2, 10, '#7a5030'); p(146, 166, 2, 10, '#7a5030'); p(132, 171, 16, 1, '#7a5030');
  }
}

export function desenharCama(c: Ctx): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  p(347, 206, 24, 2, '#4b3f8a'); p(344, 208, 30, 8, '#5b4fa0'); p(347, 216, 24, 2, '#3b316e'); p(348, 209, 22, 5, '#8b7fd0'); p(348, 209, 22, 1, '#a79be0');
}

export function desenharPotes(c: Ctx): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  p(384, 214, 10, 5, '#c9442f'); p(385, 214, 8, 2, '#7a4a2a'); p(384, 218, 10, 1, '#a03624');
  p(397, 214, 10, 5, '#2f6fb0'); p(398, 214, 8, 2, '#9ad8f0'); p(397, 218, 10, 1, '#24578c');
}

export function desenharArranhador(c: Ctx): void {
  const p = (x: number, y: number, w: number, h: number, cor: string) => ret(c, x, y, w, h, cor);
  p(296, 204, 24, 4, '#8f6444'); p(296, 204, 24, 1, '#a87a56');
  p(305, 176, 6, 28, '#d9c49a'); for (let y = 178; y < 204; y += 3) p(305, y, 6, 1, '#b89e70');
  p(298, 172, 20, 4, '#7446c4'); p(298, 172, 20, 1, '#9a6fe0');
  p(318, 176, 1, 6, '#f1ece0'); p(317, 182, 3, 3, '#c9442f');
}
