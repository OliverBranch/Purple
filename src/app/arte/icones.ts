// Ícones 12x12 em pixel art, gerados em tempo de execução e injetados como CSS.
import { ctx2d, novaTela } from './pixel';

const PAL: Record<string, string> = {
  k: '#1c1330', w: '#fff6e8', p: '#a78bfa', P: '#7c3aed', y: '#f2c94c', Y: '#c9962a', g: '#4ade80', G: '#16a34a', b: '#60a5fa', B: '#2563eb',
  r: '#f87171', R: '#b91c1c', o: '#fb923c', n: '#c08a52', N: '#8a5c36', s: '#cbd5e1', S: '#64748b', c: '#e8dcc0',
};

const ICONES: Record<string, string[]> = {
  mural: [
    '............', '.kkkkkkkkkk.', '.knnnnnnnnk.', '.knwwwrnyyk.', '.knwkwnnyyk.', '.knwwwnnyyk.',
    '.knnnnbbbnk.', '.knyynbkbnk.', '.knyynbbbnk.', '.knnnnnnnnk.', '.kkkkkkkkkk.', '............'],
  loja: [
    '............', '..kkkkkkkk..', '.krwrwrwrwk.', '.kkkkkkkkkk.', '..kccccccck.', '..kcbbkccck.',
    '..kcbbkcnck.', '..kcbbkcnck.', '..kcbbkcnck.', '..kkkkkkkkk.', '............', '............'],
  arvore: [
    '.....kk.....', '...kkggkk...', '..kgggGggk..', '.kgGgggggGk.', '.kggggGgggk.', '.kGgggggggk.',
    '..kggGggGk..', '...kkNNkk...', '.....NN.....', '.....NN.....', '...kNNNNk...', '...kkkkkk...'],
  academia: [
    '............', '.....kk.....', '...kkPPkk...', '.kkPPPPPPkk.', 'kPPPPPPPPPPk', '.kkPPPPPPkk.',
    '..kkkPPkkky.', '..kpppppk.y.', '..kpppppk.y.', '...kkkkk..y.', '..........Y.', '............'],
  caderno: [
    '............', '..kkkkkkkk..', '.kykwwwwwwk.', '.kykwkkkkwk.', '.kykwwwwwwk.', '.kykwkkkwwk.',
    '.kykwwwwwwk.', '.kykwkkkkwk.', '.kykwwwwwwk.', '.kykwwwwrrk.', '..kkkkkkkk..', '............'],
  empresa: [
    '............', '.....kk.....', '....kPPk....', '...kPPPPk...', '..kPPPPPPk..', '.kkkkkkkkkk.',
    '.kwwkwwkwwk.', '.kwwkwwkwwk.', '.kkkkkkkkkk.', '.kwwkNNkwwk.', '.kkkkNNkkkk.', '............'],
  opcoes: [
    '............', '.....kk.....', '..kk.ss.kk..', '..kssssssk..', '...ssSSss...', '.kssSkkSssk.',
    '.kssSkkSssk.', '...ssSSss...', '..kssssssk..', '..kk.ss.kk..', '.....kk.....', '............'],
  dinheiro: [
    '............', '...kkkkkk...', '..kyyyyyyk..', '.kyyYkkYyyk.', '.kyykYyyyyk.', '.kyyyYkYyyk.',
    '.kyyyyyYkyk.', '.kyyYkkYyyk.', '..kyyyyyyk..', '...kkkkkk...', '............', '............'],
  rep: [
    '............', '.....kk.....', '....kyyk....', '....kyyk....', 'kkkkyyyykkkk', '.kyyyyyyyyk.',
    '..kyyyyyyk..', '...kyyyyk...', '..kyykkyyk..', '..kyk..kyk..', '..kk....kk..', '............'],
  insight: [
    '............', '....kkkk....', '...kyyyyk...', '..kyywyyyk..', '..kywyyyyk..', '..kyyyyyyk..',
    '...kyyyyk...', '....kYYk....', '....kssk....', '....kSSk....', '.....kk.....', '............'],
};

export function injetarIcones(): void {
  const regras: string[] = [];
  for (const [nome, linhas] of Object.entries(ICONES)) {
    const cv = novaTela(12, 12);
    const c = ctx2d(cv);
    linhas.forEach((l, y) => [...l].forEach((ch, x) => {
      const cor = PAL[ch];
      if (cor) {
        c.fillStyle = cor;
        c.fillRect(x, y, 1, 1);
      }
    }));
    regras.push(`.ico-${nome}{background-image:url(${cv.toDataURL()})}`);
  }
  const st = document.createElement('style');
  st.textContent = regras.join('\n');
  document.head.appendChild(st);

  // favicon: o próprio ícone de Insight em roxo
  const fav = novaTela(32, 32);
  const fc = ctx2d(fav);
  fc.fillStyle = '#1c1330'; fc.fillRect(4, 4, 24, 24);
  fc.fillStyle = '#8b5cf6'; fc.fillRect(6, 6, 20, 20);
  fc.fillStyle = '#fff6e8'; fc.fillRect(10, 10, 4, 12); fc.fillRect(14, 10, 6, 4); fc.fillRect(20, 12, 2, 4); fc.fillRect(14, 16, 6, 2);
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = fav.toDataURL();
  document.head.appendChild(link);
}
