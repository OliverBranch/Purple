import { Component, computed, effect, inject, signal } from '@angular/core';
import { JogoService } from '../jogo.service';
import { RetratoComponent } from './retrato';
import { Item } from '../core/tipos';
import { ResultadoResposta } from '../core/estudo';
import { topicoPorId } from '../conteudo/topicos';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

@Component({
  selector: 'app-desafio',
  imports: [RetratoComponent],
  template: `
  @if (jogo.sessao(); as s) {
    @if (item(); as it) {
      <div class="veu">
        <div class="janela desafio">
          <header class="cab-desafio">
            <div>
              <span class="etiqueta">{{ s.titulo }}</span>
              <span class="topico">{{ nomeTopico(it.topico) }} · {{ ['', 'fácil', 'média', 'difícil'][it.dif] }}</span>
            </div>
            <div class="direita">
              @if (s.itens.length > 1) { <span class="contador">{{ s.i + 1 }} / {{ s.itens.length }}</span> }
              @if (s.tipo !== 'no' && !respondido()) { <button class="x" title="Sair" (click)="jogo.abandonarSessao()">×</button> }
            </div>
          </header>
          @if (s.itens.length > 1) {
            <div class="trilha">@for (x of s.itens; track $index) { <span [class.ok]="s.respostas[$index] === true" [class.no]="s.respostas[$index] === false" [class.atual]="$index === s.i"></span> }</div>
          }
          @if (s.intro && s.i === 0) { <p class="intro">{{ s.intro }}</p> }

          <div class="enunciado" [class.mono]="it.formato === 'erro'">{{ it.enunciado }}</div>

          @switch (it.formato) {
            @case ('mcq') {
              <div class="alternativas">
                @for (k of ordem(); track k; let n = $index) {
                  <button class="alt" [disabled]="respondido() || removidas().has(k)"
                    [class.removida]="removidas().has(k)" [class.certa]="respondido() && k === it.correta" [class.errada]="respondido() && escolha() === k && k !== it.correta"
                    (click)="responderMcq(k)"><span class="letra">{{ letras[n] }}</span><span>{{ it.opcoes[k] }}</span></button>
                }
              </div>
            }
            @case ('ce') {
              <div class="ce">
                <button class="alt grande" [disabled]="respondido()" [class.certa]="respondido() && it.correta === 1" [class.errada]="respondido() && escolha() === 1 && it.correta !== 1" (click)="responderMcq(1)">Certo</button>
                <button class="alt grande" [disabled]="respondido()" [class.certa]="respondido() && it.correta === 0" [class.errada]="respondido() && escolha() === 0 && it.correta !== 0" (click)="responderMcq(0)">Errado</button>
              </div>
            }
            @case ('erro') {
              <div class="linhas">
                @for (l of it.opcoes; track $index) {
                  <button class="linha-log" [disabled]="respondido() || removidas().has($index)" [class.removida]="removidas().has($index)"
                    [class.certa]="respondido() && $index === it.correta" [class.errada]="respondido() && escolha() === $index && $index !== it.correta"
                    (click)="responderMcq($index)"><span class="num">{{ $index + 1 }}</span>{{ l }}</button>
                }
              </div>
            }
            @case ('ordem') {
              <div class="ordem">
                <div class="escolhidos">
                  @for (k of montada(); track k; let n = $index) {
                    <div class="chip" [class.certa]="respondido() && k === n" [class.errada]="respondido() && k !== n"><b>{{ n + 1 }}</b> {{ it.opcoes[k] }}</div>
                  }
                  @if (!respondido()) { @for (v of vagas(); track $index) { <div class="chip vazio">{{ montada().length + $index + 1 }}</div> } }
                </div>
                @if (!respondido()) {
                  <div class="disponiveis">
                    @for (k of ordem(); track k) { @if (!montada().includes(k)) { <button class="alt curto" (click)="escolherOrdem(k)">{{ it.opcoes[k] }}</button> } }
                  </div>
                  @if (montada().length) { <button class="botao pequeno" (click)="desfazerOrdem()">Desfazer</button> }
                } @else if (!acertou()) {
                  <p class="nota">Ordem correta: {{ it.opcoes.join(' → ') }}</p>
                }
              </div>
            }
          }

          @if (respondido()) {
            <div class="retorno" [class.ok]="acertou()">
              <div class="veredito">{{ acertou() ? frasesAcerto[(s.i + it.id.length) % frasesAcerto.length] : frasesErro[(s.i + it.id.length) % frasesErro.length] }}
                @if (resultado(); as r) {
                  @if (r.insight > 0) { <span class="ganho">+{{ r.insight }} Insight</span> }
                  @if (r.consolidada) { <span class="ganho">lição consolidada</span> }
                  @if (r.adiantado && acertou()) { <span class="neutro">treino adiantado, a revisão continua agendada</span> }
                }
              </div>
              <p>{{ it.explicacao }}</p>
              <small class="ref">Referência: {{ it.ref }}</small>
              @if (!acertou()) { <small class="ref">Guardado no Caderno de Erros. Volta para revisão amanhã.</small> }
              <div class="acoes"><button class="botao primario" (click)="continuar()">{{ s.i + 1 < s.itens.length ? 'Próxima' : 'Continuar' }}</button></div>
            </div>
          } @else if (s.tipo !== 'simulado') {
            <div class="rodape-desafio">
              <button class="botao gato-dica" [disabled]="!podeDica()" (click)="dica()" title="Um sachê chama o gato">
                <app-retrato [gato]="jogo.estado?.gato ?? null" [escala]="1.5" [girar]="false" />
                <span>Sachê ({{ jogo.saches() }})</span>
              </button>
              @if (gatoFala()) { <span class="fala-gato">{{ gatoFala() }}</span> }
            </div>
          }
        </div>
      </div>
    }
  }`,
})
export class DesafioComponent {
  readonly jogo = inject(JogoService);
  readonly letras = LETRAS;
  readonly frasesAcerto = ['Na mosca.', 'Isso aí.', 'Exatamente.', 'Correto, e sem consultar a revista.', 'Certo. O sobrinho ficaria orgulhoso.'];
  readonly frasesErro = ['Não foi dessa vez.', 'Quase.', 'Errou, mas agora sabe.', 'Não. Mas o Caderno lembra por você.'];

  readonly escolha = signal<number | null>(null);
  readonly resultado = signal<ResultadoResposta | null>(null);
  readonly removidas = signal<Set<number>>(new Set());
  readonly montada = signal<number[]>([]);
  readonly ordem = signal<number[]>([]);
  readonly gatoFala = signal('');
  private usouDica = false;
  private chave = '';

  readonly item = computed<Item | null>(() => {
    const s = this.jogo.sessao();
    return s ? (s.itens[s.i] ?? null) : null;
  });

  readonly respondido = computed(() => this.resultado() !== null);
  readonly acertou = computed(() => {
    const s = this.jogo.sessao();
    return !!s && s.respostas[s.i] === true;
  });
  readonly vagas = computed(() => {
    const it = this.item();
    return it ? Array(Math.max(0, it.opcoes.length - this.montada().length)).fill(0) : [];
  });

  constructor() {
    effect(() => {
      const s = this.jogo.sessao();
      const it = this.item();
      const k = s && it ? `${s.inicio}:${s.i}:${it.id}` : '';
      if (k === this.chave) return;
      this.chave = k;
      this.escolha.set(null);
      this.resultado.set(null);
      this.removidas.set(new Set());
      this.montada.set([]);
      this.gatoFala.set('');
      this.usouDica = false;
      if (it) {
        const idx = it.opcoes.map((_, i) => i);
        // embaralha a apresentação para não decorar posição
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idx[i], idx[j]] = [idx[j] as number, idx[i] as number];
        }
        this.ordem.set(idx);
      }
    });
  }

  nomeTopico(id: string): string {
    return topicoPorId(id).nome;
  }

  podeDica(): boolean {
    const it = this.item();
    if (!it || this.respondido() || this.jogo.saches() <= 0) return false;
    if (it.formato === 'ce') return false;
    if (it.formato === 'ordem') return this.montada().length === 0;
    return it.opcoes.length - this.removidas().size > 2;
  }

  dica(): void {
    const it = this.item();
    if (!it || !this.podeDica() || !this.jogo.usarSache()) return;
    this.usouDica = true;
    const nome = this.jogo.estado?.gato.nome ?? 'O gato';
    if (it.formato === 'ordem') {
      this.montada.set([0]);
      this.gatoFala.set(`${nome} empurrou o primeiro item para o lugar certo.`);
      return;
    }
    const erradas = it.opcoes.map((_, i) => i).filter((i) => i !== it.correta && !this.removidas().has(i));
    const k = erradas[Math.floor(Math.random() * erradas.length)];
    if (k === undefined) return;
    this.removidas.update((s) => new Set([...s, k]));
    this.gatoFala.set(`${nome} derrubou uma ${it.formato === 'erro' ? 'linha' : 'alternativa'} da mesa.`);
  }

  responderMcq(k: number): void {
    const it = this.item();
    if (!it || this.respondido()) return;
    this.escolha.set(k);
    this.resultado.set(this.jogo.responder(k === it.correta, this.usouDica));
  }

  escolherOrdem(k: number): void {
    const it = this.item();
    if (!it || this.respondido()) return;
    this.jogo.som.clique();
    const m = [...this.montada(), k];
    this.montada.set(m);
    if (m.length === it.opcoes.length) {
      const ok = m.every((v, i) => v === i);
      this.resultado.set(this.jogo.responder(ok, this.usouDica));
    }
  }

  desfazerOrdem(): void {
    this.jogo.som.clique();
    this.montada.update((m) => m.slice(0, -1));
  }

  continuar(): void {
    this.jogo.som.clique();
    this.jogo.avancar();
  }
}
