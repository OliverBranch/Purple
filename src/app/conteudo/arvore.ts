// Árvore de tecnologia no estilo Path of Exile. Cada nó é um pedaço do edital:
// para conquistá-lo você pesquisa (Insight + semanas) e depois prova que sabe, respondendo
// às questões ligadas a ele.

export type TipoNo = 'inicio' | 'menor' | 'ponte' | 'notavel' | 'chave';

export interface Efeito {
  horas?: number;
  pag?: number;
  insight?: number;
  mural?: number;
  sache?: number;
  laudo?: number;
  emergencia?: number;
  retorno?: number;
  servico?: string;
  loja?: string;
  ferramenta?: string;
}

export interface No {
  id: string;
  nome: string;
  tipo: TipoNo;
  topico: string; // tópico principal (cor do ramo)
  itens: string[]; // questões que provam o conhecimento do nó
  x: number;
  y: number;
  efeito: Efeito;
  lore?: string;
}

export interface Ramo {
  topico: string;
  angulo: number;
  cor: string;
}

export const RAMOS: Ramo[] = [
  { topico: 'cia', angulo: -90, cor: '#f2c94c' },
  { topico: 'osi', angulo: -45, cor: '#60a5fa' },
  { topico: 'tcpip', angulo: 0, cor: '#38bdf8' },
  { topico: 'ipv4', angulo: 45, cor: '#34d399' },
  { topico: 'ipv6', angulo: 90, cor: '#2dd4bf' },
  { topico: 'equip', angulo: 135, cor: '#a3e635' },
  { topico: 'hard', angulo: 180, cor: '#fb923c' },
  { topico: 'malware', angulo: -135, cor: '#f87171' },
];

export const corDoTopico = (t: string): string => RAMOS.find((r) => r.topico === t)?.cor ?? '#a78bfa';

const pol = (ang: number, r: number): { x: number; y: number } => {
  const a = (ang * Math.PI) / 180;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
};

type Def = [string, string, string[], Efeito, string?];

// Por ramo: b1, b2, b3 (notável), b4a, b4b, b5 (chave). Questões escolhidas a dedo para casar com o nome do nó.
const DEFS: { [topico: string]: Def[] } = {
  cia: [
    ['Tríade CID', 'menor', ['cia-03', 'cia-07'], { laudo: 0.05 }],
    ['Integridade', 'menor', ['cia-01', 'cia-05'], { laudo: 0.05 }],
    ['Vocabulário de Risco', 'notavel', ['cia-09', 'cia-04'], { servico: 'diagnostico' }, 'Ativo, ameaça, vulnerabilidade, risco. Com as palavras certas, dá para vender diagnóstico.'],
    ['Não Repúdio', 'menor', ['cia-02'], { pag: 0.05 }],
    ['Assinatura Digital', 'menor', ['cia-08'], { insight: 0.05 }],
    ['Alta Disponibilidade', 'chave', ['cia-06'], { retorno: -0.5, horas: 0.05 }, 'Clientes quase nunca ligam de volta (−50% de retorno). Atendimentos 5% mais longos: você confere tudo duas vezes.'],
  ],
  osi: [
    ['Sete Camadas', 'menor', ['osi-01', 'osi-02'], { horas: -0.04 }],
    ['Quadros e MACs', 'menor', ['osi-03', 'osi-06'], { horas: -0.03 }],
    ['Encapsulamento', 'notavel', ['osi-08', 'osi-07'], { ferramenta: 'sniffer' }, 'Libera o analisador de pacotes: dá para ver colisões, broadcast e varreduras no fio.'],
    ['Camada de Sessão', 'menor', ['osi-05'], { horas: -0.04 }],
    ['Camada de Apresentação', 'menor', ['osi-04'], { laudo: 0.04 }],
    ['Engenheiro de Protocolos', 'chave', [], { laudo: 0.25, horas: 0.08 }, 'Laudos valem 25% mais. Atendimentos 8% mais longos: você explica cada cabeçalho.'],
  ],
  tcpip: [
    ['Pilha TCP/IP', 'menor', ['tcp-05', 'tcp-01'], { horas: -0.04 }],
    ['Aperto de Mão', 'menor', ['tcp-02', 'tcp-09'], { horas: -0.03 }],
    ['Portas e Serviços', 'notavel', ['tcp-03', 'tcp-04', 'tcp-08'], { ferramenta: 'portscan' }, 'Libera a varredura de portas externa: veja o servidor como o invasor vê.'],
    ['ARP e ICMP', 'menor', ['tcp-06', 'tcp-07'], { horas: -0.04 }],
    ['DHCP', 'menor', ['tcp-11'], { horas: -0.03 }],
    ['Plantão 24h', 'chave', ['tcp-10'], { horas: -0.2, retorno: 0.25 }, 'Atendimentos 20% mais rápidos. Clientes ligam de volta 25% mais. Dormir é para quem tem prazo folgado.'],
  ],
  ipv4: [
    ['Endereço de 32 Bits', 'menor', ['ip4-01', 'ip4-03'], { horas: -0.04 }],
    ['Máscaras', 'menor', ['ip4-07', 'ip4-02'], { pag: 0.05 }],
    ['Sub-redes', 'notavel', ['ip4-04', 'ip4-06'], { servico: 'enderecos' }, 'Quem divide uma /24 de cabeça pode vender planos de endereçamento.'],
    ['Enlaces /30', 'menor', ['ip4-05'], { horas: -0.03 }],
    ['Link-local e CIDR', 'menor', ['ip4-08', 'ip4-09'], { horas: -0.04 }],
    ['NAT Corporativo', 'chave', ['ip4-10'], { pag: 0.25, retorno: 0.2 }, 'Contratos pagam 25% mais. Clientes ligam de volta 20% mais. Um endereço público, muitas responsabilidades.'],
  ],
  ipv6: [
    ['128 Bits', 'menor', ['ip6-01', 'ip6-03'], { insight: 0.06 }],
    ['Notação Hexadecimal', 'menor', ['ip6-02'], { horas: -0.03 }],
    ['Descoberta de Vizinhança', 'notavel', ['ip6-06', 'ip6-05'], { mural: 1 }, 'Sem broadcast, só vizinhança. O Mural comporta mais um contrato.'],
    ['Link-local IPv6', 'menor', ['ip6-04'], { insight: 0.06 }],
    ['Endereços Locais Únicos', 'menor', ['ip6-07'], { laudo: 0.04 }],
    ['Visionário', 'chave', [], { insight: 0.25, pag: -0.1 }, 'Insight +25%. Pagamento −10%. Você está dez anos à frente, e os clientes também acham.'],
  ],
  equip: [
    ['Hubs e Repetidores', 'menor', ['eqp-01', 'eqp-05'], { horas: -0.03 }],
    ['Pontes', 'menor', ['eqp-04', 'eqp-08'], { horas: -0.04 }],
    ['Domínios de Colisão', 'notavel', ['eqp-02', 'eqp-07'], { loja: 'switch' }, 'Libera o switch na loja. Adeus, hub.'],
    ['Roteadores', 'menor', ['eqp-03'], { retorno: -0.1 }],
    ['Gateways', 'menor', ['eqp-06'], { horas: -0.03 }],
    ['Laboratório na Garagem', 'chave', ['eqp-09'], { sache: 1, horas: 0.05 }, 'Um sachê a mais por dia. Atendimentos 5% mais longos: o gato mora no laboratório.'],
  ],
  hard: [
    ['Superfície de Ataque', 'menor', ['hrd-01', 'hrd-10'], { retorno: -0.1 }],
    ['Menor Privilégio', 'menor', ['hrd-02', 'hrd-08'], { retorno: -0.1 }],
    ['Blindagem', 'notavel', ['hrd-03', 'hrd-05'], { servico: 'servidor' }, 'Com a lista de hardening na ponta da língua, dá para vender blindagem de servidores.'],
    ['Correções em Dia', 'menor', ['hrd-06'], { horas: -0.04 }],
    ['Bloqueio de Força Bruta', 'menor', ['hrd-07'], { retorno: -0.1 }],
    ['Defesa em Profundidade', 'chave', ['hrd-09', 'hrd-04'], { retorno: -0.3, laudo: 0.1, horas: 0.1 }, 'Camadas sobre camadas: retorno −30%, laudo +10%, atendimentos 10% mais longos.'],
  ],
  malware: [
    ['Vírus e Worms', 'menor', ['mal-01', 'mal-02'], { retorno: -0.1 }],
    ['Cavalos de Troia', 'menor', ['mal-03', 'mal-09'], { laudo: 0.04 }],
    ['Assinaturas e Heurística', 'notavel', ['mal-10', 'mal-04'], { ferramenta: 'heur', emergencia: 0.2 }, 'Libera o antivírus heurístico, que pega a praga sem vacina. Emergências pagam 20% mais.'],
    ['Espiões', 'menor', ['mal-05'], { retorno: -0.1 }],
    ['Rootkits e Backdoors', 'menor', ['mal-06', 'mal-07'], { horas: -0.04 }],
    ['Paranoico Profissional', 'chave', ['mal-08'], { retorno: -0.6, horas: 0.1 }, 'Clientes quase nunca ligam de volta (−60%). Atendimentos 10% mais longos. Desconfiar de tudo dá trabalho.'],
  ],
};

const PONTES: [string, string, string][] = [
  ['cia', 'osi', 'Modelos e Propriedades'],
  ['osi', 'tcpip', 'OSI × TCP/IP'],
  ['tcpip', 'ipv4', 'Roteamento IP'],
  ['ipv4', 'ipv6', 'Pilha Dupla'],
  ['ipv6', 'equip', 'Multicast'],
  ['equip', 'hard', 'Rede do Escritório'],
  ['hard', 'malware', 'Antivírus Atualizado'],
  ['malware', 'cia', 'Análise de Impacto'],
];

// Anel externo ligando ramos vizinhos e satélites em volta dos notáveis: mais caminhos, mais nós.
const ANEL: [string, string][] = [
  ['Sigilo em Trânsito', 'Camadas e Propriedades'], ['Modelo Híbrido', 'Segmentos e Datagramas'], ['Datagrama IP', 'Tabela de Rotas'],
  ['Escassez de Endereços', 'Transição v4/v6'], ['Vizinhos no Enlace', 'Tabela MAC'], ['Equipamento Blindado', 'Porta Desligada'],
  ['Correção Contra Worm', 'Antivírus no Servidor'], ['Estrago Medido', 'Disponibilidade Sequestrada'],
];
const SATELITES: { [topico: string]: [string, string] } = {
  cia: ['Ativos e Donos', 'Ameaça × Vulnerabilidade'], osi: ['Cabeçalhos', 'PDUs'], tcpip: ['Portas Bem Conhecidas', 'Serviços em Escuta'],
  ipv4: ['Blocos de Endereço', 'Rede e Broadcast'], ipv6: ['Multicast de Todos os Nós', 'Autoconfiguração'], equip: ['Flooding', 'Domínio de Broadcast'],
  hard: ['Checklist de Hardening', 'Contas Padrão'], malware: ['Vacinas Atualizadas', 'Falso Positivo'],
};
const PEQUENOS: Efeito[] = [{ horas: -0.03 }, { laudo: 0.03 }, { pag: 0.03 }, { retorno: -0.08 }, { insight: 0.04 }, { horas: -0.02 }];

function montar(): { nos: No[]; arestas: [string, string][] } {
  const nos: No[] = [{ id: 'garagem', nome: 'A Garagem', tipo: 'inicio', topico: '', itens: [], x: 0, y: 0, efeito: {}, lore: 'Onde tudo começa. Um sofá, um gato e uma ideia.' }];
  const arestas: [string, string][] = [];
  const geo: [number, number][] = [[0, 95], [0, 170], [0, 250], [-8, 325], [8, 325], [0, 405]];
  for (const ramo of RAMOS) {
    const defs = DEFS[ramo.topico] ?? [];
    defs.forEach(([nome, tipo, itens, efeito, lore], i) => {
      const [da, r] = geo[i] ?? [0, 0];
      const p = pol(ramo.angulo + da, r);
      nos.push({ id: `${ramo.topico}${i + 1}`, nome, tipo: tipo as TipoNo, topico: ramo.topico, itens, x: p.x, y: p.y, efeito, ...(lore ? { lore } : {}) });
    });
    const t = ramo.topico;
    arestas.push(['garagem', `${t}1`], [`${t}1`, `${t}2`], [`${t}2`, `${t}3`], [`${t}3`, `${t}4`], [`${t}3`, `${t}5`], [`${t}4`, `${t}6`], [`${t}5`, `${t}6`]);
  }
  PONTES.forEach(([a, b, nome]) => {
    const ra = RAMOS.find((r) => r.topico === a)!;
    let rb = RAMOS.find((r) => r.topico === b)!.angulo;
    if (rb < ra.angulo) rb += 360;
    const p = pol((ra.angulo + rb) / 2, 205);
    const ia = nos.find((n) => n.id === `${a}2`)!.itens;
    const ib = nos.find((n) => n.id === `${b}2`)!.itens;
    const id = `ponte-${a}-${b}`;
    nos.push({ id, nome, tipo: 'ponte', topico: a, itens: [...ia, ...ib], x: p.x, y: p.y, efeito: { horas: -0.02, pag: 0.02 } });
    arestas.push([`${a}2`, id], [id, `${b}2`]);
  });
  let k = 0;
  RAMOS.forEach((ramo, i) => {
    const t = ramo.topico;
    // satélites do notável
    (SATELITES[t] ?? []).forEach((nome, j) => {
      const p = pol(ramo.angulo + (j ? 15 : -15), 262);
      const id = `${t}-sat${j + 1}`;
      nos.push({ id, nome, tipo: 'menor', topico: t, itens: [], x: p.x, y: p.y, efeito: PEQUENOS[k++ % PEQUENOS.length]! });
      arestas.push([`${t}3`, id]);
    });
    // anel até o próximo ramo
    const prox = RAMOS[(i + 1) % RAMOS.length]!;
    const [n1, n2] = ANEL[i]!;
    const a1 = pol(ramo.angulo + 17, 362);
    const a2 = pol(ramo.angulo + 28, 362);
    nos.push({ id: `anel-${t}-1`, nome: n1, tipo: 'menor', topico: t, itens: [], x: a1.x, y: a1.y, efeito: PEQUENOS[k++ % PEQUENOS.length]! });
    nos.push({ id: `anel-${t}-2`, nome: n2, tipo: 'menor', topico: prox.topico, itens: [], x: a2.x, y: a2.y, efeito: PEQUENOS[k++ % PEQUENOS.length]! });
    arestas.push([`${t}5`, `anel-${t}-1`], [`anel-${t}-1`, `anel-${t}-2`], [`anel-${t}-2`, `${prox.topico}4`]);
  });
  return { nos, arestas };
}

const M = montar();
export const NOS: No[] = M.nos;
export const ARESTAS: [string, string][] = M.arestas;
export const noPorId = (id: string): No | undefined => NOS.find((n) => n.id === id);

export const vizinhos = (id: string): string[] => ARESTAS.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

export const CUSTO: Record<TipoNo, { insight: number; semanas: number; questoes: number; minimo: number }> = {
  inicio: { insight: 0, semanas: 0, questoes: 0, minimo: 0 },
  menor: { insight: 4, semanas: 2, questoes: 1, minimo: 1 },
  ponte: { insight: 5, semanas: 2, questoes: 1, minimo: 1 },
  notavel: { insight: 10, semanas: 4, questoes: 2, minimo: 2 },
  chave: { insight: 16, semanas: 6, questoes: 3, minimo: 2 },
};

/** Áreas dos próximos atos, desenhadas em volta da árvore só para dar a dimensão do que vem. */
export const FUTURO: { nome: string; ato: number; angulo: number }[] = [
  { nome: 'Criptografia e PKI', ato: 2, angulo: -112 },
  { nome: 'SIEM e Resposta', ato: 2, angulo: -22 },
  { nome: 'Normas ISO 27001/27002', ato: 3, angulo: -67 },
  { nome: 'LGPD e Privacidade', ato: 3, angulo: 22 },
  { nome: 'Forense Computacional', ato: 3, angulo: -157 },
  { nome: 'Nuvem e Contêineres', ato: 4, angulo: 67 },
  { nome: 'AppSec e DevSecOps', ato: 4, angulo: 112 },
  { nome: 'Zero Trust e IA', ato: 5, angulo: 157 },
];

export function nosFuturos(): { x: number; y: number; r: number; area: number }[] {
  const out: { x: number; y: number; r: number; area: number }[] = [];
  FUTURO.forEach((f, area) => {
    for (let k = 0; k < 9; k++) {
      const ang = f.angulo + ((k % 3) - 1) * 7;
      const r = 500 + Math.floor(k / 3) * 70;
      const p = pol(ang, r);
      out.push({ ...p, r: k === 7 ? 13 : 7, area });
    }
  });
  return out;
}

export function rotuloFuturo(i: number): { x: number; y: number } {
  const f = FUTURO[i]!;
  return pol(f.angulo, 735);
}

