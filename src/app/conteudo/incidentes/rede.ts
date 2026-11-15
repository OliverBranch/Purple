// Montagem de rede: o cliente tem exigências (velocidade, sigilo, Internet para todos,
// um galpão longe, um setor separado) e você tem vagas para equipamentos. Hub, switch,
// bridge, repetidor e roteador custam diferente e se comportam diferente: colisões,
// broadcast, alcance e NAT aparecem no mapa enquanto o tráfego passa.
import { AcaoDef, Incidente, Laudo, Licao, LinkInc, NoInc, Regras, TipoNo, licao, no, novoIncidente, registrar, tem } from '../../core/incidente';
import { Rng, clamp, escolher } from '../../core/rng';
import { Ctx, FUNCIONARIOS, nN, opcoes, sortear } from './comum';
import { embaralhar } from '../../core/rng';

type Req = 'velocidade' | 'sigilo' | 'internet' | 'distancia' | 'setor';

export const PRECOS: Record<string, number> = { hub: 90, switch: 480, bridge: 260, repetidor: 120, roteador: 950 };
const NOMES_EQ: Record<string, string> = { hub: 'Hub', switch: 'Switch', bridge: 'Bridge', repetidor: 'Repetidor', roteador: 'Roteador' };

export const ACOES_REDE: AcaoDef[] = [
  { id: 'conversar', nome: 'Ouvir o cliente', desc: 'O que ele precisa, nas palavras dele.', horas: 0.3, alvo: null, tipo: 'ferramenta', icone: 'fala' },
  { id: 'testar', nome: 'Teste de carga', desc: 'Todo mundo usando ao mesmo tempo: mede colisões, alcance e acesso à Internet.', horas: 0.8, alvo: null, tipo: 'ferramenta', icone: 'radar' },
  { id: 'inst_hub', nome: 'Instalar hub', desc: 'Repetidor multiporta (camada 1): repete tudo para todas as portas. Um só domínio de colisão.', horas: 0.5, alvo: ['slot', 'hub', 'switch', 'bridge', 'repetidor', 'roteador'], tipo: 'acao', custo: PRECOS['hub'], icone: 'hub' },
  { id: 'inst_repetidor', nome: 'Instalar repetidor', desc: 'Regenera o sinal (camada 1) para o cabo ir mais longe.', horas: 0.5, alvo: ['slot', 'hub', 'switch', 'bridge', 'repetidor', 'roteador'], tipo: 'acao', custo: PRECOS['repetidor'], icone: 'repetidor' },
  { id: 'inst_bridge', nome: 'Instalar bridge', desc: 'Camada 2 com duas portas: separa dois domínios de colisão.', horas: 0.6, alvo: ['slot', 'hub', 'switch', 'bridge', 'repetidor', 'roteador'], tipo: 'acao', custo: PRECOS['bridge'], icone: 'bridge' },
  { id: 'inst_switch', nome: 'Instalar switch', desc: 'Camada 2: entrega o quadro só na porta do destino. Cada porta é um domínio de colisão.', horas: 0.7, alvo: ['slot', 'hub', 'switch', 'bridge', 'repetidor', 'roteador'], tipo: 'acao', custo: PRECOS['switch'], icone: 'switch' },
  { id: 'inst_roteador', nome: 'Instalar roteador', desc: 'Camada 3: liga redes diferentes, não repassa broadcast e faz NAT para a Internet.', horas: 1, alvo: ['slot', 'hub', 'switch', 'bridge', 'repetidor', 'roteador'], tipo: 'acao', custo: PRECOS['roteador'], icone: 'roteador' },
];

interface Vaga { id: string; papel: 'central' | 'borda' | 'setor' | 'longe' }

export function gerarRede(c: Ctx): Incidente {
  const { rng, dif } = c;
  const pool: Req[] = ['velocidade', 'sigilo', 'internet', 'distancia', 'setor'];
  const reqs: Req[] = ['velocidade', ...sortear(rng, pool.filter((r) => r !== 'velocidade'), dif === 1 ? 1 : dif === 2 ? 2 : 3)];
  const nomes = embaralhar(rng, FUNCIONARIOS);
  const nos: NoInc[] = [nN('internet', 'internet', 'Internet', 34, 30), nN('modem', 'modem', 'Modem 33.6k', 70, 92)];
  const links: LinkInc[] = [{ a: 'internet', b: 'modem', tipo: 'discada' }];
  const vagas: Vaga[] = [{ id: 'central', papel: 'central' }];
  const antigo = rng() < 0.5;
  nos.push(nN('central', antigo ? 'hub' : 'slot', antigo ? 'Hub velho' : 'Vaga: rack central', 230, 96, { tags: ['vaga'] }));
  if (reqs.includes('internet')) {
    nos.push(nN('borda', 'slot', 'Vaga: entre a rede e o modem', 150, 92, { tags: ['vaga'] }));
    links.push({ a: 'modem', b: 'borda', tipo: 'cabo' }, { a: 'borda', b: 'central', tipo: 'cabo' });
    vagas.push({ id: 'borda', papel: 'borda' });
  } else links.push({ a: 'modem', b: 'central', tipo: 'cabo' });
  const nMain = dif === 1 ? 5 : dif === 2 ? 6 : 7;
  const larg = reqs.includes('setor') ? 260 : 380;
  for (let i = 0; i < nMain; i++) {
    const fil = i < Math.ceil(nMain / 2) ? 0 : 1;
    const k = fil === 0 ? i : i - Math.ceil(nMain / 2);
    const qtd = fil === 0 ? Math.ceil(nMain / 2) : Math.floor(nMain / 2);
    const dono = i === 0 ? c.cliente.contato : (nomes[i] as string);
    const pc = nN(`pc${i + 1}`, 'pc', `Micro de ${dono}`, Math.round(40 + (larg / qtd) * (k + 0.5)), fil === 0 ? 168 : 230, { dono, arte: Math.floor(rng() * 1000) });
    if (i === 1 && reqs.includes('sigilo')) { pc.tags.push('caixa'); pc.nome = `Caixa (${dono})`; }
    nos.push(pc);
    links.push({ a: pc.id, b: 'central', tipo: 'cabo' });
  }
  nos.push(nN('imp', 'impressora', 'Impressora', 300, 92));
  links.push({ a: 'imp', b: 'central', tipo: 'cabo' });
  if (reqs.includes('setor')) {
    nos.push(nN('setor', 'slot', 'Vaga: entrada do financeiro', 352, 150, { tags: ['vaga'] }));
    links.push({ a: 'central', b: 'setor', tipo: 'cabo' });
    vagas.push({ id: 'setor', papel: 'setor' });
    for (let i = 0; i < 2; i++) {
      const dono = nomes[nMain + i] as string;
      const pc = nN(`fin${i + 1}`, 'pc', `Financeiro: ${dono}`, 330 + i * 64, 218, { dono, tags: ['fin'], arte: Math.floor(rng() * 1000) });
      nos.push(pc);
      links.push({ a: pc.id, b: 'setor', tipo: 'cabo' });
    }
  }
  if (reqs.includes('distancia')) {
    nos.push(nN('longe', 'slot', 'Vaga: meio do caminho', 360, 60, { tags: ['vaga'] }));
    links.push({ a: 'central', b: 'longe', tipo: 'longo', metros: 90 });
    const dono = nomes[nMain + 3] as string;
    const pc = nN('dep1', 'pc', `Galpão: ${dono}`, 446, 98, { dono, tags: ['galpao'], arte: Math.floor(rng() * 1000) });
    nos.push(pc);
    links.push({ a: 'longe', b: 'dep1', tipo: 'longo', metros: 85 });
    vagas.push({ id: 'longe', papel: 'longe' });
  }
  const verba = Math.round((reqs.reduce((s, r) => s + ({ velocidade: 480, sigilo: 0, internet: 950, distancia: 120, setor: 950 } as Record<Req, number>)[r], 0) * 1.3) / 10) * 10;
  const pedidos: Record<Req, string> = {
    velocidade: 'a rede não pode ficar lenta quando todo mundo usa',
    sigilo: 'ninguém pode bisbilhotar o tráfego do caixa',
    internet: 'todos os micros precisam navegar ao mesmo tempo, com uma linha só',
    distancia: 'o micro do galpão, a 175 metros, tem que entrar na rede',
    setor: 'o financeiro fica numa rede separada, sem o broadcast dos outros',
  };
  const inc = novoIncidente({
    modo: 'rede', titulo: antigo ? 'O hub que não aguenta mais' : 'Rede nova em folha',
    chamado: `${c.cliente.contato}: "${antigo ? 'Nossa rede de hub está uma carroça.' : 'Compramos os micros, agora falta a rede.'} Precisa de três coisas: ${reqs.map((r) => pedidos[r]).join('; ')}."`,
    contato: c.cliente.contato, dif, ano: c.ano, topicos: ['equip', 'osi'], nos, links, limite: [6, 7, 8][dif - 1] as number,
    d: { reqs, vagas, verba, testes: 0, conversou: false, ultimoTeste: null },
  });
  inc.perguntasEm = dif === 1 ? [inc.limite * 0.5] : [inc.limite * 0.3, inc.limite * 0.65];
  registrar(inc, `Orçamento de material combinado: R$ ${verba}. O que passar disso sai do seu lucro; o que sobrar também.`, 'sistema');
  return inc;
}

// ---------------- topologia ----------------

const L1 = new Set<TipoNo>(['hub', 'repetidor']);
const L2 = new Set<TipoNo>(['switch', 'bridge']);
const HOST = new Set<TipoNo>(['pc', 'impressora', 'servidor']);

export interface Analise {
  colisao: { links: number[]; hosts: string[]; taxa: number }[];
  broadcast: number;
  alcance: Record<string, boolean>;
  internet: 'ok' | 'um' | 'nada';
}

function uf(n: number) {
  const p = Array.from({ length: n }, (_, i) => i);
  const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x] as number)));
  return { f, u: (a: number, b: number) => { p[f(a)] = f(b); } };
}

/** Domínios de colisão e de broadcast da rede interna (sem o enlace do modem). */
export function analisar(inc: Incidente): Analise {
  const internos = inc.links.map((l, i) => ({ l, i })).filter(({ l }) => {
    const a = no(inc, l.a)!, b = no(inc, l.b)!;
    return a.tipo !== 'internet' && b.tipo !== 'internet' && a.tipo !== 'modem' && b.tipo !== 'modem' && a.tipo !== 'slot' && b.tipo !== 'slot';
  });
  const col = uf(inc.links.length);
  const bc = uf(inc.links.length);
  for (const n of inc.nos) {
    const meus = internos.filter(({ l }) => l.a === n.id || l.b === n.id).map(({ i }) => i);
    for (let k = 1; k < meus.length; k++) {
      if (L1.has(n.tipo)) col.u(meus[0] as number, meus[k] as number);
      if (L1.has(n.tipo) || L2.has(n.tipo)) bc.u(meus[0] as number, meus[k] as number);
    }
  }
  const grupos = new Map<number, number[]>();
  for (const { i } of internos) {
    const r = col.f(i);
    grupos.set(r, [...(grupos.get(r) ?? []), i]);
  }
  const colisao = [...grupos.values()].map((ls) => {
    const hosts = new Set<string>();
    for (const i of ls) {
      const l = inc.links[i]!;
      for (const id of [l.a, l.b]) if (HOST.has(no(inc, id)!.tipo)) hosts.add(id);
    }
    return { links: ls, hosts: [...hosts], taxa: clamp((hosts.size - 2) * 9, 0, 75) };
  });
  const broadcast = new Set(internos.map(({ i }) => bc.f(i))).size;
  // alcance: cada micro chega na impressora?
  const alcance: Record<string, boolean> = {};
  for (const n of inc.nos.filter((x) => x.tipo === 'pc')) alcance[n.id] = caminho(inc, n.id, 'imp') || (tem(n, 'fin') && caminho(inc, n.id, 'central'));
  // Internet: precisa de roteador (NAT) entre a rede e o modem
  const borda = no(inc, 'borda');
  let internet: Analise['internet'] = 'um';
  if (borda) internet = borda.tipo === 'roteador' ? 'ok' : borda.tipo === 'slot' ? 'nada' : 'um';
  return { colisao, broadcast, alcance, internet };
}

/** Existe caminho físico funcionando? Vaga vazia corta; trecho longo só passa com regenerador no meio. */
function caminho(inc: Incidente, de: string, para: string): boolean {
  const vistos = new Set([de]);
  const fila = [de];
  while (fila.length) {
    const atual = fila.shift()!;
    if (atual === para) return true;
    for (const l of inc.links) {
      const outro = l.a === atual ? l.b : l.b === atual ? l.a : null;
      if (!outro || vistos.has(outro)) continue;
      const n = no(inc, outro)!;
      if (n.tipo === 'slot' || n.tipo === 'internet' || n.tipo === 'modem') continue;
      if (HOST.has(n.tipo) && outro !== para) continue;
      vistos.add(outro);
      fila.push(outro);
    }
  }
  return false;
}

function cumpre(inc: Incidente, r: Req, a: Analise): { ok: boolean; porque: string; item: string } {
  const caixa = inc.nos.find((n) => tem(n, 'caixa'));
  switch (r) {
    case 'velocidade': {
      const pior = Math.max(0, ...a.colisao.map((x) => x.taxa));
      return { ok: pior <= 15 && Object.values(a.alcance).every(Boolean), porque: pior > 15 ? `Um domínio de colisão com muitos micros chega a ${pior}% de colisões. Hub divide a banda entre todos; switch dá a cada porta o seu domínio.` : 'Sem domínio de colisão congestionado.', item: 'eqp-02' };
    }
    case 'sigilo': {
      const dom = a.colisao.find((x) => caixa && x.hosts.includes(caixa.id));
      const ok = !!dom && dom.hosts.length === 1;
      return { ok, porque: ok ? 'O caixa está sozinho no seu domínio: o switch só entrega a ele o que é dele.' : 'O caixa divide domínio com outros micros: o hub repete cada quadro para todas as portas e qualquer um captura.', item: 'eqp-07' };
    }
    case 'internet':
      return { ok: a.internet === 'ok', porque: a.internet === 'ok' ? 'O roteador faz NAT: todos os micros saem pela mesma linha.' : a.internet === 'nada' ? 'A vaga entre a rede e o modem está vazia.' : 'Hub ou switch na borda não fazem NAT: o provedor entrega um endereço só e um micro navega por vez.', item: 'ip4-10' };
    case 'distancia': {
      const v = no(inc, 'longe')!;
      const ok = v.tipo !== 'slot';
      return { ok, porque: ok ? `O sinal é regenerado no meio do caminho. ${v.tipo === 'repetidor' ? 'O repetidor é o mais barato para isso.' : `Funcionou, mas um repetidor de R$ ${PRECOS['repetidor']} bastava.`}` : 'O par trançado passa de 100 metros e o sinal não chega. Um repetidor no meio resolve.', item: 'eqp-05' };
    }
    case 'setor': {
      const v = no(inc, 'setor')!;
      const ok = v.tipo === 'roteador';
      return { ok, porque: ok ? 'O roteador não repassa broadcast: o financeiro é outro domínio de broadcast.' : v.tipo === 'slot' ? 'A vaga do financeiro está vazia: eles nem chegam na rede.' : `${NOMES_EQ[v.tipo] ?? v.tipo} repassa broadcast. Só um equipamento de camada 3 separa domínios de broadcast.`, item: 'eqp-03' };
    }
  }
}

export const REGRAS_REDE: Regras = {
  acoes: ACOES_REDE,

  disponivel(inc, a, n) {
    if (a.id.startsWith('inst_')) {
      if (!n || !tem(n, 'vaga')) return 'Escolha uma vaga de equipamento.';
      if (n.tipo === a.id.slice(5)) return 'Já está instalado aqui.';
      const portas = inc.links.filter((l) => l.a === n.id || l.b === n.id).length;
      if (a.id === 'inst_bridge' && portas > 2) return `A bridge tem duas portas; aqui chegam ${portas} cabos.`;
      if (a.id === 'inst_roteador' && portas > 3) return `Roteador da época tem poucas portas; aqui chegam ${portas} cabos. Para muitos micros, hub ou switch.`;
      if (a.id === 'inst_repetidor' && portas > 2) return `O repetidor liga dois trechos de cabo; aqui chegam ${portas}.`;
    }
    if (a.id === 'conversar' && inc.d['conversou']) return 'Você já ouviu tudo.';
    return true;
  },

  tick(inc, dh) {
    const a = analisar(inc);
    const parados = Object.values(a.alcance).filter((x) => !x).length;
    const lento = Math.max(0, ...a.colisao.map((x) => x.taxa)) / 75;
    inc.prejuizo += dh * (parados * 0.8 + lento * 1.2);
  },

  executar(inc, acao, n, _rng, fx) {
    if (acao.id === 'conversar') {
      inc.d['conversou'] = true;
      const r = inc.d['reqs'] as Req[];
      const dicas: string[] = [];
      if (r.includes('sigilo')) dicas.push('o sobrinho conseguiu ver o que o caixa digitava, só ligando um programa no micro dele');
      if (r.includes('distancia')) dicas.push('o galpão fica a uns 175 metros, passando pelo pátio');
      if (r.includes('setor')) dicas.push('o financeiro reclama que a rede deles trava quando alguém liga a impressora');
      if (r.includes('internet')) dicas.push('o provedor deu um endereço IP só');
      registrar(inc, `${inc.contato}: "${dicas.join('; ') || 'quero que funcione e seja rápido'}. E não precisa gastar mais do que o necessário, né?"`, 'cliente');
      return;
    }
    if (acao.id === 'testar') {
      inc.d['testes']++;
      const a = analisar(inc);
      const reqs = inc.d['reqs'] as Req[];
      const linhas = reqs.map((r) => { const c = cumpre(inc, r, a); return `${c.ok ? '✔' : '✘'} ${r}: ${c.porque}`; });
      registrar(inc, `Teste de carga: ${a.colisao.length} domínio(s) de colisão, ${a.broadcast} de broadcast.`, 'pista');
      linhas.forEach((l) => registrar(inc, l, l.startsWith('✔') ? 'ok' : 'erro'));
      inc.d['ultimoTeste'] = inc.hora;
      fx.efeito('conclui');
      return;
    }
    if (!n) return;
    const tipo = acao.id.slice(5) as TipoNo;
    const antes = n.tipo;
    n.tipo = tipo;
    n.nome = `${NOMES_EQ[tipo]} (${(inc.d['vagas'] as Vaga[]).find((v) => v.id === n.id)?.papel ?? ''})`;
    registrar(inc, `${NOMES_EQ[tipo]} instalado ${antes === 'slot' ? 'na vaga' : `no lugar do ${NOMES_EQ[antes] ?? antes}`}. Material: R$ ${acao.custo}.`, 'ok', n.id);
    fx.efeito('conclui', n.id);
    const papel = (inc.d['vagas'] as Vaga[]).find((v) => v.id === n.id)?.papel;
    if (papel === 'borda' && tipo !== 'roteador') licao(inc, false, `${NOMES_EQ[tipo]} na saída para a Internet`, 'Para vários micros com endereço privado compartilharem uma linha, é preciso um roteador fazendo NAT.', 'ip4-10');
    if (papel === 'setor' && tipo !== 'roteador') licao(inc, false, `${NOMES_EQ[tipo]} para separar o financeiro`, 'Hub, bridge e switch repassam broadcast. Separar domínio de broadcast é papel da camada 3.', 'eqp-03');
    if (papel === 'longe' && tipo === 'roteador') licao(inc, false, 'Roteador só para esticar o cabo', 'Um repetidor regenera o sinal por uma fração do preço; roteador ali é desperdício.', 'eqp-05');
    if (papel === 'central' && tipo === 'hub' && (inc.d['reqs'] as Req[]).includes('velocidade')) licao(inc, false, 'Hub no centro de uma rede movimentada', 'O hub repete tudo para todos: um só domínio de colisão, banda dividida e tráfego exposto.', 'eqp-01');
  },

  objetivos(inc) {
    const a = analisar(inc);
    const reqs = inc.d['reqs'] as Req[];
    const rot: Record<Req, string> = { velocidade: 'Rede rápida (colisões ≤ 15%)', sigilo: 'Tráfego do caixa protegido', internet: 'Internet para todos numa linha só', distancia: 'Galpão a 175 m na rede', setor: 'Financeiro em outro domínio de broadcast' };
    inc.obj = reqs.map((r) => ({ id: r, txt: rot[r], feito: cumpre(inc, r, a).ok }));
    inc.obj.push({ id: 'verba', txt: `Material dentro da verba (R$ ${inc.custos} de R$ ${inc.d['verba']})`, feito: inc.custos <= inc.d['verba'] });
  },

  resolucao(inc) {
    const a = analisar(inc);
    const reqs = inc.d['reqs'] as Req[];
    const ok = reqs.filter((r) => cumpre(inc, r, a).ok).length / reqs.length;
    const verba = inc.custos <= inc.d['verba'] ? 1 : clamp(1 - (inc.custos - inc.d['verba']) / inc.d['verba'], 0, 1);
    return 0.85 * ok + 0.15 * verba;
  },

  balanco(inc) {
    const a = analisar(inc);
    const out: Licao[] = (inc.d['reqs'] as Req[]).map((r) => ({ r, c: cumpre(inc, r, a) })).filter((x) => !x.c.ok).map((x) => ({ ok: false, titulo: `Exigência não atendida: ${x.r}`, porque: x.c.porque, item: x.c.item }));
    if (!inc.d['testes']) out.push({ ok: false, titulo: 'Entregou sem testar', porque: 'O teste de carga mostra colisões e alcance antes de o cliente descobrir sozinho.' });
    return out;
  },

  laudo(inc, rng) {
    const a = analisar(inc);
    const nc = a.colisao.length;
    const nb = a.broadcast;
    const num = (certo: number) => {
      const set = new Set([certo]);
      while (set.size < 4) set.add(Math.max(1, certo + Math.round((rng() - 0.5) * 8)));
      return opcoes(rng, String(certo), [...set].filter((x) => x !== certo).map(String), 4);
    };
    const out: Laudo[] = [
      { enunciado: 'Na rede que você entregou (sem contar o modem), quantos domínios de colisão existem?', ...num(nc), item: 'eqp-02', porque: `Hub e repetidor juntam tudo num domínio só; cada porta de switch, de bridge e de roteador é um domínio. Na sua rede: ${nc}.` },
      { enunciado: 'E quantos domínios de broadcast?', ...num(nb), item: 'eqp-03', porque: `Só o roteador separa broadcast. Na sua rede: ${nb}.` },
    ];
    const q = opcoes(rng, 'camada 2 (enlace), encaminhando quadros pelo endereço MAC', ['camada 1 (física), repetindo o sinal para todas as portas', 'camada 3 (rede), roteando pacotes pelo endereço IP', 'camada 4 (transporte), controlando as portas TCP', 'camada 7 (aplicação), inspecionando o conteúdo'], 4);
    out.push({ enunciado: 'Para o relatório: o switch opera na', ...q, item: 'eqp-08', porque: 'Switch e bridge são de camada 2 e aprendem os MACs de origem; hub e repetidor, camada 1; roteador, camada 3.' });
    return out;
  },
};
