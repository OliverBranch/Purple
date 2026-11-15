import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';
import { JogoService } from '../jogo.service';
import { ALT, LARG, ModoTela, desenharArranhador, desenharAssento, desenharCama, desenharDinamico, desenharFundo, desenharLuz, desenharPotes } from '../arte/garagem';
import { spritePessoa, Dir } from '../arte/pessoa';
import { spriteGato, PoseGato } from '../arte/gato';
import { CORES_MARCA, ctx2d, novaTela, ret, texto } from '../arte/pixel';
import { dataDe } from '../core/sim';

interface Bolha { x: number; y: number; vy: number; vida: number; tipo: 'T' | 'G' | '!' | '+' | 'ok' }
interface Ator { x: number; y: number; alvoX: number; alvoY: number; dir: Dir; esq: boolean; espera: number; andando: boolean }

const PISO = { x0: 30, x1: 450, y0: 182, y1: 250 };

@Component({
  selector: 'app-cena',
  template: `<canvas #tela class="cena" [width]="L" [height]="A" (click)="clique($event)" (mousemove)="mover($event)"></canvas>`,
  styles: [`:host{display:block;width:100%;height:100%} .cena{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;display:block;cursor:default}`],
})
export class CenaComponent implements OnDestroy {
  readonly L = LARG;
  readonly A = ALT;
  private jogo = inject(JogoService);
  private zona = inject(NgZone);
  private tela = viewChild.required<ElementRef<HTMLCanvasElement>>('tela');
  private raf = 0;
  private fundo = novaTela(LARG, ALT);
  private aux = ctx2d(novaTela(LARG, ALT));
  private chaveFundo = '';
  private bolhas: Bolha[] = [];
  private t = 0;
  private ultimo = 0;
  private dono: Ator = { x: 250, y: 215, alvoX: 250, alvoY: 215, dir: 'baixo', esq: false, espera: 2, andando: false };
  private gato: Ator = { x: 360, y: 228, alvoX: 360, alvoY: 228, dir: 'lado', esq: false, espera: 3, andando: false };
  private poseGato: PoseGato = 'sentar';
  private coracoes: { x: number; y: number; vida: number }[] = [];
  private zz = 0;
  private sobreGato = false;

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => {
        const loop = (ms: number) => {
          const dt = this.ultimo ? Math.min(0.05, (ms - this.ultimo) / 1000) : 0;
          this.ultimo = ms;
          this.t += dt;
          this.atualizar(dt);
          this.desenhar();
          this.raf = requestAnimationFrame(loop);
        };
        this.raf = requestAnimationFrame(loop);
      });
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }

  private get marca(): string {
    return CORES_MARCA[this.jogo.estado?.corMarca ?? 0] ?? '#8b5cf6';
  }

  private ponto(ev: MouseEvent): { x: number; y: number } {
    const cv = this.tela().nativeElement;
    const r = cv.getBoundingClientRect();
    const esc = Math.min(r.width / LARG, r.height / ALT);
    const ox = (r.width - LARG * esc) / 2;
    const oy = (r.height - ALT * esc) / 2;
    return { x: (ev.clientX - r.left - ox) / esc, y: (ev.clientY - r.top - oy) / esc };
  }

  private noGato(x: number, y: number): boolean {
    return Math.abs(x - this.gato.x) < 13 && y > this.gato.y - 22 && y < this.gato.y + 2;
  }

  mover(ev: MouseEvent): void {
    const p = this.ponto(ev);
    const sobre = this.noGato(p.x, p.y);
    if (sobre !== this.sobreGato) {
      this.sobreGato = sobre;
      this.tela().nativeElement.style.cursor = sobre ? 'pointer' : 'default';
    }
  }

  clique(ev: MouseEvent): void {
    const p = this.ponto(ev);
    if (this.noGato(p.x, p.y)) {
      if (this.poseGato === 'dormir') {
        this.jogo.afagarGato();
      } else {
        this.jogo.miar();
        this.poseGato = 'sentar';
        this.gato.andando = false;
        this.gato.espera = 3;
      }
      for (let i = 0; i < 3; i++) this.coracoes.push({ x: this.gato.x - 4 + i * 4, y: this.gato.y - 26 - i * 3, vida: 1.4 + i * 0.2 });
    }
  }

  private trabalhando(): boolean {
    return !!this.jogo.estado?.caso;
  }

  private atualizar(dt: number): void {
    const e = this.jogo.estado;
    if (!e) return;
    for (const b of this.bolhas) {
      b.y += b.vy * dt;
      b.vida -= dt;
    }
    this.bolhas = this.bolhas.filter((b) => b.vida > 0);
    for (const c of this.coracoes) {
      c.y -= 14 * dt;
      c.vida -= dt;
    }
    this.coracoes = this.coracoes.filter((c) => c.vida > 0);

    // dono
    if (!this.trabalhando()) this.andar(this.dono, dt, 42, () => {
      const r = Math.random();
      if (r < 0.25) return { x: 252, y: 128, espera: 3 }; // geladeira
      if (r < 0.4) return { x: 60, y: 160, espera: 4 }; // sofá
      return { x: PISO.x0 + Math.random() * (PISO.x1 - PISO.x0), y: PISO.y0 + Math.random() * (PISO.y1 - PISO.y0), espera: 1.5 + Math.random() * 3 };
    });

    // gato
    const pers = e.gato.personalidade;
    if (this.poseGato === 'dormir') {
      this.gato.espera -= dt;
      this.zz += dt;
      if (this.gato.espera <= 0) {
        this.poseGato = 'sentar';
        this.gato.espera = 2;
      }
    } else {
      const vel = pers === 1 ? 46 : pers === 0 ? 20 : 28;
      this.andar(this.gato, dt, vel, () => {
        const r = Math.random();
        const sono = pers === 0 ? 0.45 : pers === 1 ? 0.1 : 0.25;
        if (r < sono) {
          const lugares = [{ x: 359, y: 214 }, { x: 74, y: 134 }, ...(e.compras.includes('arranhador') ? [{ x: 308, y: 178 }] : [])];
          const l = lugares[Math.floor(Math.random() * lugares.length)]!;
          return { x: l.x, y: l.y, espera: 0, dormir: true };
        }
        if (pers === 2 && r < 0.75) return { x: this.trabalhando() ? 168 : this.dono.x + 18, y: this.trabalhando() ? 170 : this.dono.y + 4, espera: 4 };
        if (pers === 4 && r < 0.7) return { x: 455 + Math.random() * 10, y: 146, espera: 3 };
        if (r < 0.62) return { x: 392, y: 226, espera: 2.5 }; // potes
        return { x: PISO.x0 + Math.random() * (PISO.x1 - PISO.x0), y: PISO.y0 + Math.random() * (PISO.y1 - PISO.y0), espera: 1 + Math.random() * 3 };
      });
    }
  }

  private andar(a: Ator, dt: number, vel: number, novoAlvo: () => { x: number; y: number; espera: number; dormir?: boolean }): void {
    if (a.andando) {
      const dx = a.alvoX - a.x;
      const dy = a.alvoY - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        a.andando = false;
        a.dir = 'baixo';
        if (a === this.gato) this.poseGato = (a as Ator & { dormir?: boolean }).dormir ? 'dormir' : 'sentar';
        if (a === this.gato && this.poseGato === 'dormir') a.espera = 10 + Math.random() * 12;
      } else {
        a.x += (dx / d) * vel * dt;
        a.y += (dy / d) * vel * dt;
        if (Math.abs(dx) > Math.abs(dy) * 0.8) {
          a.dir = 'lado';
          a.esq = dx < 0;
        } else a.dir = dy < 0 ? 'cima' : 'baixo';
      }
    } else {
      a.espera -= dt;
      if (a.espera <= 0) {
        const n = novoAlvo();
        a.alvoX = Math.max(14, Math.min(466, n.x));
        a.alvoY = Math.max(120, Math.min(258, n.y));
        a.espera = n.espera;
        (a as Ator & { dormir?: boolean }).dormir = !!n.dormir;
        a.andando = true;
        if (a === this.gato) this.poseGato = 'andar';
      }
    }
  }

  private desenhar(): void {
    const e = this.jogo.estado;
    if (!e) return;
    const c = ctx2d(this.tela().nativeElement);
    const opts = { compras: e.compras, marca: this.marca, empresa: e.empresa, toca: !e.caso && e.mural.some((k) => k.emergencia), recado: !e.caso && e.mural.length > 0 };
    const chave = `${e.compras.join(',')}|${this.marca}|${e.empresa}`;
    if (chave !== this.chaveFundo) {
      this.chaveFundo = chave;
      const fc = ctx2d(this.fundo);
      fc.clearRect(0, 0, LARG, ALT);
      desenharFundo(fc, opts);
    }
    c.drawImage(this.fundo, 0, 0);
    const caso = e.caso;
    const modo: ModoTela = caso ? 'trabalho' : 'ocioso';
    desenharDinamico(c, opts, this.jogo.hora, this.t, modo, dataDe(e.semana).ano);
    desenharCama(c);
    desenharPotes(c);
    if (e.compras.includes('arranhador')) desenharArranhador(c);

    // atores, ordenados por profundidade
    const piscarD = Math.sin(this.t * 1.7) > 0.985;
    const piscarG = Math.sin(this.t * 1.3 + 1) > 0.98;
    const desenhos: { y: number; f: () => void }[] = [];
    const ap = e.fundador;
    if (this.trabalhando()) {
      desenhos.push({ y: 176, f: () => {
        // sentado de costas: só o tronco aparece, o assento fica na frente
        const digita = modo === 'trabalho' ? Math.floor(this.t * 6) % 2 : 0;
        const spr = spritePessoa(ap, 'cima', 0, false, this.marca);
        c.drawImage(spr, 0, 0, 32, 25, 124, 139 - (digita ? 1 : 0), 32, 25);
        desenharAssento(c, e.compras.includes('cadeira'));
      } });
    } else {
      desenhos.push({ y: 170, f: () => desenharAssento(c, e.compras.includes('cadeira')) });
      const d = this.dono;
      desenhos.push({ y: d.y, f: () => {
        const fr = d.andando ? Math.floor(this.t * 8) % 4 : 0;
        const spr = spritePessoa(ap, d.dir, fr, piscarD, this.marca);
        this.sombra(c, d.x, d.y, 10);
        this.desenharSprite(c, spr, d.x - 16, d.y - 31, d.dir === 'lado' && d.esq);
      } });
    }
    const g = this.gato;
    desenhos.push({ y: g.y - 0.5, f: () => {
      const fr = this.poseGato === 'andar' ? Math.floor(this.t * 8) % 4 : this.poseGato === 'dormir' ? Math.floor(this.t * 0.8) % 2 : Math.floor(this.t * 0.7) % 2;
      const spr = spriteGato(e.gato, this.poseGato, fr, piscarG);
      if (this.poseGato !== 'dormir' || g.y > 180) this.sombra(c, g.x, g.y, 8);
      this.desenharSprite(c, spr, g.x - 16, g.y - 31, this.poseGato === 'andar' && g.esq);
      if (this.sobreGato) { ret(c, g.x - 2, g.y - 34, 4, 1, '#ffffff'); }
      if (this.poseGato === 'dormir') {
        const k = (this.zz * 0.8) % 3;
        texto(c, 'Z', g.x + 8 + k * 2, g.y - 24 - k * 5, `rgba(255,255,255,${1 - k / 3})`);
      }
    } });
    desenhos.sort((a, b) => a.y - b.y).forEach((d) => d.f());

    // bolhas
    for (const b of this.bolhas) this.bolha(c, b);
    for (const h of this.coracoes) this.coracao(c, h.x, h.y, Math.min(1, h.vida));

    desenharLuz(c, this.aux, this.jogo.hora, modo);
  }

  private desenharSprite(c: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, espelhar: boolean): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!espelhar) {
      c.drawImage(spr, x, y);
      return;
    }
    c.save();
    c.translate(x + 32, y);
    c.scale(-1, 1);
    c.drawImage(spr, 0, 0);
    c.restore();
  }

  private sombra(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    c.fillStyle = 'rgba(20,12,36,0.28)';
    c.fillRect(Math.round(x - r), Math.round(y - 1), r * 2, 2);
    c.fillRect(Math.round(x - r + 2), Math.round(y - 2), r * 2 - 4, 4);
  }

  private bolha(c: CanvasRenderingContext2D, b: Bolha): void {
    const cores: Record<Bolha['tipo'], [string, string]> = { T: ['#3b82f6', '#bfdbfe'], G: ['#8b5cf6', '#ddd6fe'], '!': ['#ef4444', '#fecaca'], ok: ['#10b981', '#a7f3d0'], '+': ['#f59e0b', '#fde68a'] };
    const [cor, luz] = cores[b.tipo];
    const a = Math.min(1, b.vida * 2);
    c.globalAlpha = a;
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ret(c, x - 4, y - 6, 9, 13, '#1c1330'); ret(c, x - 6, y - 4, 13, 9, '#1c1330');
    ret(c, x - 3, y - 5, 7, 11, cor); ret(c, x - 5, y - 3, 11, 7, cor);
    ret(c, x - 3, y - 4, 2, 2, luz);
    const rot = b.tipo === 'ok' ? '+' : b.tipo;
    texto(c, rot, x - 1, y - 2, '#ffffff');
    c.globalAlpha = 1;
  }

  private coracao(c: CanvasRenderingContext2D, x: number, y: number, a: number): void {
    c.globalAlpha = a;
    const p = (dx: number, dy: number, w: number, h: number) => ret(c, Math.round(x) + dx, Math.round(y) + dy, w, h, '#f472b6');
    p(0, 0, 2, 1); p(3, 0, 2, 1); p(-1, 1, 7, 2); p(0, 3, 5, 1); p(1, 4, 3, 1); p(2, 5, 1, 1);
    c.globalAlpha = 1;
  }
}
