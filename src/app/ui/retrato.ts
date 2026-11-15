import { Component, ElementRef, OnDestroy, afterNextRender, input, viewChild } from '@angular/core';
import { Aparencia, GatoDef } from '../core/tipos';
import { spritePessoa, Dir } from '../arte/pessoa';
import { spriteGato } from '../arte/gato';
import { ctx2d } from '../arte/pixel';

/** Prévia animada de um personagem ou gato, ampliada sem suavização. */
@Component({
  selector: 'app-retrato',
  template: `<canvas #c [width]="tam" [height]="tam" [style.width.px]="tam * escala()" [style.height.px]="tam * escala()"></canvas>`,
  styles: [`canvas{image-rendering:pixelated;display:block}`],
})
export class RetratoComponent implements OnDestroy {
  readonly pessoa = input<Aparencia | null>(null);
  readonly gato = input<GatoDef | null>(null);
  readonly marca = input('#8b5cf6');
  readonly escala = input(6);
  readonly girar = input(true);
  readonly tam = 32;
  private c = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private raf = 0;

  constructor() {
    afterNextRender(() => {
      const loop = (ms: number) => {
        this.desenhar(ms / 1000);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }

  private desenhar(t: number): void {
    const c = ctx2d(this.c().nativeElement);
    c.clearRect(0, 0, 32, 32);
    const p = this.pessoa();
    const g = this.gato();
    if (p) {
      const dirs: Dir[] = ['baixo', 'lado', 'cima', 'lado'];
      const ciclo = Math.floor(t / 2.2) % 4;
      const dir = this.girar() ? (dirs[ciclo] as Dir) : 'baixo';
      const andando = this.girar() && dir === 'lado';
      const espelhar = ciclo === 3;
      const spr = spritePessoa(p, dir, andando ? Math.floor(t * 7) % 4 : 0, Math.sin(t * 1.9) > 0.97, this.marca());
      this.pintar(c, spr, espelhar);
    } else if (g) {
      const ciclo = Math.floor(t / 2.6) % 3;
      const pose = !this.girar() ? 'sentar' : ciclo === 0 ? 'sentar' : ciclo === 1 ? 'andar' : 'dormir';
      const fr = pose === 'andar' ? Math.floor(t * 7) % 4 : Math.floor(t * 0.8) % 2;
      this.pintar(c, spriteGato(g, pose, fr, Math.sin(t * 1.4) > 0.97), false);
    }
  }

  private pintar(c: CanvasRenderingContext2D, spr: HTMLCanvasElement, espelhar: boolean): void {
    if (!espelhar) {
      c.drawImage(spr, 0, 0);
      return;
    }
    c.save();
    c.translate(32, 0);
    c.scale(-1, 1);
    c.drawImage(spr, 0, 0);
    c.restore();
  }
}
