import { Injectable, computed, signal } from '@angular/core';
import { Avaliacao, EstadoEstudo, EstadoJogo, EventoSim, GatoDef, Item, Noticia } from './core/tipos';
import * as Sim from './core/sim';
import * as Est from './core/estudo';
import * as C from './core/incidente';
import { embaralhar, escolher } from './core/rng';
import { CLIENTES, COMENTARIOS, ORIGENS, SERVICOS } from './conteudo/servicos';
import { ITENS, LOJA, NOTICIAS, itemPorId, itensDoTopico, itensDosTopicos } from './conteudo/mundo';
import { TOPICOS, topicoPorId } from './conteudo/topicos';
import { CUSTO, NOS, noPorId, vizinhos } from './conteudo/arvore';
import { GERADORES, REGRAS } from './conteudo/incidentes';
import { Som } from './audio/som';

export type Tela = 'titulo' | 'criar' | 'jogo';
export type Painel = 'mural' | 'loja' | 'caderno' | 'arvore' | 'academia' | 'empresa' | 'opcoes' | null;
export type TipoSessao = 'revisao' | 'academia' | 'no' | 'simulado' | 'caderno';

export interface Sessao {
  tipo: TipoSessao;
  titulo: string;
  intro: string;
  itens: Item[];
  i: number;
  respostas: boolean[];
  insight: number;
  consolidadas: number;
  alvo?: string;
  inicio: number;
}

const MUNDO: Sim.Mundo = {
  servicos: SERVICOS, clientes: CLIENTES, noticias: NOTICIAS, comentarios: COMENTARIOS, origens: ORIGENS,
  nos: NOS, geradores: GERADORES, regras: REGRAS,
};

/** Horas de jogo do incidente por segundo real, em velocidade 1. */
export const HORAS_POR_SEG = 0.2;

export interface EfeitoVisual { tipo: string; no?: string; extra?: string; t: number }

const CHAVE_JOGO = 'purple.jogo.v1';
const CHAVE_ESTUDO = 'purple.estudo.v1';

function ler<T>(chave: string): T | null {
  try {
    const s = localStorage.getItem(chave);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function gravar(chave: string, v: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    /* sem armazenamento: o jogo segue sem salvar */
  }
}

@Injectable({ providedIn: 'root' })
export class JogoService {
  readonly som = new Som();
  readonly mundo = MUNDO;
  private rng: () => number = Math.random;

  readonly versao = signal(0);
  estado: EstadoJogo | null = null;
  estudo: EstadoEstudo = ler<EstadoEstudo>(CHAVE_ESTUDO) ?? Est.novoEstudo();

  readonly tela = signal<Tela>('titulo');
  readonly painel = signal<Painel>(null);
  readonly sessao = signal<Sessao | null>(null);
  readonly velocidade = signal(1);
  readonly toast = signal<{ texto: string; id: number } | null>(null);
  readonly temSave = signal(!!ler(CHAVE_JOGO));
  readonly simuladoPassou = signal<null | { acertos: number; total: number; passou: boolean }>(null);
  /** Velocidade do relógio do incidente: 0 pausa. */
  readonly velCaso = signal(1);
  /** Efeitos visuais pendentes do incidente, consumidos pelo mapa. */
  readonly fxFila: EfeitoVisual[] = [];
  private ultimoToque = 0;
  readonly fx: C.Fx = {
    efeito: (tipo, no, extra) => {
      this.fxFila.push({ tipo, ...(no ? { no } : {}), ...(extra ? { extra } : {}), t: performance.now() });
      if (this.fxFila.length > 60) this.fxFila.splice(0, 20);
      switch (tipo) {
        case 'infecta': this.som.risco(); break;
        case 'limpa': this.som.riscoFix(); break;
        case 'acerta': this.som.momento(); break;
        case 'erra': case 'quebra': this.som.erro(); break;
        case 'bloqueia': this.som.clique(); break;
        case 'alerta': this.som.bolhaT(); break;
        case 'conclui': this.som.moeda(); break;
      }
    },
  };

  private ultimo = 0;
  hora = 9;

  // `equal: () => false` porque o estado é o mesmo objeto, mutado no lugar.
  readonly s = computed(
    () => {
      this.versao();
      return this.estado;
    },
    { equal: () => false },
  );

  readonly pausado = computed(() => {
    this.versao();
    const e = this.estado;
    if (!e) return true;
    return this.velocidade() === 0 || !!this.painel() || !!this.sessao() || !!e.noticia || !!e.avaliacao || e.falido || !!this.simuladoPassou() || !!e.caso;
  });

  constructor() {
    const loop = (t: number) => {
      const dt = this.ultimo ? Math.min(0.1, (t - this.ultimo) / 1000) : 0;
      this.ultimo = t;
      this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    (window as unknown as { purple: JogoService }).purple = this; // acesso pelo console, para depuração
  }

  tocar(): void {
    this.versao.update((v) => v + 1);
  }

  dia(): number {
    return Est.hoje();
  }

  // ---------------- ciclo ----------------
  private tick(dt: number): void {
    const e = this.estado;
    if (!e || this.tela() !== 'jogo') return;
    this.hora = (this.hora + dt * (24 / 240) * (this.pausado() ? 0.35 : 1)) % 24;
    const inc = e.caso?.contrato.caso;
    if (inc && !inc.fim && !this.painel()) {
      const r = REGRAS[inc.modo];
      if (r && !inc.pendente && this.velCaso() > 0) C.passo(inc, r, dt * HORAS_POR_SEG * this.velCaso(), this.rng, this.fx);
      if (inc.pendente === '?') this.sortearPergunta(inc);
      const agora = performance.now();
      if (agora - this.ultimoToque > 180) {
        this.ultimoToque = agora;
        this.tocar();
      }
    }
    if (this.pausado()) return;
    this.processar(Sim.passo(e, MUNDO, dt * 0.2 * this.velocidade(), this.rng));
  }

  private processar(ev: EventoSim[]): void {
    if (!ev.length) return;
    for (const x of ev) {
      switch (x.tipo) {
        case 'noticia': this.som.noticia(); break;
        case 'contratoNovo': this.aviso('Contrato novo no Mural'); break;
        case 'emprestimo': this.aviso('O caixa ficou negativo. O banco emprestou R$ 800, uma vez só.'); break;
        case 'mes': this.salvar(); break;
        case 'pesquisaPronta': this.som.noticia(); this.aviso('Pesquisa concluída! Faça a prova de conceito para conquistar o nó.'); break;
        case 'retorno': this.som.erro(); this.aviso(x.texto ?? 'Um cliente ligou de volta.'); break;
        case 'suporte': this.som.noticia(); this.aviso(x.texto ?? 'Emergência de cliente do suporte!'); break;
        case 'perdeuSuporte': this.som.erro(); this.aviso(x.texto ?? 'Um cliente cancelou o suporte.'); break;
      }
    }
    this.tocar();
  }

  aviso(texto: string): void {
    this.toast.set({ texto, id: Date.now() });
  }

  // ---------------- início ----------------
  novo(su: Sim.Setup): void {
    this.estado = Sim.novoJogo(su);
    this.estado.mural.push(Sim.gerarContrato(this.estado, MUNDO, this.rng));
    this.estado.mural.push(Sim.gerarContrato(this.estado, MUNDO, this.rng));
    const n0 = NOTICIAS[0];
    if (n0) {
      this.estado.noticia = n0;
      this.estado.noticiasVistas = 1;
    }
    this.hora = 9;
    this.tela.set('jogo');
    this.salvar();
    this.tocar();
  }

  private migrar(e: EstadoJogo): EstadoJogo {
    e.servicosAbertos ??= [...Sim.SERVICOS_INICIAIS];
    e.arvore ??= ['garagem'];
    e.pesquisa ??= null;
    e.reestudo ??= {};
    e.pago ??= [];
    e.retornos ??= [];
    e.carteira ??= [];
    e.recorde ??= 0;
    // até a versão 0.1 o atendimento era outro: o atendimento em andamento e o mural são refeitos
    const novo = (c: { caso?: { modo?: string } }) => !!c.caso?.modo;
    if (e.caso && !novo(e.caso.contrato as never)) e.caso = null;
    e.mural = (e.mural ?? []).filter((c) => novo(c as never));
    if (e.avaliacao && !(e.avaliacao as { licoes?: unknown }).licoes) e.avaliacao = null;
    if (!e.mural.length && !e.caso) e.mural.push(Sim.gerarContrato(e, MUNDO, this.rng));
    return e;
  }

  continuar(): void {
    const e = ler<EstadoJogo>(CHAVE_JOGO);
    if (!e) return;
    this.estado = this.migrar(e);
    this.tela.set('jogo');
    this.tocar();
    if (this.vencidosHoje().length >= 3 && this.estudo.revisaoDia !== this.dia()) {
      setTimeout(() => this.aviso(`Bom dia! ${this.vencidosHoje().length} conceitos pedem revisão hoje. Abra o Caderno.`), 800);
    }
  }

  salvar(): void {
    if (this.estado) gravar(CHAVE_JOGO, this.estado);
    gravar(CHAVE_ESTUDO, this.estudo);
    this.temSave.set(!!this.estado);
  }

  exportar(): string {
    return JSON.stringify({ jogo: this.estado, estudo: this.estudo });
  }

  importar(txt: string): boolean {
    try {
      const d = JSON.parse(txt) as { jogo?: EstadoJogo; estudo?: EstadoEstudo };
      if (d.estudo?.v === 1) this.estudo = d.estudo;
      if (d.jogo?.v === 1) this.estado = this.migrar(d.jogo);
      this.salvar();
      this.tocar();
      return true;
    } catch {
      return false;
    }
  }

  // ---------------- mural ----------------
  aceitar(id: number): void {
    const e = this.estado;
    if (!e) return;
    if (Sim.aceitar(e, id)) {
      const inc = e.caso?.contrato.caso;
      if (inc) inc.d['temHeur'] = this.temNo('ferr:heur');
      this.velCaso.set(1);
      this.fxFila.length = 0;
      this.som.carimbo();
      this.painel.set(null);
      if (e.tutorial === 0) e.tutorial = 1;
      this.salvar();
      this.tocar();
    }
  }

  recusar(id: number): void {
    const e = this.estado;
    if (!e) return;
    e.mural = e.mural.filter((c) => c.id !== id);
    this.som.clique();
    this.tocar();
  }

  // ---------------- atendimento (incidente em tempo real) ----------------
  caso(): C.Incidente | null {
    return this.estado?.caso?.contrato.caso ?? null;
  }

  regras(): C.Regras | null {
    const c = this.caso();
    return c ? (REGRAS[c.modo] ?? null) : null;
  }

  /** Requisitos: nó da árvore pelo id, ou ferramenta liberada por algum nó ('ferr:heur'). */
  temNo(no: string): boolean {
    const e = this.estado;
    if (!e) return false;
    if (no.startsWith('ferr:')) {
      const f = no.slice(5);
      return e.arvore.some((id) => noPorId(id)?.efeito.ferramenta === f);
    }
    if (no === 'equip3' && e.compras.includes('switch')) return true;
    return e.arvore.includes(no);
  }

  multHoras(a: C.AcaoDef): number {
    if (!this.estado) return 1;
    const m = Sim.mods(this.estado, MUNDO);
    return m.horas * (a.tipo === 'ferramenta' ? m.ferramentas : 1);
  }

  podeAgir(acao: C.AcaoDef, noId: string | null): true | string {
    const c = this.caso();
    const r = this.regras();
    if (!c || !r) return 'Sem atendimento.';
    if (c.acao) return 'O técnico está ocupado.';
    return C.podeAgir(c, r, acao, C.no(c, noId) ?? null, (n) => this.temNo(n));
  }

  /** Começa uma ação. `arg` leva o detalhe que a ação precisa (serviço, sub-rede). */
  agir(acaoId: string, noId: string | null, arg?: unknown): boolean {
    const c = this.caso();
    const r = this.regras();
    const a = r && C.acaoDef(r, acaoId);
    if (!c || !r || !a) return false;
    if (arg !== undefined) {
      if (typeof arg === 'string') c.d['alvoServico'] = arg;
      else c.d['arg'] = arg;
    }
    const ok = C.iniciar(c, r, acaoId, noId, this.multHoras(a), (n) => this.temNo(n), this.rng, this.fx);
    if (ok) {
      this.som.clique();
      if (this.estado && this.estado.tutorial === 1) this.estado.tutorial = 2;
      if (this.velCaso() === 0 && a.horas > 0) this.velCaso.set(1);
    }
    this.tocar();
    return ok;
  }

  cancelarAcao(): void {
    const c = this.caso();
    if (!c?.acao) return;
    C.cancelar(c);
    this.som.clique();
    this.tocar();
  }

  private sortearPergunta(inc: C.Incidente): void {
    const pool = itensDosTopicos(inc.topicos).filter((i) => i.formato === 'mcq' || i.formato === 'ce');
    const usados = new Set(inc.respostas.map((r) => r.item));
    if (!pool.length) { inc.pendente = null; return; }
    const it = Est.escolherItem(this.estudo, pool, this.dia(), this.rng, usados);
    inc.pendente = it.id;
    this.som.noticia();
    this.tocar();
  }

  perguntaAtual(): Item | null {
    const c = this.caso();
    return c?.pendente && c.pendente !== '?' ? (itemPorId(c.pendente) ?? null) : null;
  }

  responderPerguntaCaso(acerto: boolean, usouDica = false): Est.ResultadoResposta | null {
    const c = this.caso();
    const it = this.perguntaAtual();
    if (!c || !it) return null;
    const mult = this.estado ? Sim.mods(this.estado, MUNDO).insight : 1;
    const r = Est.responder(this.estudo, it, acerto, this.dia(), usouDica, mult);
    if (this.estado) this.estado.insight += r.insight;
    if (acerto) this.som.acerto(); else this.som.erro();
    gravar(CHAVE_ESTUDO, this.estudo);
    this.tocar();
    return r;
  }

  fecharPerguntaCaso(acerto: boolean): void {
    const c = this.caso();
    const it = this.perguntaAtual();
    if (!c || !it) return;
    C.responderPergunta(c, it.id, acerto);
    this.tocar();
  }

  encerrarVisita(): void {
    const c = this.caso();
    const r = this.regras();
    if (!c || !r || c.fim) return;
    C.encerrar(c, r, this.rng);
    this.som.carimbo();
    this.tocar();
  }

  responderLaudo(i: number, escolha: number): void {
    const c = this.caso();
    const l = c?.laudo[i];
    if (!c || !l || l.escolha !== undefined) return;
    l.escolha = escolha;
    const ok = escolha === l.correta;
    if (l.item) {
      const it = itemPorId(l.item);
      const mult = this.estado ? Sim.mods(this.estado, MUNDO).insight : 1;
      if (it) {
        const r = Est.responder(this.estudo, it, ok, this.dia(), false, mult);
        if (this.estado) this.estado.insight += r.insight;
      }
    }
    if (ok) this.som.acerto(); else this.som.erro();
    gravar(CHAVE_ESTUDO, this.estudo);
    this.tocar();
  }

  /** Entrega o laudo: lições viram estudo, o tempo passa no relógio e sai a avaliação. */
  entregar(): void {
    const e = this.estado;
    const c = this.caso();
    if (!e || !c || !c.fim || c.laudo.some((l) => l.escolha === undefined)) return;
    // decisões tomadas no campo alimentam a revisão espaçada (uma vez por conceito)
    const vistos = new Set(c.laudo.map((l) => l.item).filter(Boolean) as string[]);
    const mult = Sim.mods(e, MUNDO).insight;
    for (const l of c.licoes) {
      if (!l.item || vistos.has(l.item)) continue;
      vistos.add(l.item);
      const it = itemPorId(l.item);
      if (!it) continue;
      const r = Est.responder(this.estudo, it, l.ok, this.dia(), false, mult * 0.5);
      e.insight += r.insight;
    }
    const semanas = Sim.semanasDoCaso(c.hora);
    const av = Sim.concluirCaso(e, MUNDO, this.rng);
    if (!av) return;
    for (let i = 0; i < semanas; i++) this.processar(Sim.passo(e, MUNDO, 1, this.rng));
    if (e.tutorial < 3) e.tutorial = 3;
    this.fxFila.length = 0;
    this.som.carimbo();
    setTimeout(() => this.som.moeda(), 400);
    gravar(CHAVE_ESTUDO, this.estudo);
    this.salvar();
    this.tocar();
  }

  aceitarSuporte(): void {
    const e = this.estado;
    if (!e) return;
    Sim.aceitarSuporte(e);
    this.som.fanfarra();
    this.aviso('Novo cliente de suporte mensal na carteira.');
    this.salvar();
    this.tocar();
  }

  /** O gato fareja o que importa: aponta um nó ou dá um empurrãozinho. */
  ajudaDoGato(): string | null {
    const c = this.caso();
    if (!c || c.fim || !this.usarSache()) return null;
    const nome = this.estado?.gato.nome ?? 'O gato';
    const aponta = (id: string, txt: string) => { c.d['gato'] = id; this.tocar(); return `${nome} ${txt}`; };
    switch (c.modo) {
      case 'virus': {
        const escondido = c.nos.find((n) => n.infec > 0 && !n.visto);
        if (escondido) return aponta(escondido.id, `foi dormir em cima do ${escondido.nome}. Está quentinho demais.`);
        const ruim = c.nos.find((n) => n.infec > 0);
        if (ruim) return aponta(ruim.id, `está arranhando o ${ruim.nome}. Ainda tem coisa ali.`);
        if (!c.d['varreu']) return `${nome} sentou do lado do antivírus e olhou para você. Confirme com a varredura final.`;
        break;
      }
      case 'servidor': {
        if (C.no(c, 'srv') && (c.d['servicos'] as { conhecido: boolean }[]).some((s) => !s.conhecido)) return aponta('srv', 'cheirou o servidor e espirrou. Será que você sabe tudo o que está aberto ali? (netstat)');
        if (!c.d['contasVistas']) return aponta('srv', 'deitou no teclado e digitou "users". Talvez valha listar as contas.');
        if (!c.d['patches']) return aponta('srv', 'está sentado em cima do CD de atualizações.');
        break;
      }
      case 'rede': {
        const o = c.obj.find((x) => !x.feito);
        if (o) return `${nome} miou para "${o.txt}". Releia o que o cliente pediu e pense na camada certa.`;
        break;
      }
      case 'enderecos': {
        const plano = (c.d['setores'] as { nome: string; cfg: unknown }[]);
        const falta = plano.find((s) => !s.cfg);
        if (falta) return `${nome} empurrou um papel: "do maior setor para o menor, cada sub-rede começa onde a anterior termina".`;
        break;
      }
      case 'diagnostico': {
        const n = c.nos.find((x) => !x.visto && x.tags.some((t) => t.startsWith('achado:')));
        if (n) return aponta(n.id, `está farejando ${n.nome}.`);
        break;
      }
    }
    this.tocar();
    return `${nome} bocejou. Parece que você já achou o que importa.`;
  }

  fecharAvaliacao(): void {
    const e = this.estado;
    if (!e) return;
    e.avaliacao = null;
    this.tocar();
  }

  fecharNoticia(): void {
    const e = this.estado;
    if (!e) return;
    e.noticia = null;
    this.som.clique();
    this.tocar();
  }

  comprar(id: string): void {
    const e = this.estado;
    const it = LOJA.find((l) => l.id === id);
    if (!e || !it) return;
    if (Sim.comprar(e, id, it.preco, it.requer)) {
      this.som.moeda();
      this.aviso(`${it.nome} chegou na garagem.`);
      this.salvar();
      this.tocar();
    }
  }

  afagarGato(): void {
    this.som.ronronar();
  }

  miar(): void {
    this.som.miau();
  }

  // ---------------- estudo ----------------
  extraSache(): number {
    return this.estado ? Sim.mods(this.estado, MUNDO).sache : 0;
  }

  saches(): number {
    return Est.sachesRestantes(this.estudo, this.dia(), this.extraSache());
  }

  usarSache(): boolean {
    if (this.saches() <= 0) return false;
    Est.usarSache(this.estudo, this.dia());
    this.som.miau();
    return true;
  }

  vencidosHoje(): Item[] {
    return Est.itensVencidos(this.estudo, ITENS, this.dia());
  }

  maestria(topico: string): Est.Maestria {
    return Est.maestria(this.estudo, itensDoTopico(topico), this.dia());
  }

  responder(acerto: boolean, usouDica: boolean): Est.ResultadoResposta | null {
    const s = this.sessao();
    if (!s) return null;
    const item = s.itens[s.i];
    if (!item) return null;
    const origem = this.estado ? Sim.mods(this.estado, MUNDO).insight : 1;
    const bonusRevisao = s.tipo === 'revisao' ? 1.5 : 1;
    const r = Est.responder(this.estudo, item, acerto, this.dia(), usouDica, origem * bonusRevisao);
    s.respostas.push(acerto);
    s.insight += r.insight;
    if (r.consolidada) s.consolidadas++;
    if (this.estado) this.estado.insight += r.insight;
    if (acerto) this.som.acerto(); else this.som.erro();
    this.sessao.set({ ...s });
    gravar(CHAVE_ESTUDO, this.estudo);
    this.tocar();
    return r;
  }

  avancar(): void {
    const s = this.sessao();
    if (!s) return;
    if (s.i + 1 < s.itens.length) {
      this.sessao.set({ ...s, i: s.i + 1 });
      return;
    }
    this.encerrarSessao(s);
  }

  private encerrarSessao(s: Sessao): void {
    const e = this.estado;
    const acertos = s.respostas.filter((x) => x).length;
    if (s.tipo === 'revisao') {
      this.estudo.revisaoDia = this.dia();
      this.aviso(`Revisão concluída: ${acertos} de ${s.itens.length}. +${s.insight} Insight.`);
    }
    if (s.tipo === 'no' && e && s.alvo) {
      const no = noPorId(s.alvo);
      const passou = !!no && acertos >= CUSTO[no.tipo].minimo;
      Sim.concluirPesquisa(e, passou);
      if (no && passou) {
        this.som.fanfarra();
        this.aviso(`Nó conquistado: ${no.nome}.`);
      } else if (no) {
        this.aviso(`A prova não convenceu. Revise ${topicoPorId(no.topico).nome} na Academia. Nova tentativa em 2 semanas, sem custo de Insight.`);
      }
    }
    if (s.tipo === 'simulado' && e) {
      const passou = acertos / s.itens.length >= 0.7;
      if (passou) {
        e.ato1Completo = true;
        this.som.fanfarra();
      }
      this.simuladoPassou.set({ acertos, total: s.itens.length, passou });
    }
    this.sessao.set(null);
    this.salvar();
    this.tocar();
  }

  abandonarSessao(): void {
    const s = this.sessao();
    if (!s || s.tipo === 'no') return;
    if (s.respostas.length) this.encerrarSessao({ ...s, itens: s.itens.slice(0, s.respostas.length) });
    else this.sessao.set(null);
  }

  iniciarRevisao(): void {
    const venc = embaralhar(this.rng, this.vencidosHoje()).slice(0, 10);
    if (!venc.length) return;
    this.painel.set(null);
    this.sessao.set({ tipo: 'revisao', titulo: 'Revisão do dia', intro: 'Conceitos que você viu nos atendimentos e nos estudos, na forma da banca. Revisar hoje rende 50% a mais de Insight.', itens: venc, i: 0, respostas: [], insight: 0, consolidadas: 0, inicio: Date.now() });
  }

  refazerCaderno(): void {
    const ids = this.estudo.caderno.filter((r) => !r.resolvido).map((r) => r.itemId);
    const itens = ids.map((id) => itemPorId(id)).filter((x): x is Item => !!x).slice(0, 10);
    if (!itens.length) return;
    this.painel.set(null);
    this.sessao.set({ tipo: 'caderno', titulo: 'Caderno de Erros', intro: 'Acertar agora o que você errou antes consolida a lição e rende Insight extra.', itens, i: 0, respostas: [], insight: 0, consolidadas: 0, inicio: Date.now() });
  }

  treinar(topico: string, n = 5): void {
    const pool = itensDoTopico(topico);
    const itens: Item[] = [];
    const usados = new Set<string>();
    for (let k = 0; k < Math.min(n, pool.length); k++) {
      const it = Est.escolherItem(this.estudo, pool, this.dia(), this.rng, usados);
      usados.add(it.id);
      itens.push(it);
    }
    this.painel.set(null);
    this.sessao.set({ tipo: 'academia', titulo: `Academia · ${topicoPorId(topico).nome}`, intro: topicoPorId(topico).resumo, itens, i: 0, respostas: [], insight: 0, consolidadas: 0, alvo: topico, inicio: Date.now() });
  }

  // ---------------- árvore ----------------
  noDisponivel(id: string): boolean {
    return !!this.estado && Sim.noDisponivel(this.estado, id, vizinhos);
  }

  pesquisar(id: string): void {
    const e = this.estado;
    const no = noPorId(id);
    if (!e || !no || !this.noDisponivel(id)) return;
    const c = CUSTO[no.tipo];
    if (Sim.iniciarPesquisa(e, id, c.insight, c.semanas)) {
      this.som.carimbo();
      this.aviso(`Pesquisando ${no.nome}.`);
      this.salvar();
      this.tocar();
    }
  }

  cancelarPesquisa(): void {
    const e = this.estado;
    if (!e?.pesquisa) return;
    e.pesquisa = null;
    this.tocar();
  }

  provaDoNo(): void {
    const e = this.estado;
    const p = e?.pesquisa;
    if (!e || !p?.pronta || e.caso) return;
    const no = noPorId(p.no);
    if (!no) return;
    const c = CUSTO[no.tipo];
    const proprios = no.itens.map((id) => itemPorId(id)).filter((x): x is Item => !!x);
    const itens: Item[] = [];
    const usados = new Set<string>();
    for (let k = 0; k < c.questoes; k++) {
      const pool = proprios.filter((it) => !usados.has(it.id));
      const fonte = pool.length ? pool : itensDoTopico(no.topico);
      const it = Est.escolherItem(this.estudo, fonte, this.dia(), this.rng, usados);
      usados.add(it.id);
      itens.push(it);
    }
    this.painel.set(null);
    const req = c.minimo === c.questoes ? (c.questoes === 1 ? 'Acerte a questão' : `Acerte as ${c.questoes} questões`) : `Acerte ${c.minimo} de ${c.questoes}`;
    this.sessao.set({ tipo: 'no', titulo: `Prova de conceito · ${no.nome}`, intro: `${req} para conquistar o nó.`, itens, i: 0, respostas: [], insight: 0, consolidadas: 0, alvo: no.id, inicio: Date.now() });
  }

  iniciarSimulado(): void {
    const e = this.estado;
    if (!e || !Sim.podeFazerSimulado(e)) return;
    const itens: Item[] = [];
    const topicos = TOPICOS.filter((t) => t.ato === 1);
    let k = 0;
    while (itens.length < 20) {
      const t = topicos[k % topicos.length]!;
      const pool = itensDoTopico(t.id).filter((it) => !itens.includes(it));
      if (pool.length) itens.push(escolher(this.rng, pool));
      k++;
    }
    this.painel.set(null);
    this.sessao.set({ tipo: 'simulado', titulo: 'Simulado de certificação · Ato 1', intro: '20 questões de todos os temas do Ato 1, no formato FCC. Acerte 70% para levar a empresa à sala comercial. Sem dicas do gato.', itens: embaralhar(this.rng, itens), i: 0, respostas: [], insight: 0, consolidadas: 0, inicio: Date.now() });
  }

  fecharSimulado(): void {
    this.simuladoPassou.set(null);
    this.tocar();
  }

  noticiaAtual(): Noticia | null {
    return this.estado?.noticia ?? null;
  }

  avaliacaoAtual(): Avaliacao | null {
    return this.estado?.avaliacao ?? null;
  }

  recomecar(): void {
    this.estado = null;
    try {
      localStorage.removeItem(CHAVE_JOGO);
    } catch {
      /* nada */
    }
    this.temSave.set(false);
    this.painel.set(null);
    this.tela.set('titulo');
    this.tocar();
  }

  gatoPadrao(): GatoDef {
    return { nome: 'Mingau', pelagem: 0, olhos: 0, acessorio: 1, corAcessorio: 0, personalidade: 0 };
  }
}
