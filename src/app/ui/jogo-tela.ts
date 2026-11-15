import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JogoService, Painel } from '../jogo.service';
import { ArvoreComponent } from './arvore';
import { AtendimentoComponent } from './atendimento';
import { noPorId } from '../conteudo/arvore';
import { CenaComponent } from './cena';
import { DesafioComponent } from './desafio';
import { RetratoComponent } from './retrato';
import { CUSTO_MENSAL, META_CAIXA, META_CASOS, dataDe, podeFazerSimulado } from '../core/sim';
import { LOJA, MESES, itemPorId, itensDoTopico } from '../conteudo/mundo';
import { AVALIADORES, CRITERIOS, SERVICOS, servicoPorId } from '../conteudo/servicos';
import { TOPICOS, topicoPorId } from '../conteudo/topicos';
import { CORES_MARCA } from '../arte/pixel';
import { Avaliacao, Contrato, Item } from '../core/tipos';

@Component({
  selector: 'app-jogo-tela',
  imports: [CenaComponent, DesafioComponent, RetratoComponent, ArvoreComponent, AtendimentoComponent, DecimalPipe, FormsModule],
  template: `
  @if (jogo.s(); as e) {
  <div class="jogo" [style.--marca]="marca()">
    <!-- barra superior -->
    <header class="hud">
      <div class="empresa">
        <app-retrato [pessoa]="e.fundador" [marca]="marca()" [escala]="1.25" [girar]="false" />
        <div><b>{{ e.empresa }}</b><small>{{ e.nomeFundador }}</small></div>
      </div>
      <div class="data"><span class="ano">{{ data().ano }}</span><span>{{ meses[data().mes - 1] }} · sem {{ data().sem }}</span></div>
      <div class="recursos">
        <div class="rec" title="Caixa"><span class="ico ico-dinheiro"></span><b [class.negativo]="e.dinheiro < 0">R$ {{ e.dinheiro | number: '1.0-0' }}</b></div>
        <div class="rec" title="Reputação"><span class="ico ico-rep"></span><b>{{ e.reputacao }}</b></div>
        <div class="rec" title="Insight: só vem de acertar desafios"><span class="ico ico-insight"></span><b>{{ e.insight }}</b></div>
      </div>
      @if (e.pesquisa; as p) {
        <button class="pesquisa-hud" [class.pronta]="p.pronta" (click)="p.pronta && !e.caso ? jogo.provaDoNo() : abrir('arvore')" [title]="p.pronta ? 'Fazer a prova de conceito' : 'Abrir a árvore'">
          <span class="ico ico-arvore"></span>
          <span class="txt"><small>{{ p.pronta ? 'Prova pronta!' : 'Pesquisando' }}</small><b>{{ nomeNo(p.no) }}</b></span>
          @if (!p.pronta) { <span class="mini-barra"><span [style.width.%]="(p.prog / p.total) * 100"></span></span> }
        </button>
      }
      <div class="velocidade">
        @for (v of [0, 1, 2, 4]; track v) {
          <button [class.sel]="jogo.velocidade() === v" (click)="vel(v)" [title]="v === 0 ? 'Pausar' : v + 'x'">{{ v === 0 ? '❚❚' : '▶'.repeat(v === 4 ? 3 : v) }}</button>
        }
      </div>
    </header>

    <main class="area">
      <div class="moldura-cena">
        <app-cena />
        @if (jogo.velocidade() === 0 && !jogo.painel() && !jogo.sessao() && !e.caso) {
          <div class="selo-pausa">PAUSADO</div>
        }
        @if (dicaTutorial(); as d) { <div class="tutorial"><app-retrato [gato]="e.gato" [escala]="1.5" [girar]="false" /><span>{{ d }}</span></div> }
        @if (toast(); as t) { <div class="toast">{{ t }}</div> }
      </div>

    </main>

    <!-- barra inferior -->
    <nav class="doca">
      @for (b of botoes; track b.id) {
        <button class="doca-btn" [class.sel]="jogo.painel() === b.id" (click)="abrir(b.id)">
          <span class="ico" [class]="'ico ico-' + b.id"></span><span>{{ b.nome }}</span>
          @if (b.id === 'mural' && e.mural.length) { <i class="badge">{{ e.mural.length }}</i> }
          @if (b.id === 'caderno' && vencidos() > 0) { <i class="badge">{{ vencidos() }}</i> }
        </button>
      }
    </nav>

    <!-- painéis -->
    @if (jogo.painel() === 'arvore') { <app-arvore /> }
    @if (jogo.painel(); as p) { @if (p !== 'arvore') {
      <div class="veu" (click)="fechar()">
        <div class="janela painel" (click)="$event.stopPropagation()">
          <header class="cab-painel"><h2>{{ tituloPainel(p) }}</h2><button class="x" (click)="fechar()">×</button></header>
          <div class="corpo-painel">
          @switch (p) {
            @case ('mural') {
              @if (e.caso) { <p class="aviso-painel">Você já está num atendimento. Termine antes de aceitar outro.</p> }
              @if (!e.mural.length) { <p class="vazio">Nenhum contrato no momento. O telefone vai tocar. Provavelmente.</p> }
              <div class="cartoes">
                @for (k of e.mural; track k.id) {
                  <article class="cartao" [class.urgente]="k.emergencia">
                    <header><span class="etiqueta" [class.urgente]="k.emergencia">{{ k.emergencia ? 'Emergência' : servico(k.servico).nome }}</span><span class="estrelas">{{ '★'.repeat(k.dif) }}{{ '☆'.repeat(3 - k.dif) }}</span></header>
                    <h3>{{ k.cliente.nome }}</h3>
                    <small class="setor">{{ k.cliente.setor }} · falar com {{ k.cliente.contato }}</small>
                    @if (k.emergencia) { <b class="servico-urg">{{ servico(k.servico).nome }}</b> }
                    <b class="titulo-caso-mural">{{ k.caso.titulo }}</b>
                    <p>{{ k.briefing }}</p>
                    <div class="temas">@for (t of servico(k.servico).topicos; track t) { <span class="tema" [attr.data-faixa]="jogo.maestria(t).faixa">{{ topicoCurto(t) }}</span> }</div>
                    <footer>
                      <div><b class="valor">R$ {{ k.valor | number: '1.0-0' }}</b><small>visita de {{ k.prazo }} h · some em {{ k.expira - e.semana }} sem</small></div>
                      <div class="acoes"><button class="botao pequeno" (click)="jogo.recusar(k.id)">Recusar</button><button class="botao primario" [disabled]="!!e.caso" (click)="jogo.aceitar(k.id)">Aceitar</button></div>
                    </footer>
                  </article>
                }
              </div>
              <p class="nota">Os temas mostram o que o atendimento vai exigir. A cor indica sua maestria.</p>
            }
            @case ('loja') {
              <div class="loja">
                @for (it of loja(); track it.id) {
                  <article class="produto" [class.comprado]="e.compras.includes(it.id)">
                    <h3>{{ it.nome }}</h3><p>{{ it.desc }}</p><small class="efeito">{{ it.efeito }}</small>
                    <footer><b>R$ {{ it.preco | number: '1.0-0' }}</b>
                      @if (e.compras.includes(it.id)) { <span class="ok">Na garagem</span> }
                      @else if (it.requer && !e.arvore.includes(it.requer)) { <span class="requer">Requer {{ nomeNo(it.requer) }}</span> }
                      @else { <button class="botao primario" [disabled]="e.dinheiro < it.preco" (click)="jogo.comprar(it.id)">Comprar</button> }
                    </footer>
                  </article>
                }
              </div>
              <p class="nota">Custos fixos da garagem: R$ {{ custo }} por mês (luz, linha telefônica e ração).</p>
            }
            @case ('academia') {
              <p class="nota">Treine qualquer tema, a qualquer hora. Conta para a maestria, e a maestria faz as tarefas daquele tema renderem mais (Bronze +10%, Prata +20%, Ouro +30%). Itens que ainda não venceram viram treino adiantado, sem Insight.</p>
              <div class="topicos">
                @for (t of topicos; track t.id) {
                  @if (jogo.maestria(t.id); as m) {
                    <div class="topico-linha">
                      <div class="nome"><b>{{ t.nome }}</b><small>{{ t.bloco }} · {{ m.vistos }}/{{ m.total }} itens vistos</small></div>
                      <div class="medidor"><div [style.width.%]="m.valor" [attr.data-faixa]="m.faixa"></div></div>
                      <span class="faixa" [attr.data-faixa]="m.faixa">{{ m.faixa }}</span>
                      @if (m.vencidos) { <span class="ferrugem" title="Itens com revisão vencida">{{ m.vencidos }} enferrujados</span> } @else { <span></span> }
                    </div>
                  }
                }
              </div>
              <h3 class="sub">Treinar</h3>
              <div class="academia">
                @for (t of topicos; track t.id) {
                  <article class="modulo">
                    <h3>{{ t.nome }}</h3><p>{{ t.resumo }}</p>
                    <footer><span class="faixa" [attr.data-faixa]="jogo.maestria(t.id).faixa">{{ jogo.maestria(t.id).faixa }}</span><button class="botao primario" (click)="jogo.treinar(t.id)">Treinar 5</button></footer>
                  </article>
                }
              </div>
            }
            @case ('caderno') {
              <div class="revisao-bloco">
                <div><h3>Revisão de hoje</h3><p>{{ vencidos() ? vencidos() + ' itens com revisão vencida. Revisar rende 50% a mais de Insight.' : 'Nada vencido. Os playbooks estão em dia.' }}</p></div>
                <button class="botao primario" [disabled]="!vencidos()" (click)="jogo.iniciarRevisao()">Revisar agora</button>
              </div>
              <div class="revisao-bloco">
                <div><h3>Caderno de Erros</h3><p>{{ erros().length }} {{ erros().length === 1 ? 'erro aguardando' : 'erros aguardando' }} consolidação.</p></div>
                <button class="botao" [disabled]="!erros().length" (click)="jogo.refazerCaderno()">Refazer erros</button>
              </div>
              <div class="erros">
                @for (x of erros(); track x.id) {
                  <details class="erro-item"><summary><span class="tema">{{ topicoCurto(x.topico) }}</span>{{ x.enunciado }}</summary>
                    <p><b>Resposta:</b> {{ resposta(x) }}</p><p>{{ x.explicacao }}</p><small class="ref">{{ x.ref }}</small></details>
                }
              </div>
            }
            @case ('empresa') {
              <div class="painel-empresa">
                <div class="meta">
                  <h3>Meta do Ato 1: sair da garagem</h3>
                  <div class="meta-linha"><span>Atendimentos concluídos</span><div class="medidor"><div [style.width.%]="min(100, e.concluidos / metaCasos * 100)"></div></div><b>{{ e.concluidos }}/{{ metaCasos }}</b></div>
                  <div class="meta-linha"><span>Caixa</span><div class="medidor"><div [style.width.%]="min(100, e.dinheiro / metaCaixa * 100)"></div></div><b>R$ {{ e.dinheiro | number: '1.0-0' }} / {{ metaCaixa | number: '1.0-0' }}</b></div>
                  <div class="meta-linha"><span>Simulado de fundamentos</span><b>{{ e.ato1Completo ? 'Aprovado' : 'Pendente' }}</b></div>
                  <button class="botao primario" [disabled]="!podeSimulado()" (click)="jogo.iniciarSimulado()">{{ e.ato1Completo ? 'Ato 1 concluído' : 'Fazer o simulado' }}</button>
                </div>
                <div class="prontidao">
                  <h3>Painel de prontidão</h3>
                  <div class="numeros">
                    <div><b>{{ jogo.estudo.totalRespondidos }}</b><small>questões respondidas</small></div>
                    <div><b>{{ taxa() }}%</b><small>de acerto</small></div>
                    <div><b>{{ cobertura() }}%</b><small>dos itens do Ato 1 vistos</small></div>
                    <div><b>{{ e.melhorNota | number: '1.1-1' }}</b><small>melhor nota de cliente</small></div>
                  </div>
                  <p class="nota">Prova-alvo: Banestes · FCC · 21/02/2027. O foco é aprender o conteúdo; a data só serve de referência.</p>
                </div>
              </div>
            }
            @case ('opcoes') {
              <div class="opcoes-jogo">
                <label class="alternar"><input type="checkbox" [checked]="jogo.som.musicaLigada" (change)="musica($event)" /> Música</label>
                <label class="alternar"><input type="checkbox" [checked]="jogo.som.sfxLigado" (change)="sfx($event)" /> Efeitos sonoros</label>
                <h3>Backup</h3>
                <p class="nota">O jogo salva sozinho neste navegador. Para levar o progresso a outra máquina, copie o código abaixo e cole lá.</p>
                <textarea class="backup" [value]="backup()" readonly (focus)="selecionar($event)"></textarea>
                <div class="acoes"><button class="botao" (click)="copiar()">Copiar</button></div>
                <textarea class="backup" [(ngModel)]="importacao" placeholder="Cole aqui um backup para restaurar"></textarea>
                <div class="acoes"><button class="botao" [disabled]="!importacao" (click)="importar()">Restaurar backup</button></div>
                <h3>Zona de perigo</h3>
                <button class="botao perigo" (click)="recomecar()">{{ confirmar() ? 'Clique de novo para apagar a empresa' : 'Começar empresa nova' }}</button>
                <p class="nota">A empresa recomeça, mas a maestria de estudo é sua e continua.</p>
              </div>
            }
          }
          </div>
        </div>
      </div>
    } }

    <!-- notícia -->
    @if (e.noticia; as n) {
      <div class="veu">
        <div class="janela jornal">
          <div class="cab-jornal"><span>Gazeta do Byte</span><span>{{ meses[n.mes - 1] }} de {{ n.ano }}</span></div>
          <h2>{{ n.titulo }}</h2><p>{{ n.texto }}</p>
          <button class="botao primario" (click)="jogo.fecharNoticia()">Continuar</button>
        </div>
      </div>
    }

    <!-- avaliação -->
    @if (e.avaliacao; as av) {
      <div class="veu">
        <div class="janela avaliacao">
          <span class="etiqueta">Atendimento concluído</span>
          <h2>{{ av.servico }}</h2><small>{{ av.cliente }}</small>
          <div class="notas">
            @for (n of av.notas; track $index) {
              <div class="nota-cliente" [class.visivel]="revelado() > $index" [class.alta]="n >= 8" [class.baixa]="n < 5">
                <div class="numero">{{ revelado() > $index ? n : '?' }}</div>
                <div><b>{{ avaliadores[$index] }}</b> <small>· {{ criterios[$index] }}</small><p>{{ revelado() > $index ? av.comentarios[$index] : '...' }}</p></div>
              </div>
            }
          </div>
          @if (revelado() >= 4) {
            <div class="resumo-av">
              <div><small>Qualidade</small><b>{{ av.qualidade }}</b></div>
              <div><small>Horas</small><b>{{ av.horas | number: '1.1-1' }}/{{ av.prazo }}</b></div>
              <div><small>Pagamento</small><b>R$ {{ av.pagamento | number: '1.0-0' }}</b></div>
              <div><small>Reputação</small><b>{{ av.rep >= 0 ? '+' : '' }}{{ av.rep }}</b></div>
            </div>
            <div class="eixos">
              @for (x of eixos(av); track x.nome) { <div class="eixo"><span>{{ x.nome }}</span><div class="medidor"><div [style.width.%]="x.v * 100"></div></div><b>{{ x.v * 100 | number: '1.0-0' }}%</b></div> }
            </div>
            @if (av.dicas.length) { <ul class="dicas">@for (d of av.dicas; track $index) { <li>{{ d }}</li> }</ul> }
            <button class="botao primario" (click)="jogo.fecharAvaliacao()">Fechar relatório</button>
          }
        </div>
      </div>
    }

    @if (jogo.simuladoPassou(); as r) {
      <div class="veu">
        <div class="janela avaliacao">
          <span class="etiqueta">Simulado de certificação</span>
          <h2>{{ r.passou ? 'Aprovado!' : 'Ainda não.' }}</h2>
          <p class="placar">{{ r.acertos }} de {{ r.total }} ({{ (r.acertos / r.total) * 100 | number: '1.0-0' }}%)</p>
          <p>{{ r.passou ? 'A empresa está pronta para a sala comercial. O Ato 2 chega na próxima versão do jogo; até lá, a garagem segue aberta para treinar.' : 'Precisa de 70%. Os erros foram para o Caderno. Revise e tente quando quiser.' }}</p>
          <button class="botao primario" (click)="jogo.fecharSimulado()">Continuar</button>
        </div>
      </div>
    }

    @if (e.falido) {
      <div class="veu">
        <div class="janela avaliacao">
          <h2>A garagem fechou</h2>
          <p>O dinheiro acabou. O sofá foi vendido. {{ e.gato.nome }} foi morar com a vizinha, que tem sachê melhor.</p>
          <p class="nota">Tudo o que você estudou continua valendo na próxima empresa.</p>
          <button class="botao primario" (click)="jogo.recomecar()">Fundar outra empresa</button>
        </div>
      </div>
    }

    <app-atendimento />
    <app-desafio />
  </div>
  }`,
})
export class JogoTelaComponent {
  readonly jogo = inject(JogoService);
  readonly meses = MESES;
  readonly servicos = SERVICOS;
  readonly topicos = TOPICOS.filter((t) => t.ato === 1);
  readonly custo = CUSTO_MENSAL;
  readonly metaCasos = META_CASOS;
  readonly metaCaixa = META_CAIXA;
  readonly avaliadores = AVALIADORES;
  readonly criterios = CRITERIOS;
  readonly botoes: { id: Exclude<Painel, null>; nome: string }[] = [
    { id: 'mural', nome: 'Mural' }, { id: 'loja', nome: 'Loja' }, { id: 'arvore', nome: 'Tecnologia' }, { id: 'academia', nome: 'Academia' },
    { id: 'caderno', nome: 'Caderno' }, { id: 'empresa', nome: 'Empresa' }, { id: 'opcoes', nome: 'Opções' },
  ];
  readonly revelado = signal(0);
  readonly confirmar = signal(false);
  readonly toast = signal<string | null>(null);
  importacao = '';
  private toastTimer = 0;
  private ultimaAv: unknown = null;

  readonly data = computed(() => dataDe(this.jogo.s()?.semana ?? 0));
  readonly marca = computed(() => CORES_MARCA[this.jogo.s()?.corMarca ?? 0] ?? '#8b5cf6');
  readonly vencidos = computed(() => {
    this.jogo.versao();
    return this.jogo.vencidosHoje().length;
  });
  readonly erros = computed<Item[]>(() => {
    this.jogo.versao();
    return this.jogo.estudo.caderno.filter((r) => !r.resolvido).map((r) => itemPorId(r.itemId)).filter((x): x is Item => !!x);
  });
  readonly loja = computed(() => LOJA.filter((l) => l.desdeAno <= this.data().ano));
  readonly taxa = computed(() => {
    this.jogo.versao();
    const e = this.jogo.estudo;
    return e.totalRespondidos ? Math.round((e.totalAcertos / e.totalRespondidos) * 100) : 0;
  });
  readonly cobertura = computed(() => {
    this.jogo.versao();
    const todos = this.topicos.flatMap((t) => itensDoTopico(t.id));
    const vistos = todos.filter((i) => (this.jogo.estudo.itens[i.id]?.caixa ?? 0) > 0).length;
    return todos.length ? Math.round((vistos / todos.length) * 100) : 0;
  });
  readonly dicaTutorial = computed(() => {
    const e = this.jogo.s();
    if (!e || this.jogo.painel() || this.jogo.sessao() || e.noticia || e.avaliacao || e.caso) return null;
    if (e.tutorial === 0) return 'Miau. Tem chamado no Mural. Clique em Mural, lá embaixo.';
    if (e.tutorial === 3 && e.insight >= 4 && e.arvore.length === 1 && !e.pesquisa) return 'Cada decisão certa nos atendimentos rende Insight. Abra a Tecnologia e pesquise o primeiro nó.';
    return null;
  });

  constructor() {
    effect(() => {
      const av = this.jogo.s()?.avaliacao ?? null;
      if (av !== this.ultimaAv) {
        this.ultimaAv = av;
        if (!av) return;
        this.revelado.set(0);
        for (let i = 1; i <= 4; i++) setTimeout(() => {
          this.revelado.set(i);
          this.jogo.som.clique();
          if (i === 4) this.jogo.som.moeda();
        }, 650 * i);
      }
    });
    effect(() => {
      const t = this.jogo.toast();
      if (t) {
        this.toast.set(t.texto);
        clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => this.toast.set(null), 3400);
      }
    });
  }

  servico(id: string) { return servicoPorId(id); }
  nomeTopico(id: string): string { return topicoPorId(id).nome; }
  topicoCurto(id: string): string {
    const n: Record<string, string> = { cia: 'CID', osi: 'OSI', tcpip: 'TCP/IP', ipv4: 'IPv4/CIDR', ipv6: 'IPv6', equip: 'Equipamentos', malware: 'Malware', hard: 'Hardening' };
    return n[id] ?? id;
  }
  ceil(v: number): number { return Math.ceil(v); }
  eixos(av: Avaliacao) { return [{ nome: 'Correção técnica', v: av.eixos.correcao }, { nome: 'Causa raiz e evidências', v: av.eixos.raiz }, { nome: 'Laudo', v: av.eixos.laudo }, { nome: 'Eficiência', v: av.eixos.eficiencia }]; }
  min(a: number, b: number): number { return Math.min(a, b); }
  nomeNo(id: string): string { return noPorId(id)?.nome ?? id; }
  podeSimulado(): boolean { return !!this.jogo.estado && podeFazerSimulado(this.jogo.estado); }

  resposta(it: Item): string {
    if (it.formato === 'ordem') return it.opcoes.join(' → ');
    if (it.formato === 'ce') return it.correta === 1 ? 'Certo' : 'Errado';
    return it.opcoes[it.correta] ?? '';
  }

  vel(v: number): void {
    this.jogo.som.iniciar();
    this.jogo.som.clique();
    this.jogo.velocidade.set(v);
  }

  abrir(p: Exclude<Painel, null>): void {
    this.jogo.som.clique();
    this.confirmar.set(false);
    this.jogo.painel.set(this.jogo.painel() === p ? null : p);
  }

  fechar(): void {
    this.jogo.som.clique();
    this.jogo.painel.set(null);
  }

  tituloPainel(p: Painel): string {
    return ({ mural: 'Mural de contratos', loja: 'Loja de equipamentos', arvore: 'Árvore de Tecnologia', academia: 'Academia', caderno: 'Caderno', empresa: 'A empresa', opcoes: 'Opções' } as Record<string, string>)[p ?? ''] ?? '';
  }

  backup(): string { return this.jogo.exportar(); }
  selecionar(ev: Event): void { (ev.target as HTMLTextAreaElement).select(); }
  copiar(): void {
    navigator.clipboard?.writeText(this.backup()).then(() => this.jogo.aviso('Backup copiado.'), () => this.jogo.aviso('Não deu para copiar. Selecione o texto e copie à mão.'));
  }
  importar(): void {
    this.jogo.aviso(this.jogo.importar(this.importacao) ? 'Backup restaurado.' : 'Esse texto não é um backup válido.');
    this.importacao = '';
  }
  musica(ev: Event): void { this.jogo.som.setMusica((ev.target as HTMLInputElement).checked); }
  sfx(ev: Event): void { this.jogo.som.setSfx((ev.target as HTMLInputElement).checked); }
  recomecar(): void {
    if (!this.confirmar()) { this.confirmar.set(true); return; }
    this.jogo.recomecar();
  }

  trackContrato(_: number, k: Contrato): number { return k.id; }
}
