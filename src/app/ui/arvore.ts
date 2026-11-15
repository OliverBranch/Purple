import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { JogoService } from '../jogo.service';
import { ARESTAS, CUSTO, Efeito, FUTURO, NOS, No, corDoTopico, noPorId, nosFuturos, rotuloFuturo } from '../conteudo/arvore';
import { topicoPorId } from '../conteudo/topicos';
import { servicoPorId } from '../conteudo/servicos';
import { lojaPorId } from '../conteudo/mundo';

const NOME_TIPO: Record<string, string> = { inicio: 'Início', menor: 'Nó', ponte: 'Ponte', notavel: 'Notável', chave: 'Pedra angular' };

export function descreverEfeito(e: Efeito): string[] {
  const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;
  const out: string[] = [];
  if (e.servico) out.push(`Libera o serviço ${servicoPorId(e.servico).nome}`);
  if (e.ferramenta) out.push(`Libera a ferramenta ${FERRAMENTAS[e.ferramenta] ?? e.ferramenta} nos atendimentos`);
  if (e.loja) out.push(`Libera na loja: ${lojaPorId(e.loja)?.nome ?? e.loja}`);
  if (e.horas) out.push(`${pct(e.horas)} nas horas gastas nos atendimentos`);
  if (e.pag) out.push(`${pct(e.pag)} no pagamento dos contratos`);
  if (e.laudo) out.push(`${pct(e.laudo)} no peso do laudo`);
  if (e.retorno) out.push(`${pct(e.retorno)} na chance de o cliente ligar de volta`);
  if (e.insight) out.push(`${pct(e.insight)} Insight por acerto`);
  if (e.emergencia) out.push(`${pct(e.emergencia)} no valor das emergências`);
  if (e.mural) out.push(`+${e.mural} vaga no Mural`);
  if (e.sache) out.push(`+${e.sache} sachê por dia`);
  return out;
}

const FERRAMENTAS: Record<string, string> = { heur: 'Antivírus heurístico', portscan: 'Varredura de portas externa', sniffer: 'Analisador de pacotes' };

@Component({
  selector: 'app-arvore',
  imports: [DecimalPipe],
  template: `
  @if (jogo.s(); as e) {
  <div class="arvore-tela">
    <header class="arvore-topo">
      <div><h2>Árvore de Tecnologia</h2><small>{{ conquistados() }} de {{ total }} nós conquistados · Ato 1</small></div>
      <div class="arvore-status">
        <div class="rec"><span class="ico ico-insight"></span><b>{{ e.insight }}</b></div>
        @if (e.pesquisa; as p) {
          <div class="pesquisa-chip" [class.pronta]="p.pronta">
            <span>{{ p.pronta ? 'Pronta:' : 'Pesquisando:' }} <b>{{ nome(p.no) }}</b></span>
            @if (!p.pronta) { <div class="mini-barra"><div [style.width.%]="(p.prog / p.total) * 100"></div></div> }
            @else { <button class="botao primario pequeno" (click)="jogo.provaDoNo()">Fazer a prova</button> }
          </div>
        }
      </div>
      <button class="x" (click)="fechar()">×</button>
    </header>

    <svg class="arvore-svg" [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="xMidYMid meet"
      (pointerdown)="iniciarArraste($event)" (pointermove)="arrastar($event)" (pointerup)="soltar($event)" (pointerleave)="soltar($event)" (wheel)="roda($event)">
      <defs>
        <radialGradient id="arv-fundo" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#2a1d52"/><stop offset="100%" stop-color="#0b0716"/></radialGradient>
        <filter id="arv-brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect x="0" y="0" [attr.width]="w" [attr.height]="h" fill="url(#arv-fundo)"/>
      <g [attr.transform]="'translate(' + (w / 2 + tx()) + ',' + (h / 2 + ty()) + ') scale(' + zoom() + ')'">
        <!-- anéis decorativos -->
        @for (r of [120, 250, 405, 560, 700]; track r) { <circle cx="0" cy="0" [attr.r]="r" class="anel"/> }
        <!-- áreas futuras -->
        @for (f of futuros; track $index) { <circle [attr.cx]="f.x" [attr.cy]="f.y" [attr.r]="f.r" class="no-futuro"/> }
        @for (f of FUTURO; track f.nome; let i = $index) {
          <text [attr.x]="rotFut(i).x" [attr.y]="rotFut(i).y" class="rotulo-futuro" text-anchor="middle">{{ f.nome }}</text>
          <text [attr.x]="rotFut(i).x" [attr.y]="rotFut(i).y + 18" class="rotulo-futuro ato" text-anchor="middle">Ato {{ f.ato }}</text>
        }
        <!-- arestas -->
        @for (a of arestas(); track $index) {
          <line [attr.x1]="a.x1" [attr.y1]="a.y1" [attr.x2]="a.x2" [attr.y2]="a.y2" [attr.class]="'aresta ' + a.classe" [attr.stroke]="a.cor"/>
        }
        <!-- nós -->
        @for (n of nos(); track n.no.id) {
          <g class="no" [attr.class]="'no ' + n.estado + ' ' + n.no.tipo" [attr.transform]="'translate(' + n.no.x + ',' + n.no.y + ')'"
             (click)="selecionar(n.no.id, $event)" (pointerenter)="hover.set(n.no.id)" (pointerleave)="hover.set(null)">
            @if (n.estado === 'conquistado' || n.estado === 'pesquisando') { <circle [attr.r]="raio(n.no) + 8" [attr.fill]="n.cor" class="halo" filter="url(#arv-brilho)"/> }
            @if (n.no.tipo === 'chave') {
              <polygon [attr.points]="octogono(raio(n.no) + 5)" class="moldura" [attr.stroke]="n.cor"/>
            }
            @if (n.no.tipo === 'notavel') { <circle [attr.r]="raio(n.no) + 5" class="moldura" [attr.stroke]="n.cor"/> }
            <circle [attr.r]="raio(n.no)" class="miolo" [attr.fill]="n.estado === 'conquistado' || n.no.tipo === 'inicio' ? n.cor : '#1a1330'" [attr.stroke]="n.cor"/>
            @if (n.estado === 'pesquisando') {
              <circle [attr.r]="raio(n.no) + 3" class="progresso-no" [attr.stroke-dasharray]="arco(n.no)" [attr.stroke]="n.cor"/>
            }
            @if (n.no.tipo === 'inicio') { <text y="5" text-anchor="middle" class="icone-inicio">⌂</text> }
            @if (selecionado() === n.no.id) { <circle [attr.r]="raio(n.no) + 12" class="selecao"/> }
            @if (n.no.tipo === 'notavel' || n.no.tipo === 'chave' || n.no.tipo === 'inicio' || hover() === n.no.id || selecionado() === n.no.id || zoom() > 1.35) {
              <text [attr.y]="raio(n.no) + 22" text-anchor="middle" class="rotulo" [class.forte]="n.no.tipo !== 'menor' && n.no.tipo !== 'ponte'">{{ n.no.nome }}</text>
            }
          </g>
        }
      </g>
    </svg>

    <div class="arvore-zoom">
      <button (click)="ajustarZoom(1.25)">+</button><button (click)="ajustarZoom(0.8)">−</button><button (click)="centralizar()">⌂</button>
    </div>
    <div class="arvore-legenda">
      <span><i class="l conq"></i>Conquistado</span><span><i class="l disp"></i>Disponível</span><span><i class="l bloq"></i>Bloqueado</span>
      <small>Arraste para mover · roda do mouse para zoom</small>
    </div>

    @if (detalhe(); as d) {
      <aside class="janela arvore-detalhe" [style.--cor]="d.cor">
        <span class="etiqueta tipo-no">{{ tipoNome(d.no.tipo) }}</span>
        <h3>{{ d.no.nome }}</h3>
        @if (d.no.topico) { <small>{{ tema(d.no.topico) }}</small> }
        @if (d.no.lore) { <p class="lore">{{ d.no.lore }}</p> }
        @if (efeitos(d.no).length) { <ul class="efeitos">@for (x of efeitos(d.no); track $index) { <li>{{ x }}</li> }</ul> }
        @if (d.no.tipo !== 'inicio') {
          <div class="exige">
            <b>Conhecimento exigido</b>
            <p>{{ d.no.itens.length || 'Várias' }} {{ d.no.itens.length === 1 ? 'questão ligada' : 'questões ligadas' }} a este nó, de {{ tema(d.no.topico) }}{{ d.no.tipo === 'ponte' ? ' e do ramo vizinho' : '' }}. A prova sorteia {{ custo(d.no).questoes }} e exige {{ custo(d.no).minimo }} {{ custo(d.no).minimo === 1 ? 'acerto' : 'acertos' }}.</p>
            <div class="maestria-linha"><span class="faixa" [attr.data-faixa]="jogo.maestria(d.no.topico).faixa">{{ jogo.maestria(d.no.topico).faixa }}</span>
              <button class="botao pequeno" (click)="treinar(d.no.topico)">Treinar o tema</button></div>
          </div>
          <div class="custos"><div><small>Insight</small><b>{{ jaPago(d.no.id) ? 'pago' : custo(d.no).insight }}</b></div><div><small>Pesquisa</small><b>{{ custo(d.no).semanas }} sem</b></div></div>
        }
        @switch (d.estado) {
          @case ('conquistado') { <p class="ok">Conquistado</p> }
          @case ('pesquisando') {
            @if (e.pesquisa?.pronta) { <button class="botao primario largo" (click)="jogo.provaDoNo()">Fazer a prova de conceito</button> }
            @else { <p class="nota">Pesquisando... {{ (e.pesquisa!.prog / e.pesquisa!.total) * 100 | number: '1.0-0' }}%. O tempo corre enquanto você trabalha nos contratos.</p>
              <button class="botao pequeno" (click)="jogo.cancelarPesquisa()">Pausar pesquisa</button> }
          }
          @case ('disponivel') {
            @if (reestudo(d.no.id) > 0) { <p class="nota">Reestudo: nova tentativa em {{ reestudo(d.no.id) }} sem.</p> }
            @else if (e.pesquisa) { <p class="nota">Só dá para pesquisar um nó por vez.</p> }
            <button class="botao primario largo" [disabled]="!!e.pesquisa || reestudo(d.no.id) > 0 || (!jaPago(d.no.id) && e.insight < custo(d.no).insight)" (click)="jogo.pesquisar(d.no.id)">
              {{ jaPago(d.no.id) ? 'Retomar pesquisa' : 'Pesquisar' }}</button>
          }
          @case ('bloqueado') { <p class="nota">Conquiste um nó vizinho primeiro.</p> }
        }
      </aside>
    }
  </div>
  }`,
})
export class ArvoreComponent {
  readonly jogo = inject(JogoService);
  readonly w = 1600;
  readonly h = 1000;
  readonly total = NOS.length - 1;
  readonly FUTURO = FUTURO;
  readonly futuros = nosFuturos();
  readonly zoom = signal(0.95);
  readonly tx = signal(0);
  readonly ty = signal(0);
  readonly selecionado = signal<string | null>('garagem');
  readonly hover = signal<string | null>(null);
  private arraste: { x: number; y: number; tx: number; ty: number; moveu: boolean } | null = null;

  readonly nos = computed(() => {
    const e = this.jogo.s();
    return NOS.map((no) => {
      const conquistado = !!e?.arvore.includes(no.id);
      const pesquisando = e?.pesquisa?.no === no.id;
      const estado = conquistado ? 'conquistado' : pesquisando ? 'pesquisando' : this.jogo.noDisponivel(no.id) ? 'disponivel' : 'bloqueado';
      return { no, estado, cor: no.tipo === 'inicio' ? '#c4b5fd' : corDoTopico(no.topico) };
    });
  });

  readonly arestas = computed(() => {
    const e = this.jogo.s();
    const tem = (id: string) => !!e?.arvore.includes(id);
    return ARESTAS.map(([a, b]) => {
      const na = noPorId(a)!;
      const nb = noPorId(b)!;
      const classe = tem(a) && tem(b) ? 'conquistada' : tem(a) || tem(b) ? 'disponivel' : 'bloqueada';
      const cor = tem(a) && tem(b) ? corDoTopico(nb.topico || na.topico) : '#4a3b78';
      return { x1: na.x, y1: na.y, x2: nb.x, y2: nb.y, classe, cor };
    });
  });

  readonly conquistados = computed(() => (this.jogo.s()?.arvore.length ?? 1) - 1);
  readonly detalhe = computed(() => this.nos().find((n) => n.no.id === this.selecionado()) ?? null);

  nome(id: string): string { return noPorId(id)?.nome ?? id; }
  tema(t: string): string { return topicoPorId(t).nome; }
  tipoNome(t: string): string { return NOME_TIPO[t] ?? t; }
  custo(n: No) { return CUSTO[n.tipo]; }
  efeitos(n: No): string[] { return descreverEfeito(n.efeito); }
  jaPago(id: string): boolean { return !!this.jogo.estado?.pago.includes(id); }
  rotFut(i: number) { return rotuloFuturo(i); }
  reestudo(id: string): number {
    const e = this.jogo.estado;
    return e ? Math.max(0, (e.reestudo[id] ?? 0) - e.semana) : 0;
  }
  raio(n: No): number { return n.tipo === 'inicio' ? 24 : n.tipo === 'chave' ? 21 : n.tipo === 'notavel' ? 16 : 10; }
  octogono(r: number): string {
    return Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 4) * i + Math.PI / 8;
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
  }
  arco(n: No): string {
    const p = this.jogo.estado?.pesquisa;
    const c = 2 * Math.PI * (this.raio(n) + 3);
    const f = p ? p.prog / p.total : 0;
    return `${(c * f).toFixed(1)} ${c.toFixed(1)}`;
  }

  selecionar(id: string, ev: Event): void {
    ev.stopPropagation();
    if (this.arraste?.moveu) return;
    this.jogo.som.clique();
    this.selecionado.set(id);
  }

  treinar(t: string): void {
    this.jogo.treinar(t);
  }

  fechar(): void {
    this.jogo.som.clique();
    this.jogo.painel.set(null);
  }

  private escalaTela(ev: PointerEvent | WheelEvent): number {
    const el = ev.currentTarget as SVGSVGElement;
    const r = el.getBoundingClientRect();
    return Math.max(this.w / r.width, this.h / r.height);
  }

  iniciarArraste(ev: PointerEvent): void {
    this.arraste = { x: ev.clientX, y: ev.clientY, tx: this.tx(), ty: this.ty(), moveu: false };
  }

  arrastar(ev: PointerEvent): void {
    const a = this.arraste;
    if (!a) return;
    const k = this.escalaTela(ev);
    const dx = (ev.clientX - a.x) * k;
    const dy = (ev.clientY - a.y) * k;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      if (!a.moveu) (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
      a.moveu = true;
    }
    if (a.moveu) {
      this.tx.set(a.tx + dx);
      this.ty.set(a.ty + dy);
    }
  }

  soltar(_ev: PointerEvent): void {
    const a = this.arraste;
    setTimeout(() => {
      if (this.arraste === a) this.arraste = null;
    });
  }

  roda(ev: WheelEvent): void {
    ev.preventDefault();
    this.ajustarZoom(ev.deltaY < 0 ? 1.12 : 0.89);
  }

  ajustarZoom(f: number): void {
    const z = Math.max(0.45, Math.min(2.4, this.zoom() * f));
    const r = z / this.zoom();
    this.tx.set(this.tx() * r);
    this.ty.set(this.ty() * r);
    this.zoom.set(z);
  }

  centralizar(): void {
    this.zoom.set(0.95);
    this.tx.set(0);
    this.ty.set(0);
  }
}
