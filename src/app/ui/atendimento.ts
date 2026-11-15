import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JogoService } from '../jogo.service';
import { RetratoComponent } from './retrato';
import { Etapa, EtapaCampos, normalizar } from '../core/caso';
import { servicoPorId } from '../conteudo/servicos';
import { noPorId } from '../conteudo/arvore';

/** Bancada do atendimento: chamado, ferramentas, terminal, evidências, decisões e laudo. */
@Component({
  selector: 'app-atendimento',
  imports: [DecimalPipe, FormsModule, RetratoComponent],
  template: `
  @if (dados(); as d) {
  <div class="bancada" [class.laudo-modo]="d.c.fase === 'laudo'">
    <header class="bancada-topo">
      <div class="titulo-caso">
        <span class="etiqueta" [class.urgente]="d.emergencia">{{ d.emergencia ? 'Emergência' : d.servico }}</span>
        <h2>{{ d.c.titulo }}</h2>
        <small>{{ d.cliente }}</small>
      </div>
      <ol class="trilha-fases">
        @for (f of fases; track f.id) { <li [class.atual]="faseAtual(d.c.fase) === $index" [class.feita]="faseAtual(d.c.fase) > $index">{{ f.nome }}</li> }
      </ol>
      <div class="relogio" [class.estourou]="d.c.horas > d.c.horasPrazo">
        <small>Horas da visita</small>
        <b>{{ d.c.horas | number: '1.1-1' }} / {{ d.c.horasPrazo }} h</b>
        <div class="barra-h"><div [style.width.%]="(d.c.horas / d.c.horasPrazo) * 100"></div></div>
      </div>
      <button class="botao gato-ajuda" [disabled]="jogo.saches() <= 0 || d.c.fase === 'fim' || d.c.fase === 'verificar'" (click)="ajuda()" title="Um sachê chama o gato">
        <app-retrato [gato]="jogo.estado?.gato ?? null" [escala]="1.25" [girar]="false" /><span>Sachê ({{ jogo.saches() }})</span>
      </button>
    </header>
    @if (fala()) { <div class="fala-gato-caso">{{ fala() }}</div> }
    @if (flutuante(); as f) { <div class="flutuante">{{ f }}</div> }

    <div class="bancada-corpo">
      <!-- esquerda: chamado, perguntas, evidências -->
      <aside class="coluna-esq">
        <div class="chamado"><b>Chamado</b><p>{{ d.c.chamado }}</p></div>
        @if (d.c.fase === 'investigar') {
          <div class="bloco"><b>Perguntar ao cliente</b>
            @for (p of d.c.perguntas; track $index) {
              @if (p.feita) { <div class="resposta"><i>{{ p.p }}</i><span>{{ p.r }}</span></div> }
              @else { <button class="pergunta" (click)="jogo.perguntar($index)">{{ p.p }} <em>{{ p.horas }} h</em></button> }
            }
          </div>
        }
        <div class="bloco evidencias"><b>Evidências ({{ d.c.achadas.length }})</b>
          @for (id of d.c.achadas; track id) { <div class="evid">📌 {{ nomeEvid(id) }}</div> }
          @if (!d.c.achadas.length) { <small>Clique nas linhas suspeitas no terminal para marcá-las.</small> }
          @if (d.c.falsas) { <small class="falsas">{{ d.c.falsas }} {{ d.c.falsas === 1 ? 'marcação' : 'marcações' }} em linha inocente</small> }
        </div>
      </aside>

      <!-- centro: terminal ou etapa -->
      <main class="centro">
        @if (d.c.fase === 'investigar') {
          <div class="crt">
            @if (vista(); as f) {
              <div class="crt-titulo">C:\\&gt; {{ f.nome }}</div>
              @for (l of f.linhas; track $index) {
                <button class="crt-linha" [class.marcada]="marcada(f.id, $index)" (click)="jogo.marcar(f.id, $index)">{{ l.t }}</button>
              }
              <div class="crt-cursor">_</div>
            } @else {
              <div class="crt-vazio">
                <p>Escolha uma ferramenta à direita.</p>
                <p>Cada ferramenta gasta horas da visita. Clique nas linhas suspeitas para marcar como evidência; linhas inocentes marcadas contam contra.</p>
              </div>
            }
          </div>
          <div class="acao-centro">
            <button class="botao primario" [disabled]="!d.c.achadas.length" (click)="jogo.concluirInvestigacao()">Concluir investigação e resolver</button>
          </div>
        } @else if (d.c.fase === 'verificar') {
          <div class="etapa-card">
            <span class="etiqueta">Antes do laudo</span>
            <h3>Verificar o trabalho?</h3>
            <p>{{ d.c.verificacao.texto }} custa {{ d.c.verificacao.horas }} h. Sem verificação, se algo ficou para trás, o cliente liga de volta e a reputação cai.</p>
            <div class="acoes"><button class="botao" (click)="jogo.decidirVerificacao(false)">Pular</button><button class="botao primario" (click)="jogo.decidirVerificacao(true)">Verificar (+{{ d.c.verificacao.horas }} h)</button></div>
          </div>
        } @else if (d.c.fase === 'fim') {
          <div class="etapa-card fim">
            <span class="etiqueta">Atendimento concluído</span>
            <h3>Laudo pronto</h3>
            @if (d.c.verificacao.feita) { <p class="verificado">✔ {{ d.c.verificacao.resultado }}</p> }
            <p>{{ d.c.horas | number: '1.1-1' }} horas de visita. Entregue o laudo para receber a avaliação de {{ d.cliente }}.</p>
            <button class="botao primario" (click)="jogo.entregar()">Entregar laudo</button>
          </div>
        } @else if (etapa(); as e) {
          <div class="etapa-card" [class.papel]="e.laudo">
            <div class="etapa-cab"><span class="etiqueta">{{ e.laudo ? 'Laudo' : 'Resolução' }} · {{ e.titulo }}</span><small>{{ posicao(d.c) }}</small></div>
            <p class="etapa-pergunta">{{ e.pergunta }}</p>
            @switch (e.tipo) {
              @case ('escolha') {
                <div class="alternativas">
                  @for (o of e.opcoes; track $index) {
                    <button class="alt" [disabled]="respondida() || (e.removidas ?? []).includes($index)" [class.removida]="(e.removidas ?? []).includes($index)"
                      [class.certa]="respondida() && $index === e.correta" [class.errada]="respondida() && e.resp === $index && $index !== e.correta"
                      (click)="escolher($index)"><span class="letra">{{ letras[$index] }}</span><span>{{ o }}</span></button>
                  }
                </div>
              }
              @case ('multi') {
                <div class="alternativas">
                  @for (o of e.opcoes; track $index) {
                    <button class="alt" [class.mono]="e.mono" [class.sel]="multi().includes($index)" [disabled]="respondida()"
                      [class.certa]="respondida() && o.ok" [class.errada]="respondida() && multi().includes($index) && !o.ok" [class.faltou]="respondida() && o.ok && !multi().includes($index)"
                      (click)="alternarMulti($index)"><span class="caixa">{{ multi().includes($index) ? '■' : '□' }}</span><span>{{ o.t }}</span></button>
                  }
                </div>
                @if (!respondida()) { <div class="acoes"><button class="botao primario" (click)="confirmarMulti()">Confirmar</button></div> }
              }
              @case ('ordem') {
                <div class="ordem">
                  <div class="escolhidos">
                    @for (k of ordem(); track $index; let n = $index) {
                      <div class="chip" [class.certa]="respondida() && e.certa[n] === k" [class.errada]="respondida() && e.certa[n] !== k"><b>{{ n + 1 }}</b> {{ e.opcoes[k] }}</div>
                    }
                    @if (!respondida()) { @for (v of vagasOrdem(e); track $index) { <div class="chip vazio">{{ ordem().length + $index + 1 }}</div> } }
                  </div>
                  @if (!respondida()) {
                    <div class="disponiveis">@for (o of e.opcoes; track $index) { @if (!ordem().includes($index)) { <button class="alt curto" (click)="addOrdem($index)">{{ o }}</button> } }</div>
                    <div class="acoes">
                      @if (ordem().length) { <button class="botao pequeno" (click)="desfazer()">Desfazer</button> }
                      <button class="botao primario" [disabled]="ordem().length < e.certa.length" (click)="confirmarOrdem()">Confirmar sequência</button>
                    </div>
                  } @else if ((e.nota ?? 0) < 0.99) {
                    <p class="nota">Sequência correta: {{ sequenciaCerta(e) }}</p>
                  }
                </div>
              }
              @case ('campos') {
                <table class="tabela-campos">
                  <thead><tr>@for (h of e.cab; track $index) { <th>{{ h }}</th> }</tr></thead>
                  <tbody>
                    @for (l of e.linhas; track $index; let i = $index) {
                      <tr>
                        @for (r of l.rotulo; track $index) { <td class="rotulo">{{ r }}</td> }
                        @for (cp of l.campos; track $index; let j = $index) {
                          <td [class.ok]="respondida() && campoOk(e, i, j)" [class.no]="respondida() && !campoOk(e, i, j)">
                            @if (cp.opcoes) {
                              <select [disabled]="respondida()" [ngModel]="campos()[i]?.[j] ?? ''" (ngModelChange)="setCampo(i, j, $event)">
                                <option value="" disabled>escolha</option>
                                @for (o of cp.opcoes; track o) { <option [value]="o">{{ o }}</option> }
                              </select>
                            } @else {
                              <input [disabled]="respondida()" [placeholder]="cp.dica ?? ''" [ngModel]="campos()[i]?.[j] ?? ''" (ngModelChange)="setCampo(i, j, $event)" />
                            }
                            @if (respondida() && !campoOk(e, i, j)) { <small class="gabarito">{{ cp.aceita[0] }}</small> }
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
                @if (!respondida()) { <div class="acoes"><button class="botao primario" [disabled]="!camposCompletos(e)" (click)="confirmarCampos()">Confirmar</button></div> }
              }
              @case ('ce') {
                <div class="afirmacoes">
                  @for (a of e.afirmacoes; track $index; let i = $index) {
                    <div class="afirmacao" [class.ok]="respondida() && ce()[i] === a.certo" [class.no]="respondida() && ce()[i] !== a.certo">
                      <p>{{ a.t }}</p>
                      <div class="ce-botoes">
                        <button class="botao pequeno" [class.sel]="ce()[i] === true" [disabled]="respondida()" (click)="setCe(i, true)">Certo</button>
                        <button class="botao pequeno" [class.sel]="ce()[i] === false" [disabled]="respondida()" (click)="setCe(i, false)">Errado</button>
                      </div>
                      @if (respondida()) { <small>{{ a.certo ? 'Certo' : 'Errado' }}. {{ a.por }}</small> }
                    </div>
                  }
                </div>
                @if (!respondida()) { <div class="acoes"><button class="botao primario" [disabled]="!ceCompleto(e)" (click)="confirmarCe()">Assinar</button></div> }
              }
            }
            @if (respondida()) {
              <div class="retorno" [class.ok]="(e.nota ?? 0) >= 0.99" [class.parcial]="(e.nota ?? 0) > 0 && (e.nota ?? 0) < 0.99">
                <div class="veredito">{{ (e.nota ?? 0) >= 0.99 ? 'Correto.' : (e.nota ?? 0) > 0 ? 'Parcialmente certo.' : 'Errado.' }}
                  @if ((e.nota ?? 0) < 0.99 && e.horasErro) { <span class="neutro">retrabalho: +{{ e.horasErro }} h</span> }
                </div>
                @if (e.explicacao) { <p>{{ e.explicacao }}</p> }
                <div class="acoes"><button class="botao primario" (click)="continuar()">Continuar</button></div>
              </div>
            }
          </div>
        }
      </main>

      <!-- direita: ferramentas -->
      <aside class="coluna-dir">
        <b>Ferramentas</b>
        @for (f of d.c.ferramentas; track f.id) {
          <button class="ferr" [class.usada]="f.usada" [class.aberta]="d.c.vista === f.id" [class.bloq]="f.requer && !jogo.temNo(f.requer)"
            [disabled]="(f.requer && !jogo.temNo(f.requer)) || (d.c.fase !== 'investigar' && !f.usada)" (click)="abrir(f.id)">
            <span class="ferr-nome">{{ f.nome }}</span>
            <small>{{ f.requer && !jogo.temNo(f.requer) ? 'Requer o nó ' + nomeNo(f.requer) : f.desc }}</small>
            <em>{{ f.usada ? 'visto' : (f.horas * mult() | number: '1.1-1') + ' h' }}</em>
          </button>
        }
        @if (d.c.fase !== 'investigar') { <small class="nota">Na resolução, dá para reler o que você já abriu.</small> }
      </aside>
    </div>

    @if (d.c.fase !== 'investigar' && vista() && revendo()) {
      <div class="veu" (click)="revendo.set(false)">
        <div class="crt flutua" (click)="$event.stopPropagation()">
          <div class="crt-titulo">C:\\&gt; {{ vista()!.nome }} <button class="x" (click)="revendo.set(false)">×</button></div>
          @for (l of vista()!.linhas; track $index) { <div class="crt-linha" [class.marcada]="marcada(vista()!.id, $index)">{{ l.t }}</div> }
        </div>
      </div>
    }
    @if (jogo.estado && jogo.estado.tutorial < 3 && d.c.fase === 'investigar') {
      <div class="tutorial-caso">Abra as ferramentas, leia a saída como um técnico leria e clique nas linhas suspeitas. Pergunte ao cliente quando fizer sentido. Quando tiver evidências, conclua a investigação.</div>
    }
  </div>
  }`,
})
export class AtendimentoComponent {
  readonly jogo = inject(JogoService);
  readonly letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  readonly fases = [{ id: 'investigar', nome: 'Investigação' }, { id: 'resolver', nome: 'Resolução' }, { id: 'laudo', nome: 'Laudo' }];
  readonly fala = signal('');
  readonly flutuante = signal('');
  readonly revendo = signal(false);
  readonly multi = signal<number[]>([]);
  readonly ordem = signal<number[]>([]);
  readonly campos = signal<string[][]>([]);
  readonly ce = signal<boolean[]>([]);
  private chaveEtapa = '';

  readonly dados = computed(() => {
    const e = this.jogo.s();
    const caso = e?.caso;
    if (!e || !caso || e.avaliacao) return null;
    return { c: caso.contrato.caso, cliente: caso.contrato.cliente.nome, servico: servicoPorId(caso.contrato.servico).nome, emergencia: caso.contrato.emergencia };
  }, { equal: () => false });
  readonly vista = computed(() => {
    const c = this.dados()?.c;
    return c?.vista ? (c.ferramentas.find((f) => f.id === c.vista) ?? null) : null;
  }, { equal: () => false });
  readonly etapa = computed<Etapa | null>(() => {
    const c = this.dados()?.c;
    return c ? (c.etapas[c.etapa] ?? null) : null;
  }, { equal: () => false });
  readonly respondida = computed(() => this.etapa()?.nota !== undefined);
  readonly mult = computed(() => {
    this.jogo.versao();
    return this.jogo.multHorasFerramenta();
  });

  constructor() {
    effect(() => {
      const c = this.dados()?.c;
      const k = c ? `${c.titulo}:${c.fase}:${c.etapa}` : '';
      if (k === this.chaveEtapa) return;
      this.chaveEtapa = k;
      const e = this.etapa();
      this.multi.set(e?.tipo === 'multi' ? (e.resp ?? []) : []);
      this.ordem.set(e?.tipo === 'ordem' ? (e.resp ?? []) : []);
      this.campos.set(e?.tipo === 'campos' ? (e.resp ?? e.linhas.map((l) => l.campos.map(() => ''))) : []);
      this.ce.set(e?.tipo === 'ce' ? (e.resp ?? []) : []);
      this.fala.set('');
    });
    effect(() => {
      const r = this.jogo.retornoCaso();
      if (!r) return;
      this.flutuante.set(r.texto);
      setTimeout(() => this.flutuante.set(''), 1800);
    });
  }

  faseAtual(f: string): number {
    return f === 'investigar' ? 0 : f === 'resolver' || f === 'verificar' ? 1 : 2;
  }
  posicao(c: { etapas: Etapa[]; etapa: number }): string {
    const grupo = c.etapas.filter((e) => !!e.laudo === !!c.etapas[c.etapa]?.laudo);
    return `${grupo.indexOf(c.etapas[c.etapa]!) + 1} de ${grupo.length}`;
  }
  nomeEvid(id: string): string {
    return this.dados()?.c.evidencias.find((e) => e.id === id)?.nome ?? id;
  }
  nomeNo(id: string): string { return noPorId(id)?.nome ?? id; }
  marcada(f: string, i: number): boolean { return !!this.dados()?.c.marcadas.includes(`${f}:${i}`); }
  abrir(id: string): void {
    this.jogo.usarFerramenta(id);
    if (this.dados()?.c.fase !== 'investigar') this.revendo.set(true);
  }
  ajuda(): void {
    const t = this.jogo.ajudaDoGato();
    if (t) this.fala.set(t);
  }

  private etapaAtual<T extends Etapa['tipo']>(tipo: T): Extract<Etapa, { tipo: T }> | null {
    const e = this.etapa();
    return e && e.tipo === tipo ? (e as Extract<Etapa, { tipo: T }>) : null;
  }

  escolher(i: number): void {
    const e = this.etapaAtual('escolha');
    if (!e || this.respondida()) return;
    e.resp = i;
    this.jogo.responderEtapa();
  }
  alternarMulti(i: number): void {
    this.jogo.som.clique();
    this.multi.update((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));
  }
  confirmarMulti(): void {
    const e = this.etapaAtual('multi');
    if (!e) return;
    e.resp = this.multi();
    this.jogo.responderEtapa();
  }
  addOrdem(i: number): void {
    const e = this.etapaAtual('ordem');
    if (!e || this.ordem().length >= e.certa.length) return;
    this.jogo.som.clique();
    this.ordem.update((o) => [...o, i]);
  }
  desfazer(): void { this.ordem.update((o) => o.slice(0, -1)); }
  vagasOrdem(e: Etapa): number[] { return e.tipo === 'ordem' ? Array(Math.max(0, e.certa.length - this.ordem().length)).fill(0) : []; }
  sequenciaCerta(e: Etapa): string { return e.tipo === 'ordem' ? e.certa.map((k) => e.opcoes[k]).join(' → ') : ''; }
  confirmarOrdem(): void {
    const e = this.etapaAtual('ordem');
    if (!e) return;
    e.resp = this.ordem();
    this.jogo.responderEtapa();
  }
  setCampo(i: number, j: number, v: string): void {
    this.campos.update((c) => c.map((l, a) => (a === i ? l.map((x, b) => (b === j ? v : x)) : l)));
  }
  camposCompletos(e: EtapaCampos): boolean {
    return e.linhas.every((l, i) => l.campos.every((_, j) => (this.campos()[i]?.[j] ?? '').trim() !== ''));
  }
  campoOk(e: EtapaCampos, i: number, j: number): boolean {
    const v = normalizar(e.resp?.[i]?.[j] ?? '');
    return !!e.linhas[i]?.campos[j]?.aceita.some((a) => normalizar(a) === v);
  }
  confirmarCampos(): void {
    const e = this.etapaAtual('campos');
    if (!e) return;
    e.resp = this.campos();
    this.jogo.responderEtapa();
  }
  setCe(i: number, v: boolean): void {
    this.jogo.som.clique();
    this.ce.update((c) => { const n = [...c]; n[i] = v; return n; });
  }
  ceCompleto(e: Etapa): boolean {
    return e.tipo === 'ce' && e.afirmacoes.every((_, i) => typeof this.ce()[i] === 'boolean');
  }
  confirmarCe(): void {
    const e = this.etapaAtual('ce');
    if (!e) return;
    e.resp = this.ce();
    this.jogo.responderEtapa();
  }
  continuar(): void {
    this.jogo.proximaEtapa();
  }
}
