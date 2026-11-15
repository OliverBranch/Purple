import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JogoService } from '../jogo.service';
import { AcaoDef, Incidente, NoInc, horaTxt, no as noDe, tem } from '../core/incidente';
import { servicoPorId } from '../conteudo/servicos';
import { topicoPorId } from '../conteudo/topicos';
import { itemPorId } from '../conteudo/mundo';
import { H, W, caminho, desenharCabos, desenharNo, funcionario, fundoEscritorio, luzDaHora, pontoEm, postoDe } from '../arte/escritorio';
import { spritePessoa } from '../arte/pessoa';
import { spriteGato } from '../arte/gato';
import { CONTORNO, CORES_MARCA, ctx2d, texto } from '../arte/pixel';
import { servicosDe } from '../conteudo/incidentes/servidor';
import { Setor, ipStr, setoresEnd } from '../conteudo/incidentes/enderecos';
import { Registro, achadoPorId, registrosDiag } from '../conteudo/incidentes/diagnostico';
import { analisar } from '../conteudo/incidentes/rede';
import { Item } from '../core/tipos';

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; max: number; cor: string; txt?: string; tam: number }
interface Anel { x: number; y: number; r: number; vida: number; cor: string }
interface Pacote { pts: { x: number; y: number }[]; ini: number; dur: number; cor: string; fantasma?: boolean; colide?: boolean }

const ESCONDER = /^(Já |O modem está ligado|Não há resgate|Os arquivos desta|Os micros deste setor|O DHCP está funcionando|Escolha uma vaga|Este cliente não tem backup|O cliente já|Você já|NAT já)/;

@Component({
  selector: 'app-atendimento',
  imports: [DecimalPipe, FormsModule],
  template: `
  @if (dados(); as c) {
  <div class="incidente" [style.--marca]="marca()">
    <header class="inc-topo">
      <div class="inc-titulo">
        <span class="etiqueta" [class.urgente]="emergencia()">{{ emergencia() ? 'Emergência · ' : '' }}{{ servico().nome }}</span>
        <h2>{{ c.titulo }}</h2>
        <small>{{ cliente() }}</small>
      </div>
      <div class="inc-relogio" [class.atrasado]="c.hora > c.limite">
        <span class="hora">{{ hora() }}</span>
        <div class="barra-tempo"><div [style.width.%]="min(100, (c.hora / (c.limite * 1.4)) * 100)"></div><i [style.left.%]="(1 / 1.4) * 100"></i></div>
        <small>{{ c.hora > c.limite ? 'Hora extra: o cliente está ficando impaciente' : 'Combinado até ' + limiteTxt() }}</small>
      </div>
      <div class="inc-medidores">
        <div class="med"><span>Paciência</span><div class="medidor verde"><div [style.width.%]="c.paciencia"></div></div></div>
        <div class="med"><span>Prejuízo do cliente</span><div class="medidor vermelho"><div [style.width.%]="min(100, c.prejuizo)"></div></div></div>
      </div>
      <div class="inc-vel">
        @for (v of [0, 1, 2, 4]; track v) {
          <button [class.sel]="jogo.velCaso() === v" (click)="vel(v)" [title]="v === 0 ? 'Pausar (espaço)' : v + 'x'">{{ v === 0 ? '❚❚' : '▶'.repeat(v === 4 ? 3 : v) }}</button>
        }
      </div>
      <button class="botao gato-btn" (click)="gato()" [disabled]="c.fim || jogo.saches() <= 0" title="O gato fareja a pista mais importante. Um sachê por dica.">
        <span class="mini-gato"></span>Sachê ({{ jogo.saches() }})
      </button>
      <button class="botao primario" (click)="encerrar()" [disabled]="c.fim">Encerrar visita</button>
    </header>

    <div class="inc-corpo">
      <div class="inc-mapa-col">
        <div class="inc-mapa" #mapa (pointermove)="mover($event)" (pointerleave)="hover.set(null)" (click)="clicar($event)">
          <canvas #cv [attr.width]="largura" [attr.height]="altura"></canvas>
          @if (hoverNo(); as h) { <div class="dica-no" [style.left.%]="(h.x / largura) * 100" [style.top.%]="(h.y / altura) * 100">{{ h.nome }}</div> }
          @if (jogo.velCaso() === 0 && !c.fim && !pergunta()) { <div class="selo-pausa pequeno">PAUSADO · espaço continua</div> }
          @if (dicaGato(); as d) { <div class="fala-gato">{{ d }}</div> }
          @else if (tutorial(); as t) { <div class="fala-gato tutorial-inc">{{ t }}</div> }
          @if (pergunta(); as it) {
            <div class="inc-pergunta">
              <div class="cartao-pergunta">
                <span class="etiqueta">{{ c.contato }} pergunta, curioso</span>
                <p class="enunciado">{{ it.enunciado }}</p>
                <div class="alts">
                  @if (it.formato === 'ce') {
                    @for (o of ['Certo', 'Errado']; track o; let i = $index) {
                      <button class="alt" [class.certa]="respondida() !== null && (i === 0) === (it.correta === 1)" [class.errada]="respondida() === i && (i === 0) !== (it.correta === 1)" [disabled]="respondida() !== null" (click)="responder(i)">{{ o }}</button>
                    }
                  } @else {
                    @for (o of it.opcoes; track $index; let i = $index) {
                      <button class="alt" [class.certa]="respondida() !== null && i === it.correta" [class.errada]="respondida() === i && i !== it.correta" [disabled]="respondida() !== null" (click)="responder(i)"><b>{{ letras[i] }}</b> {{ o }}</button>
                    }
                  }
                </div>
                @if (respondida() !== null) {
                  <p class="explicacao" [class.ok]="acertou()">{{ acertou() ? 'Isso mesmo.' : 'Não era essa.' }} {{ it.explicacao }}</p>
                  <button class="botao primario" (click)="voltar()">Voltar ao trabalho</button>
                }
              </div>
            </div>
          }
        </div>
        <div class="inc-baixo">
          <div class="inc-log" #log>
            @for (e of c.log; track e.id) {
              <p [class]="'le ' + e.tipo" (click)="e.no && selecionar(e.no)"><span>{{ horaDe(e.h) }}</span>{{ e.txt }}</p>
            }
          </div>
          <div class="inc-obj">
            <div class="chamado-mini">{{ c.chamado }}</div>
            <h4>Objetivos</h4>
            @for (o of c.obj; track o.id) { <div class="obj" [class.ok]="o.feito"><span>{{ o.feito ? '✔' : '○' }}</span>{{ o.txt }}</div> }
          </div>
        </div>
      </div>

      <aside class="inc-lado">
        @if (c.acao; as a) {
          <div class="trabalhando">
            <div><small>Trabalhando</small><b>{{ nomeAcao(a.id) }}</b>@if (a.no) { <span> · {{ nomeNo(a.no) }}</span> }</div>
            <div class="medidor"><div [style.width.%]="((c.hora - a.ini) / (a.fim - a.ini)) * 100"></div></div>
            <button class="botao pequeno" (click)="jogo.cancelarAcao()">Cancelar</button>
          </div>
        }
        <div class="card-no">
          <h3>{{ sel()?.nome ?? 'Visão geral' }}</h3>
          <p class="estado">{{ estadoTxt() }}</p>
        </div>

        @if (c.modo === 'servidor' && sel()?.tipo === 'servidor') {
          <div class="bloco-lado">
            <h4>Serviços em escuta</h4>
            @for (s of servicos(); track s.id) {
              <div class="servico" [class.fechado]="!s.ativo" [class.corrigido]="s.corrigido">
                <div class="sv-cab"><b>{{ s.porta }}/tcp</b> {{ s.nome }}<span class="sv-st">{{ !s.ativo ? 'fechado' : s.corrigido ? 'corrigido' : 'aberto' }}</span></div>
                <small>{{ s.desc }}</small>
                @if (s.ativo) {
                  <div class="sv-acoes">
                    <button class="botao pequeno" [disabled]="!!c.acao || c.fim" (click)="servicoAcao('desativar', s.id)">Desativar · {{ horas('desativar') }}</button>
                    @if (s.correcao && !s.corrigido) { <button class="botao pequeno primario" [disabled]="!!c.acao || c.fim" (click)="servicoAcao('corrigir', s.id)">{{ rotuloCorrecao(s.correcao) }} · {{ horas('corrigir') }}</button> }
                  </div>
                }
              </div>
            } @empty { <p class="nota">Você ainda não sabe o que está aberto. Rode o netstat ou espere o primeiro ataque bater.</p> }
          </div>
        }

        @if (c.modo === 'enderecos' && setorSel(); as st) {
          <div class="bloco-lado">
            <h4>Sub-rede de {{ st.nome }}</h4>
            <p class="nota">{{ st.hosts }} {{ st.hosts === 2 ? 'pontas' : 'micros' }}. Bloco da empresa: {{ base() }}/24.</p>
            @if (st.cfg) { <p class="cfg-atual">Atual: {{ ip(st.cfg.rede) }}/{{ st.cfg.pref }}</p> }
            <div class="form-ip">
              <input [(ngModel)]="formRede" placeholder="192.168.x.0" spellcheck="false" />
              <select [(ngModel)]="formPref">@for (p of prefixos; track p) { <option [ngValue]="p">/{{ p }}</option> }</select>
            </div>
            <button class="botao primario" [disabled]="!!c.acao || c.fim || !formRede" (click)="configurar(st)">Configurar · {{ horas('configurar') }}</button>
          </div>
        }

        @if (c.modo === 'rede') {
          <div class="bloco-lado verba"><span>Material</span><b [class.negativo]="c.custos > c.d['verba']">R$ {{ c.custos | number: '1.0-0' }}</b><small>de R$ {{ c.d['verba'] | number: '1.0-0' }} combinados</small></div>
        }

        @for (grupo of grupos(); track grupo.nome) {
          @if (grupo.itens.length) {
            <h4 class="sec">{{ grupo.nome }}</h4>
            <div class="grade-acoes">
              @for (a of grupo.itens; track a.def.id) {
                <button class="acao" [class.ferr]="a.def.tipo === 'ferramenta'" [class.geral]="!a.def.alvo" [disabled]="a.motivo !== true" (click)="agir(a.def)" (pointerenter)="acaoHover.set(a)" (pointerleave)="acaoHover.set(null)">
                  <span [class]="'ic ic-' + (a.def.icone ?? 'x')"></span>
                  <b>{{ a.def.nome }}</b>
                  <span class="h">{{ horas(a.def.id) }}@if (a.def.custo) { · R$ {{ a.def.custo }} }</span>
                </button>
              }
            </div>
          }
        }
        <div class="desc-acao">
          @if (acaoHover(); as h) { <b>{{ h.def.nome }}</b> {{ h.motivo === true ? h.def.desc : h.motivo }} }
          @else { <span>Passe o mouse numa ação para ver o que ela faz. As de borda azul investigam; as roxas mudam alguma coisa.</span> }
        </div>
        @if (!sel() && c.modo !== 'diagnostico') { <p class="nota dica-sel">Clique numa máquina ou equipamento no mapa para ver o que dá para fazer nele.</p> }

        @if (c.modo === 'diagnostico') {
          <h4 class="sec">Achados ({{ registros().length }})</h4>
          @for (r of registros(); track r.id) {
            <div class="achado">
              <b>{{ achado(r.id)?.onde }}</b>
              <small>{{ achado(r.id)?.texto }}</small>
              <div class="sel3">
                <select [(ngModel)]="r.classe" (ngModelChange)="jogo.tocar()" [disabled]="c.fim"><option [ngValue]="undefined" disabled>Tipo</option><option>Ameaça</option><option>Vulnerabilidade</option></select>
                <select [(ngModel)]="r.pilar" (ngModelChange)="jogo.tocar()" [disabled]="c.fim"><option [ngValue]="undefined" disabled>Pilar</option><option>Confidencialidade</option><option>Integridade</option><option>Disponibilidade</option></select>
                <select [(ngModel)]="r.nivel" (ngModelChange)="jogo.tocar()" [disabled]="c.fim"><option [ngValue]="undefined" disabled>Risco</option><option>Baixo</option><option>Médio</option><option>Alto</option></select>
              </div>
            </div>
          } @empty { <p class="nota">Inspecione os pontos do escritório. Cada achado aparece aqui para você classificar.</p> }
        }
      </aside>
    </div>

    @if (c.fim) {
      <div class="veu">
        <div class="janela laudo">
          @if (laudoAtual(); as q) {
            <span class="etiqueta">Laudo técnico · {{ q.i + 1 }} de {{ c.laudo.length }}</span>
            <h3>{{ q.l.enunciado }}</h3>
            <div class="alts">
              @for (o of q.l.opcoes; track $index; let i = $index) {
                <button class="alt" [class.certa]="q.l.escolha !== undefined && i === q.l.correta" [class.errada]="q.l.escolha === i && i !== q.l.correta" [disabled]="q.l.escolha !== undefined" (click)="jogo.responderLaudo(q.i, i)"><b>{{ letras[i] }}</b> {{ o }}</button>
              }
            </div>
            @if (q.l.escolha !== undefined) {
              <p class="explicacao" [class.ok]="q.l.escolha === q.l.correta">{{ q.l.porque }}</p>
              <button class="botao primario" (click)="laudoPasso.set(laudoPasso() + 1)">Continuar</button>
            }
          } @else {
            <span class="etiqueta">{{ c.motivoFim === 'paciencia' ? 'Você foi convidado a se retirar' : 'Fim da visita' }}</span>
            <h3>{{ c.titulo }}</h3>
            <div class="resumo-visita">
              <div><small>Horas</small><b>{{ c.hora | number: '1.1-1' }} / {{ c.limite }}</b></div>
              <div><small>Prejuízo do cliente</small><b>{{ min(100, c.prejuizo) | number: '1.0-0' }}%</b></div>
              <div><small>Laudo</small><b>{{ acertosLaudo() }} / {{ c.laudo.length }}</b></div>
              @if (c.modo === 'rede') { <div><small>Material</small><b>R$ {{ c.custos | number: '1.0-0' }}</b></div> }
            </div>
            <div class="objs-fim">@for (o of c.obj; track o.id) { <span [class.ok]="o.feito">{{ o.feito ? '✔' : '✘' }} {{ o.txt }}</span> }</div>
            <div class="licoes">
              @for (l of c.licoes; track $index) {
                <div class="licao" [class.ok]="l.ok">
                  <span class="marca">{{ l.ok ? '✔' : '✘' }}</span>
                  <div><b>{{ l.titulo }}</b><p>{{ l.porque }}</p>@if (l.item) { <small class="ref">{{ refItem(l.item) }}</small> }</div>
                </div>
              }
            </div>
            <button class="botao primario grande" (click)="jogo.entregar()">Entregar laudo e cobrar</button>
          }
        </div>
      </div>
    }
  </div>
  }`,
})
export class AtendimentoComponent implements AfterViewInit, OnDestroy {
  readonly jogo = inject(JogoService);
  readonly letras = ['A', 'B', 'C', 'D', 'E'];
  readonly prefixos = [24, 25, 26, 27, 28, 29, 30];
  readonly largura = W * 2;
  readonly altura = H * 2;
  readonly cv = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  readonly mapaEl = viewChild<ElementRef<HTMLDivElement>>('mapa');
  readonly logEl = viewChild<ElementRef<HTMLDivElement>>('log');

  readonly sel = signal<NoInc | null>(null);
  readonly hover = signal<string | null>(null);
  readonly respondida = signal<number | null>(null);
  readonly laudoPasso = signal(0);
  readonly dicaGato = signal<string | null>(null);
  readonly acaoHover = signal<{ def: AcaoDef; motivo: true | string } | null>(null);
  formRede = '';
  formPref = 26;

  readonly dados = computed(() => { this.jogo.versao(); return this.jogo.caso(); }, { equal: () => false });
  readonly marca = computed(() => CORES_MARCA[this.jogo.s()?.corMarca ?? 0] ?? '#8b5cf6');
  readonly servico = computed(() => servicoPorId(this.jogo.s()?.caso?.contrato.servico ?? 'virus'));
  readonly cliente = computed(() => this.jogo.s()?.caso?.contrato.cliente.nome ?? '');
  readonly emergencia = computed(() => !!this.jogo.s()?.caso?.contrato.emergencia);
  readonly tutorial = computed(() => {
    const e = this.jogo.s();
    const c = this.dados();
    if (!e || !c || c.fim || this.pergunta()) return null;
    if (e.tutorial <= 1) return `Miau! Este é o escritório do cliente, ao vivo: o relógio corre e o problema piora enquanto você pensa. Clique numa máquina para ver o que dá para investigar nela. Espaço pausa.`;
    if (e.tutorial === 2 && c.hora < 2.5 && c.feitas.length < 3) return 'Cada ferramenta revela pistas no terminal, lá embaixo. Cada ação muda alguma coisa, para o bem ou para o mal. Quando achar que resolveu, clique em Encerrar visita.';
    return null;
  });
  readonly hora = computed(() => { const c = this.dados(); return c ? horaTxt(c) : ''; });
  readonly limiteTxt = computed(() => { const c = this.dados(); return c ? horaTxt(c, c.limite) : ''; });
  readonly pergunta = computed<Item | null>(() => { this.dados(); return this.jogo.perguntaAtual(); });
  readonly acertou = computed(() => {
    const it = this.pergunta(), r = this.respondida();
    if (!it || r === null) return false;
    return it.formato === 'ce' ? (r === 0) === (it.correta === 1) : r === it.correta;
  });
  readonly hoverNo = computed(() => { const c = this.dados(); const h = this.hover(); const n = c && h ? noDe(c, h) : null; return n ? { nome: n.nome, x: n.x * 2, y: (n.y - (n.tipo === 'pc' ? 34 : 24)) * 2 } : null; });
  readonly servicos = computed(() => { const c = this.dados(); return c?.modo === 'servidor' ? servicosDe(c).filter((s) => s.conhecido) : []; });
  readonly registros = computed<Registro[]>(() => { const c = this.dados(); return c?.modo === 'diagnostico' ? registrosDiag(c) : []; });
  readonly setorSel = computed<Setor | null>(() => { const c = this.dados(); const s = this.sel(); return c?.modo === 'enderecos' && s?.tipo === 'depto' ? (setoresEnd(c).find((x) => x.id === s.id) ?? null) : null; });
  readonly base = computed(() => { const c = this.dados(); return c?.modo === 'enderecos' ? ipStr(c.d['base']) : ''; });
  readonly acertosLaudo = computed(() => this.dados()?.laudo.filter((l) => l.escolha === l.correta).length ?? 0);
  readonly laudoAtual = computed(() => {
    const c = this.dados();
    if (!c?.fim) return null;
    const i = this.laudoPasso();
    const l = c.laudo[i];
    return l ? { i, l } : null;
  });

  readonly acoesNo = computed(() => {
    const c = this.dados(), s = this.sel(), r = this.jogo.regras();
    if (!c || !s || !r) return [];
    return r.acoes.filter((a) => a.alvo?.includes(s.tipo) && !(c.modo === 'servidor' && (a.id === 'desativar' || a.id === 'corrigir')) && !(c.modo === 'enderecos' && a.id === 'configurar'))
      .map((def) => ({ def, motivo: this.jogo.podeAgir(def, s.id) }))
      .filter((a) => a.motivo === true || !ESCONDER.test(a.motivo) || a.motivo === 'O técnico está ocupado.');
  });
  readonly acoesGerais = computed(() => {
    const c = this.dados(), r = this.jogo.regras();
    if (!c || !r) return [];
    return r.acoes.filter((a) => !a.alvo).map((def) => ({ def, motivo: this.jogo.podeAgir(def, null) })).filter((a) => a.motivo === true || !ESCONDER.test(a.motivo) || a.motivo === 'O técnico está ocupado.');
  });
  readonly grupos = computed(() => {
    const todas = [...this.acoesNo(), ...this.acoesGerais()];
    return [
      { nome: 'Investigar', itens: todas.filter((a) => a.def.tipo === 'ferramenta') },
      { nome: 'Agir', itens: todas.filter((a) => a.def.tipo === 'acao') },
    ];
  });
  readonly estadoTxt = computed(() => {
    const c = this.dados(), s = this.sel();
    if (!c) return '';
    if (!s) return c.modo === 'virus' ? 'Escolha onde investigar. A praga não espera.' : c.modo === 'servidor' ? 'O servidor está na Internet e os ataques não param.' : c.modo === 'rede' ? 'As vagas tracejadas esperam um equipamento.' : c.modo === 'enderecos' ? 'Clique num setor para dar a ele uma sub-rede.' : 'Clique nos pontos do escritório para inspecionar.';
    const partes: string[] = [];
    if (s.dono) partes.push(`Usuário: ${s.dono}.`);
    if (tem(s, 'desligado')) partes.push('Desligado.');
    if (tem(s, 'isolado')) partes.push('Sem cabo de rede.');
    if (tem(s, 'cifrado')) partes.push('Arquivos cifrados.');
    if (tem(s, 'nao-liga')) partes.push('Não dá boot.');
    if (s.visto && s.infec > 0) partes.push('Comprometido.');
    else if (tem(s, 'suspeito') && !s.visto) partes.push('Suspeito: algo chegou por aqui.');
    else if (s.visto && (s.tipo === 'pc' || s.tipo === 'servidor') && c.modo === 'virus') partes.push('Verificado: limpo.');
    else if (!s.visto && (s.tipo === 'pc' || s.tipo === 'servidor') && c.modo === 'virus') partes.push('Não verificado.');
    if (tem(s, 'imune')) partes.push('Correções aplicadas.');
    if (tem(s, 'vaga')) partes.push(s.tipo === 'slot' ? 'Vaga vazia.' : 'Equipamento instalado.');
    if (s.tipo === 'objeto') partes.push(s.visto ? 'Inspecionado.' : 'Ainda não inspecionado.');
    return partes.join(' ') || 'Tudo parece normal.';
  });

  // ---------------- animação ----------------
  private raf = 0;
  private fundo: HTMLCanvasElement | null = null;
  private fundoDe: Incidente | null = null;
  private particulas: Particula[] = [];
  private aneis: Anel[] = [];
  private pacotes: Pacote[] = [];
  private tremor = 0;
  private ultimoFx = 0;
  private tec = { x: 240, y: 150, dir: 'baixo' as 'baixo' | 'cima' | 'lado', esq: false, passo: 0 };
  private proxTrafego = 0;
  private analiseCache: { t: number; a: ReturnType<typeof analisar> | null } = { t: 0, a: null };
  private teclas = (ev: KeyboardEvent) => {
    if (!this.dados() || (ev.target as HTMLElement)?.tagName === 'INPUT') return;
    if (ev.code === 'Space') { ev.preventDefault(); this.vel(this.jogo.velCaso() === 0 ? 1 : 0); }
    if (ev.code === 'Escape') this.sel.set(null);
  };

  constructor() {
    effect(() => {
      const c = this.dados();
      const n = c?.log.length ?? 0;
      queueMicrotask(() => { const el = this.logEl()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; });
      void n;
    });
    effect(() => {
      // nova pergunta: zera a resposta
      this.pergunta();
      this.respondida.set(null);
    });
    effect(() => {
      const c = this.dados();
      if (!c) { this.sel.set(null); this.laudoPasso.set(0); this.dicaGato.set(null); this.fundoDe = null; }
      const s = this.sel();
      if (c && s) { const atual = noDe(c, s.id); if (atual !== s) this.sel.set(atual ?? null); }
    });
    window.addEventListener('keydown', this.teclas);
  }

  ngAfterViewInit(): void {
    const loop = (t: number) => {
      this.desenhar(t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.teclas);
  }

  // ---------------- interação ----------------
  min(a: number, b: number): number { return Math.min(a, b); }
  horaDe(h: number): string { const c = this.dados(); return c ? horaTxt(c, h) : ''; }
  ip(n: number): string { return ipStr(n); }
  achado(id: string) { return achadoPorId(id); }
  nomeNo(id: string): string { const c = this.dados(); return (c && noDe(c, id)?.nome) ?? id; }
  nomeAcao(id: string): string { return this.jogo.regras()?.acoes.find((a) => a.id === id)?.nome ?? id; }
  refItem(id: string): string { const it = itemPorId(id); return it ? `Revisão: ${topicoPorId(it.topico).nome}` : ''; }
  rotuloCorrecao(c: string): string { return ({ ssh: 'Trocar por SSH', relay: 'Fechar relay', anonimo: 'Tirar anônimo', borda: 'Só rede interna' } as Record<string, string>)[c] ?? 'Corrigir'; }

  horas(id: string): string {
    const a = this.jogo.regras()?.acoes.find((x) => x.id === id);
    if (!a) return '';
    const h = a.horas * this.jogo.multHoras(a);
    return h < 0.15 ? 'na hora' : `${h.toFixed(1).replace('.', ',')} h`;
  }

  vel(v: number): void {
    this.jogo.som.clique();
    this.jogo.velCaso.set(v);
  }

  private posLogica(ev: MouseEvent): { x: number; y: number } {
    const el = this.mapaEl()?.nativeElement;
    const r = el?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  }

  private noEm(x: number, y: number): NoInc | null {
    const c = this.dados();
    if (!c) return null;
    let melhor: NoInc | null = null;
    let md = Infinity;
    for (const n of c.nos) {
      const cy = n.tipo === 'pc' ? n.y - 8 : n.tipo === 'servidor' ? n.y - 12 : n.tipo === 'depto' ? n.y - 6 : n.tipo === 'objeto' ? n.y - 10 : n.y;
      const rx = n.tipo === 'depto' ? 40 : n.tipo === 'pc' ? 22 : 18;
      const ry = n.tipo === 'pc' ? 22 : 18;
      const d = ((x - n.x) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d < 1 && d < md) { md = d; melhor = n; }
    }
    return melhor;
  }

  mover(ev: PointerEvent): void {
    const p = this.posLogica(ev);
    this.hover.set(this.noEm(p.x, p.y)?.id ?? null);
  }

  clicar(ev: MouseEvent): void {
    if (this.pergunta()) return;
    const p = this.posLogica(ev);
    const n = this.noEm(p.x, p.y);
    if (n) this.jogo.som.clique();
    this.sel.set(n);
    if (n?.tipo === 'depto') {
      const st = this.setorSel();
      this.formRede = st?.cfg ? ipStr(st.cfg.rede) : '';
    }
  }

  selecionar(id: string): void {
    const c = this.dados();
    const n = c ? noDe(c, id) : undefined;
    if (n) this.sel.set(n);
  }

  agir(a: AcaoDef): void {
    this.jogo.agir(a.id, a.alvo ? (this.sel()?.id ?? null) : null);
  }

  servicoAcao(id: 'desativar' | 'corrigir', servico: string): void {
    this.jogo.agir(id, 'srv', servico);
  }

  configurar(st: Setor): void {
    this.jogo.agir('configurar', st.id, { rede: this.formRede, pref: this.formPref });
  }

  gato(): void {
    const t = this.jogo.ajudaDoGato();
    if (t) {
      this.dicaGato.set(t);
      setTimeout(() => { if (this.dicaGato() === t) this.dicaGato.set(null); }, 6000);
    }
  }

  encerrar(): void {
    this.laudoPasso.set(0);
    this.jogo.encerrarVisita();
  }

  responder(i: number): void {
    const it = this.pergunta();
    if (!it || this.respondida() !== null) return;
    this.respondida.set(i);
    this.jogo.responderPerguntaCaso(this.acertou());
  }

  voltar(): void {
    this.jogo.fecharPerguntaCaso(this.acertou());
    this.respondida.set(null);
  }

  // ---------------- desenho ----------------
  private rota(c: Incidente, de: string, para: string): { x: number; y: number }[] {
    const ant = new Map<string, { de: string; link: number }>();
    const fila = [de];
    const vistos = new Set([de]);
    while (fila.length) {
      const a = fila.shift()!;
      if (a === para) break;
      c.links.forEach((l, i) => {
        const o = l.a === a ? l.b : l.b === a ? l.a : null;
        if (!o || vistos.has(o)) return;
        const n = noDe(c, o)!;
        if ((n.tipo === 'pc' || n.tipo === 'impressora' || n.tipo === 'depto') && o !== para) return;
        vistos.add(o);
        ant.set(o, { de: a, link: i });
        fila.push(o);
      });
    }
    if (!ant.has(para)) return [];
    const seq: { link: number; inv: boolean }[] = [];
    let cur = para;
    while (cur !== de) {
      const p = ant.get(cur)!;
      const l = c.links[p.link]!;
      seq.unshift({ link: p.link, inv: l.a === cur });
      cur = p.de;
    }
    const pts: { x: number; y: number }[] = [];
    for (const s of seq) {
      const cp = caminho(c, c.links[s.link]!);
      pts.push(...(s.inv ? cp.reverse() : cp));
    }
    return pts;
  }

  private consumirFx(c: Incidente, agora: number): void {
    for (const f of this.jogo.fxFila) {
      if (f.t <= this.ultimoFx) continue;
      this.ultimoFx = f.t;
      const n = f.no ? noDe(c, f.no) : undefined;
      const x = n?.x ?? 240, y = (n?.y ?? 140) - 14;
      switch (f.tipo) {
        case 'infecta': this.aneis.push({ x, y: y + 12, r: 4, vida: 1, cor: '#ef4444' }); this.texto(x, y - 10, '!', '#ef4444'); break;
        case 'pacote': if (f.extra && f.no) { const pts = this.rota(c, f.no, f.extra); if (pts.length) this.pacotes.push({ pts, ini: agora, dur: 0.9, cor: '#ef4444' }); } break;
        case 'limpa': this.faiscas(x, y, '#4ade80', 14); this.texto(x, y - 12, 'LIMPO', '#4ade80'); break;
        case 'acerta': this.faiscas(x, y, '#fbbf24', 10); this.texto(x + 6, y - 20, '+', '#fbbf24'); break;
        case 'erra': this.texto(x, y - 12, '?', '#cbd5e1'); this.faiscas(x, y, '#64748b', 6); break;
        case 'alerta': this.aneis.push({ x, y: y + 12, r: 3, vida: 0.7, cor: '#fbbf24' }); break;
        case 'bloqueia': if (f.extra) this.texto(x + 18, y - 8, `X ${f.extra}`, '#4ade80'); else this.faiscas(x, y, '#cbd5e1', 6); break;
        case 'quebra': this.aneis.push({ x, y: y + 12, r: 6, vida: 1, cor: '#ef4444' }); this.tremor = 0.35; this.texto(x, y - 14, f.extra ? `${f.extra}!` : '!!', '#ef4444'); this.faiscas(x, y, '#ef4444', 12); break;
        case 'conclui': this.faiscas(x, y - 4, '#a78bfa', 18); break;
      }
    }
  }

  private texto(x: number, y: number, txt: string, cor: string): void {
    this.particulas.push({ x: x - txt.length * 2, y, vx: 0, vy: -14, vida: 1.4, max: 1.4, cor, txt, tam: 1 });
  }

  private faiscas(x: number, y: number, cor: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40;
      this.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, vida: 0.6 + Math.random() * 0.5, max: 1.1, cor, tam: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  private trafego(c: Incidente, agora: number): void {
    if (agora < this.proxTrafego || this.jogo.velCaso() === 0) return;
    this.proxTrafego = agora + 0.18 / Math.max(1, this.jogo.velCaso());
    const pcs = c.nos.filter((n) => n.tipo === 'pc' && !tem(n, 'desligado') && !tem(n, 'isolado'));
    if (!pcs.length) return;
    const pc = pcs[Math.floor(Math.random() * pcs.length)]!;
    if (c.modo === 'rede') {
      if (agora - this.analiseCache.t > 0.5) this.analiseCache = { t: agora, a: analisar(c) };
      const a = this.analiseCache.a!;
      if (!a.alcance[pc.id]) return;
      const destino = Math.random() < 0.5 && noDe(c, 'imp') ? 'imp' : pcs[Math.floor(Math.random() * pcs.length)]!.id;
      if (destino === pc.id) return;
      const pts = this.rota(c, pc.id, destino);
      if (!pts.length) return;
      const dom = a.colisao.find((d) => d.hosts.includes(pc.id));
      const taxa = dom?.taxa ?? 0;
      const colide = Math.random() * 100 < taxa;
      this.pacotes.push({ pts, ini: agora, dur: 1.1, cor: taxa > 30 ? '#f87171' : taxa > 15 ? '#fbbf24' : '#4ade80', colide });
      // hub repete para todas as portas
      const central = noDe(c, 'central');
      if (central?.tipo === 'hub' && Math.random() < 0.7) {
        for (const l of c.links.filter((l) => (l.a === 'central' || l.b === 'central') && l.a !== pc.id && l.b !== pc.id)) {
          const outro = l.a === 'central' ? l.b : l.a;
          const p2 = this.rota(c, 'central', outro);
          if (p2.length) this.pacotes.push({ pts: p2, ini: agora + 0.5, dur: 0.6, cor: '#cbd5e1', fantasma: true });
        }
      }
      return;
    }
    if (c.modo === 'virus') {
      const fam = c.d['fam'] as string;
      const doente = c.nos.filter((n) => n.infec > 0 && n.visto && !tem(n, 'isolado') && !tem(n, 'desligado'));
      if (doente.length && Math.random() < 0.6) {
        const d = doente[Math.floor(Math.random() * doente.length)]!;
        const alvo = fam === 'trojan' || fam === 'keylogger' ? (tem(noDe(c, 'modem'), 'desligado') ? null : 'internet') : 'hub';
        const pts = alvo ? this.rota(c, d.id, alvo) : [];
        if (pts.length) this.pacotes.push({ pts, ini: agora, dur: 1.2, cor: '#ef4444' });
        return;
      }
    }
    if (c.modo === 'virus' || c.modo === 'servidor') {
      const alvo = c.modo === 'servidor' ? 'srv' : noDe(c, 'srv') ? 'srv' : 'hub';
      const pts = this.rota(c, pc.id, alvo);
      if (pts.length && Math.random() < 0.35) this.pacotes.push({ pts, ini: agora, dur: 1.4, cor: '#93c5fd', fantasma: true });
    }
  }

  private desenhar(agora: number): void {
    const c = this.dados();
    const cv = this.cv()?.nativeElement;
    if (!c || !cv) return;
    const ctx = ctx2d(cv);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    if (this.fundoDe !== c || !this.fundo) {
      this.fundo = fundoEscritorio(c, this.cliente());
      this.fundoDe = c;
      this.particulas = [];
      this.aneis = [];
      this.pacotes = [];
      this.ultimoFx = performance.now();
    }
    this.consumirFx(c, agora);
    this.trafego(c, agora);
    const dt = 1 / 60;
    if (this.tremor > 0) {
      this.tremor -= dt;
      ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    }
    ctx.drawImage(this.fundo, 0, 0);
    const selId = this.sel()?.id ?? null;
    desenharCabos(ctx, c, selId, agora);
    // pacotes
    this.pacotes = this.pacotes.filter((p) => agora - p.ini < p.dur + 0.05);
    for (const p of this.pacotes) {
      const f = (agora - p.ini) / p.dur;
      if (f < 0) continue;
      if (p.colide && f > 0.45) {
        if (f < 0.55) { const q = pontoEm(p.pts, 0.45); this.faiscas(q.x, q.y, '#fbbf24', 3); p.dur = 0; }
        continue;
      }
      const q = pontoEm(p.pts, f);
      ctx.fillStyle = CONTORNO;
      ctx.fillRect(Math.round(q.x) - 2, Math.round(q.y) - 2, p.fantasma ? 3 : 4, p.fantasma ? 3 : 4);
      ctx.fillStyle = p.cor;
      ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, p.fantasma ? 1 : 2, p.fantasma ? 1 : 2);
    }
    // ataques ao servidor
    if (c.modo === 'servidor') {
      const pts = this.rota(c, 'internet', 'srv');
      for (const at of c.ataques) {
        const f = (c.hora - at.sai) / (at.chega - at.sai);
        const q = pontoEm(pts, f);
        ctx.fillStyle = CONTORNO; ctx.fillRect(Math.round(q.x) - 3, Math.round(q.y) - 3, 6, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(Math.round(q.x) - 2, Math.round(q.y) - 2, 4, 4);
        texto(ctx, String(at.porta), q.x - 5, q.y - 10, '#fecaca');
      }
    }
    // nós, de trás para a frente
    const ordem = [...c.nos].sort((a, b) => a.y - b.y);
    const hov = this.hover();
    for (const n of ordem) {
      desenharNo(ctx, c, n, agora, { sel: n.id === selId, hover: n.id === hov, gato: c.d['gato'] === n.id });
      if (n.tipo === 'pc' && !tem(n, 'isolado-pessoa')) funcionario(ctx, n, agora, n.visto && n.infec > 0);
    }
    this.desenharTecnico(ctx, c, agora);
    // anéis e partículas
    this.aneis = this.aneis.filter((a) => (a.vida -= dt) > 0);
    for (const a of this.aneis) {
      a.r += dt * 40;
      ctx.strokeStyle = a.cor;
      ctx.globalAlpha = Math.max(0, a.vida);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y, a.r, a.r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.particulas = this.particulas.filter((p) => (p.vida -= dt) > 0);
    for (const p of this.particulas) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.txt) p.vy += 90 * dt;
      ctx.globalAlpha = Math.min(1, p.vida / (p.max * 0.4));
      if (p.txt) { texto(ctx, p.txt, p.x + 1, p.y + 1, CONTORNO); texto(ctx, p.txt, p.x, p.y, p.cor); }
      else { ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam); }
      ctx.globalAlpha = 1;
    }
    luzDaHora(ctx, c.hora);
  }

  private desenharTecnico(ctx: CanvasRenderingContext2D, c: Incidente, agora: number): void {
    const e = this.jogo.s();
    if (!e) return;
    const alvo = c.acao ? postoDe(c.acao.no ? noDe(c, c.acao.no) : undefined) : (this.sel() ? postoDe(this.sel()!) : { x: this.tec.x, y: this.tec.y });
    const dx = alvo.x - this.tec.x, dy = alvo.y - this.tec.y;
    const dist = Math.hypot(dx, dy);
    const andando = dist > 1.5;
    if (andando) {
      const v = Math.min(dist, 110 / 60);
      this.tec.x += (dx / dist) * v;
      this.tec.y += (dy / dist) * v;
      this.tec.passo += 0.18;
      if (Math.abs(dx) > Math.abs(dy)) { this.tec.dir = 'lado'; this.tec.esq = dx < 0; } else this.tec.dir = dy < 0 ? 'cima' : 'baixo';
    } else if (c.acao) this.tec.dir = 'cima';
    const frame = andando ? [0, 1, 0, 3][Math.floor(this.tec.passo) % 4]! : 0;
    const marca = CORES_MARCA[e.corMarca] ?? '#8b5cf6';
    const spr = spritePessoa(e.fundador, this.tec.dir, frame, Math.sin(agora * 0.7) > 0.985, marca);
    const x = Math.round(this.tec.x - 16), y = Math.round(this.tec.y - 26 + (c.acao && !andando ? Math.round(Math.sin(agora * 14)) : 0));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(this.tec.x, this.tec.y + 5, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (this.tec.dir === 'lado' && this.tec.esq) { ctx.save(); ctx.translate(x + 32, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
    else ctx.drawImage(spr, x, y);
    // trabalho: anel de progresso e faíscas
    if (c.acao && !andando) {
      const f = (c.hora - c.acao.ini) / (c.acao.fim - c.acao.ini);
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.tec.x, y - 6, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.tec.x, y - 6, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f)); ctx.stroke();
      if (Math.random() < 0.15) this.faiscas(this.tec.x + 10, this.tec.y - 14, '#fde68a', 1);
    }
    // gato: dorme onde farejou, ou acompanha o técnico
    const g = e.gato;
    const ondeGato = c.d['gato'] ? noDe(c, c.d['gato']) : undefined;
    if (ondeGato) {
      const s = spriteGato(g, 'dormir', Math.floor(agora * 2) % 2);
      const topo = ondeGato.tipo === 'pc' ? ondeGato.y - 40 : ondeGato.tipo === 'servidor' ? ondeGato.y - 52 : ondeGato.y - 30;
      ctx.drawImage(s, Math.round(ondeGato.x - 16), Math.round(topo));
    } else {
      const s = spriteGato(g, 'sentar', Math.floor(agora * 1.5) % 2, Math.sin(agora * 0.9) > 0.97);
      ctx.drawImage(s, Math.round(this.tec.x - 30), Math.round(this.tec.y - 22), 24, 24);
    }
  }
}
