// Núcleo de simulação: relógio, mural, economia, árvore e fechamento dos atendimentos. TypeScript puro.
import { Aparencia, Avaliacao, Cliente, Contrato, EstadoJogo, EventoSim, GatoDef, Noticia, ServicoModelo } from './tipos';
import type { Incidente, Regras } from './incidente';
import { resultado } from './incidente';
import { Rng, clamp, escolher } from './rng';
import type { Efeito, No } from '../conteudo/arvore';

export const CUSTO_MENSAL = 145;
export const META_CASOS = 10;
export const META_CAIXA = 10000;
export const SERVICOS_INICIAIS = ['rede', 'virus'];

export interface Mods {
  horas: number;
  ferramentas: number;
  pagamento: number;
  insight: number;
  laudo: number;
  retorno: number;
  capMural: number;
  chanceContrato: number;
  sache: number;
  emergencia: number;
}

export interface Mundo {
  servicos: ServicoModelo[];
  clientes: { nome: string; setor: string; contato: string }[];
  noticias: Noticia[];
  comentarios: { alto: string[]; medio: string[]; baixo: string[] }[];
  origens: { horas: number; ferramentas: number; laudo: number; insight: number; pagamento: number }[];
  nos: No[];
  geradores: { [servico: string]: (ctx: { rng: Rng; ano: number; dif: 1 | 2 | 3; cliente: { nome: string; setor: string; contato: string } }) => Incidente };
  regras: { [servico: string]: Regras };
}

export interface Setup {
  fundador: Aparencia;
  nomeFundador: string;
  origem: number;
  empresa: string;
  corMarca: number;
  gato: GatoDef;
}

export function novoJogo(su: Setup): EstadoJogo {
  return {
    v: 1, ...su,
    dinheiro: 1500, reputacao: 0, insight: 0,
    semana: 0, fracSemana: 0, proxId: 1,
    mural: [], caso: null, avaliacao: null,
    concluidos: 0, melhorNota: 0, compras: [], servicosAbertos: [...SERVICOS_INICIAIS], arvore: ['garagem'], pesquisa: null, reestudo: {}, pago: [], retornos: [], carteira: [], recorde: 0,
    noticiasVistas: 0, noticia: null,
    emprestimo: false, falido: false, ato1Completo: false, tutorial: 0,
  };
}

export function dataDe(semana: number): { ano: number; mes: number; sem: number } {
  return { ano: 1995 + Math.floor(semana / 48), mes: Math.floor((semana % 48) / 4) + 1, sem: (semana % 4) + 1 };
}

type Soma = Required<Pick<Efeito, 'horas' | 'pag' | 'insight' | 'mural' | 'sache' | 'laudo' | 'emergencia' | 'retorno'>>;

export function efeitos(s: EstadoJogo, w: Mundo): Soma {
  const e: Soma = { horas: 0, pag: 0, insight: 0, mural: 0, sache: 0, laudo: 0, emergencia: 0, retorno: 0 };
  for (const id of s.arvore ?? []) {
    const n = w.nos.find((x) => x.id === id);
    if (!n) continue;
    for (const k of Object.keys(e) as (keyof Soma)[]) e[k] += (n.efeito[k] as number | undefined) ?? 0;
  }
  return e;
}

export function mods(s: EstadoJogo, w: Mundo): Mods {
  const o = w.origens[s.origem] ?? { horas: 1, ferramentas: 1, laudo: 1, insight: 1, pagamento: 1 };
  const tem = (id: string) => s.compras.includes(id);
  const a = efeitos(s, w);
  return {
    horas: o.horas * (tem('cafeteira') ? 0.92 : 1) * (tem('monitor15') ? 0.88 : 1) * Math.max(0.4, 1 + a.horas),
    ferramentas: o.ferramentas,
    pagamento: o.pagamento * (1 + a.pag),
    insight: o.insight * (1 + a.insight),
    laudo: o.laudo * (1 + a.laudo),
    retorno: (tem('cadeira') ? 0.8 : 1) * Math.max(0, 1 + a.retorno),
    capMural: (tem('modem56k') ? 4 : 3) + a.mural,
    chanceContrato: tem('modem56k') ? 0.7 : 0.45,
    sache: a.sache + (tem('arranhador') ? 1 : 0),
    emergencia: 1 + a.emergencia,
  };
}

/** Serviços que o jogador pode receber no Mural. */
export function servicosDisponiveis(s: EstadoJogo, w: Mundo): string[] {
  const abertos = new Set([...SERVICOS_INICIAIS, ...(s.servicosAbertos ?? [])]);
  for (const id of s.arvore ?? []) {
    const sv = w.nos.find((n) => n.id === id)?.efeito.servico;
    if (sv) abertos.add(sv);
  }
  return [...abertos];
}

export const capCarteira = (s: EstadoJogo): number => 2 + Math.floor((s.arvore ?? []).length / 8);

export function gerarContrato(s: EstadoJogo, w: Mundo, rng: Rng, boost?: string, deSuporte?: Cliente): Contrato {
  const ano = dataDe(s.semana).ano;
  const abertos = servicosDisponiveis(s, w);
  const disp = w.servicos.filter((x) => x.desdeAno <= ano && abertos.includes(x.id) && w.geradores[x.id]);
  const saco: ServicoModelo[] = [];
  for (const x of disp) for (let i = 0; i < (x.id === boost ? 3 : 1); i++) saco.push(x);
  // cliente de suporte liga com problema: quase sempre vírus ou servidor
  const sv = deSuporte ? (disp.find((x) => x.id === (rng() < 0.65 ? 'virus' : 'servidor')) ?? escolher(rng, disp)) : escolher(rng, saco);
  const usados = new Set([...s.mural.map((c) => c.cliente.nome), ...(s.carteira ?? []).map((c) => c.cliente.nome)]);
  const livres = w.clientes.filter((c) => !usados.has(c.nome));
  const cliente = deSuporte ?? escolher(rng, livres.length ? livres : w.clientes);
  const r = rng();
  const dif: 1 | 2 | 3 = s.reputacao < 12 ? 1 : s.reputacao < 35 ? (r < 0.55 ? 1 : 2) : r < 0.25 ? 1 : r < 0.65 ? 2 : 3;
  const emergencia = !!deSuporte || (s.concluidos >= 2 && sv.id === 'virus' && rng() < 0.3);
  const baseV = [520, 1150, 2200][dif - 1] as number;
  const valor = Math.round((baseV * (0.85 + rng() * 0.35) * (1 + s.reputacao / 150) * (emergencia ? 1.4 * mods(s, w).emergencia : 1) * (deSuporte ? 0.6 : 1)) / 10) * 10;
  const caso = w.geradores[sv.id]!({ rng, ano, dif, cliente });
  if (emergencia) caso.limite = Math.max(4, caso.limite - 1);
  return { id: s.proxId++, cliente, servico: sv.id, briefing: caso.chamado, valor, dif, prazo: caso.limite, expira: s.semana + (deSuporte ? 2 : emergencia ? 3 : 5 + Math.floor(rng() * 5)), emergencia, caso, ...(deSuporte ? { suporte: true } : {}) };
}

export function aceitar(s: EstadoJogo, id: number): boolean {
  if (s.caso) return false;
  const i = s.mural.findIndex((c) => c.id === id);
  if (i < 0) return false;
  const contrato = s.mural.splice(i, 1)[0] as Contrato;
  s.caso = { contrato, inicio: s.semana };
  return true;
}

/** Avança a simulação em dt semanas. Devolve os eventos ocorridos, para som e avisos. */
export function passo(s: EstadoJogo, w: Mundo, dt: number, rng: Rng): EventoSim[] {
  const ev: EventoSim[] = [];
  if (s.falido) return ev;
  const m = mods(s, w);
  if (s.pesquisa && !s.pesquisa.pronta) {
    s.pesquisa.prog += dt;
    if (s.pesquisa.prog >= s.pesquisa.total) {
      s.pesquisa.prog = s.pesquisa.total;
      s.pesquisa.pronta = true;
      ev.push({ tipo: 'pesquisaPronta' });
    }
  }
  s.fracSemana += dt;
  while (s.fracSemana >= 1) {
    s.fracSemana -= 1;
    s.semana++;
    viradaDeSemana(s, w, rng, m, ev);
  }
  return ev;
}

function viradaDeSemana(s: EstadoJogo, w: Mundo, rng: Rng, m: Mods, ev: EventoSim[]): void {
  const d = dataDe(s.semana);
  const prox = w.noticias[s.noticiasVistas];
  if (prox && !s.noticia && (prox.ano < d.ano || (prox.ano === d.ano && prox.mes <= d.mes))) {
    s.noticia = prox;
    s.noticiasVistas++;
    ev.push({ tipo: 'noticia' });
  }
  // clientes mal atendidos ligam de volta
  for (const r of s.retornos.filter((x) => x.semana <= s.semana)) {
    s.reputacao = clamp(s.reputacao - 3, 0, 100);
    ev.push({ tipo: 'retorno', texto: `${r.cliente} ligou: o problema voltou. A causa raiz não foi tratada. Reputação −3.` });
  }
  s.retornos = s.retornos.filter((x) => x.semana > s.semana);
  for (const c of s.mural.filter((x) => x.expira <= s.semana && x.suporte)) {
    s.carteira = (s.carteira ?? []).filter((k) => k.cliente.nome !== c.cliente.nome);
    s.reputacao = clamp(s.reputacao - 4, 0, 100);
    ev.push({ tipo: 'perdeuSuporte', texto: `${c.cliente.nome} cancelou o suporte mensal: ligou com urgência e ninguém apareceu. Reputação −4.` });
  }
  s.mural = s.mural.filter((c) => c.expira > s.semana);
  for (const k of s.carteira ?? []) {
    if (s.mural.some((c) => c.cliente.nome === k.cliente.nome) || s.caso?.contrato.cliente.nome === k.cliente.nome) continue;
    if (rng() < 0.07) {
      s.mural.push(gerarContrato(s, w, rng, undefined, k.cliente));
      ev.push({ tipo: 'suporte', texto: `${k.cliente.nome} ligou: emergência no cliente de suporte! Atenda em até 2 semanas.` });
    }
  }
  const ultima = w.noticias[s.noticiasVistas - 1];
  const boost = ultima && (d.ano - ultima.ano) * 12 + (d.mes - ultima.mes) <= 3 ? ultima.servico : undefined;
  const vazio = s.mural.length === 0 && !s.caso;
  if (s.mural.length < m.capMural && (vazio || rng() < m.chanceContrato)) {
    s.mural.push(gerarContrato(s, w, rng, boost));
    ev.push({ tipo: 'contratoNovo' });
  }
  if (s.semana % 4 === 0) {
    s.dinheiro -= CUSTO_MENSAL;
    s.dinheiro += (s.carteira ?? []).reduce((t, k) => t + k.mensal, 0);
    ev.push({ tipo: 'mes' });
    if (s.dinheiro < 0) {
      if (!s.emprestimo) {
        s.emprestimo = true;
        s.dinheiro += 800;
        ev.push({ tipo: 'emprestimo' });
      } else if (s.dinheiro < -300) {
        s.falido = true;
        ev.push({ tipo: 'falencia' });
      }
    }
  }
}

/** Fecha o atendimento: nota, pagamento, reputação, chance de suporte mensal e de o cliente ligar de volta. */
export function concluirCaso(s: EstadoJogo, w: Mundo, rng: Rng): Avaliacao | null {
  const c = s.caso;
  const inc = c?.contrato.caso;
  if (!c || !inc || !inc.fim) return null;
  const regras = w.regras[inc.modo];
  if (!regras) return null;
  const m = mods(s, w);
  const r = resultado(inc, regras);
  const laudo = Math.min(1, r.laudo * m.laudo);
  const qualidade = Math.round(100 * Math.min(1, r.nota + (laudo - r.laudo) * 0.2));
  const vies = [10 * r.resolucao, 10 * (0.5 * laudo + 0.5 * r.resolucao), 10 * (0.6 * r.tempo + 0.4 * (inc.custos <= (inc.d['verba'] ?? Infinity) ? 1 : 0.5)), 10 * (0.5 * r.danos + 0.5 * (inc.paciencia / 100))];
  const notas = vies.map((v) => Math.round(clamp(v + (rng() - 0.5) * 1.2, 1, 10)));
  const comentarios = notas.map((nota, i) => {
    const banco = w.comentarios[i] ?? { alto: [''], medio: [''], baixo: [''] };
    return escolher(rng, nota >= 8 ? banco.alto : nota >= 5 ? banco.medio : banco.baixo);
  });
  const media = notas.reduce((a, b) => a + b, 0) / notas.length;
  const verba = (inc.d['verba'] as number | undefined) ?? 0;
  const bruto = Math.round((c.contrato.valor * (0.4 + 0.6 * (qualidade / 100)) * m.pagamento) / 10) * 10;
  const pagamento = bruto + verba - inc.custos;
  const rep = Math.round((media - 5.5) * 1.8);
  s.dinheiro += pagamento;
  s.reputacao = clamp(s.reputacao + rep, 0, 100);
  s.concluidos++;
  s.melhorNota = Math.max(s.melhorNota, media);
  s.recorde = Math.max(s.recorde ?? 0, r.estrelas);
  const retorno = r.retorno && rng() < 0.85 * m.retorno;
  if (retorno) s.retornos.push({ semana: s.semana + 2 + Math.floor(rng() * 3), cliente: c.contrato.cliente.nome, servico: c.contrato.servico });
  const nome = w.servicos.find((x) => x.id === c.contrato.servico)?.nome ?? '';
  const naCarteira = (s.carteira ?? []).some((k) => k.cliente.nome === c.contrato.cliente.nome);
  const oferta = !naCarteira && r.estrelas >= 4 && (s.carteira ?? []).length < capCarteira(s)
    ? { cliente: c.contrato.cliente, mensal: Math.round((c.contrato.valor * 0.22 * (1 + c.contrato.dif * 0.15)) / 10) * 10 }
    : undefined;
  const av: Avaliacao = {
    cliente: c.contrato.cliente.nome, servico: nome, qualidade, estrelas: r.estrelas, notas, comentarios, pagamento, custos: inc.custos, rep,
    eixos: { resolucao: r.resolucao, danos: r.danos, laudo, tempo: r.tempo }, horas: inc.hora, prazo: inc.limite, licoes: inc.licoes, retorno,
    ...(oferta ? { oferta } : {}),
  };
  s.avaliacao = av;
  s.caso = null;
  return av;
}

export function aceitarSuporte(s: EstadoJogo): void {
  const o = s.avaliacao?.oferta;
  if (!o) return;
  s.carteira = [...(s.carteira ?? []), { cliente: o.cliente, mensal: o.mensal, desde: s.semana }];
  delete s.avaliacao!.oferta;
}

/** Semanas de jogo que um atendimento consome. */
export const semanasDoCaso = (horas: number): number => Math.max(1, Math.round(horas / 8));

export function comprar(s: EstadoJogo, id: string, preco: number, requer?: string): boolean {
  if (s.compras.includes(id) || s.dinheiro < preco) return false;
  if (requer && !(s.arvore ?? []).includes(requer)) return false;
  s.dinheiro -= preco;
  s.compras.push(id);
  return true;
}

export function podeFazerSimulado(s: EstadoJogo): boolean {
  return s.concluidos >= META_CASOS && s.dinheiro >= META_CAIXA && !s.ato1Completo;
}

// ---------------- árvore de tecnologia ----------------

export function noDisponivel(s: EstadoJogo, id: string, vizinhos: (id: string) => string[]): boolean {
  if ((s.arvore ?? []).includes(id)) return false;
  return vizinhos(id).some((v) => (s.arvore ?? []).includes(v));
}

export function iniciarPesquisa(s: EstadoJogo, id: string, custo: number, semanas: number): boolean {
  if (s.pesquisa) return false;
  if ((s.reestudo[id] ?? 0) > s.semana) return false;
  const jaPago = s.pago.includes(id);
  if (!jaPago && s.insight < custo) return false;
  if (!jaPago) {
    s.insight -= custo;
    s.pago.push(id);
  }
  s.pesquisa = { no: id, prog: 0, total: jaPago ? Math.max(1, semanas / 2) : semanas, pronta: false };
  return true;
}

export function concluirPesquisa(s: EstadoJogo, passou: boolean): void {
  const p = s.pesquisa;
  if (!p) return;
  if (passou) {
    s.arvore.push(p.no);
    s.pago = s.pago.filter((x) => x !== p.no);
  } else {
    s.reestudo[p.no] = s.semana + 2;
  }
  s.pesquisa = null;
}
