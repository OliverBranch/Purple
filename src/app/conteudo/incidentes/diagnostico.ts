// Diagnóstico de segurança: uma vistoria com hora para acabar. Você escolhe o que
// inspecionar no escritório, classifica cada achado (ameaça ou vulnerabilidade, qual
// pilar da CID, nível de risco) e prioriza. No meio da visita, uma ameaça pode se
// materializar sobre uma vulnerabilidade: o risco deixa de ser teoria.
import { AcaoDef, Incidente, Laudo, Licao, NoInc, Regras, licao, marcar, no, novoIncidente, registrar, tem } from '../../core/incidente';
import { Rng, clamp, escolher } from '../../core/rng';
import { Ctx, nN, opcoes, sortear } from './comum';

export type Classe = 'Ameaça' | 'Vulnerabilidade';
export type Pilar = 'Confidencialidade' | 'Integridade' | 'Disponibilidade';
export type Nivel = 'Baixo' | 'Médio' | 'Alto';

export interface Achado {
  id: string;
  objeto: number; // sprite
  onde: string;
  texto: string;
  classe: Classe;
  pilar: Pilar;
  nivel: Nivel;
  controle: string;
  evento?: string;
}

/** Sprites de objeto: 0 monitor, 1 servidor no chão, 2 janela, 3 porta, 4 armário, 5 lixeira, 6 ar-condicionado, 7 recepção, 8 roteador, 9 extintor, 10 tomada, 11 quadro de avisos */
export const ACHADOS: Achado[] = [
  { id: 'postit', objeto: 0, onde: 'Monitor do gerente', texto: 'Post-it amarelo colado no monitor: "senha do banco: Mappao@95".', classe: 'Vulnerabilidade', pilar: 'Confidencialidade', nivel: 'Alto', controle: 'Política de senhas e conscientização: senha não fica exposta.' },
  { id: 'goteira', objeto: 6, onde: 'Ar-condicionado da sala do servidor', texto: 'O ar-condicionado pinga bem em cima do servidor. Tem um balde, às vezes.', classe: 'Vulnerabilidade', pilar: 'Disponibilidade', nivel: 'Alto', controle: 'Reposicionar o servidor e tratar a infraestrutura física da sala.', evento: 'Começou a pingar forte: água no gabinete do servidor! Ele desligou sozinho.' },
  { id: 'fitas', objeto: 4, onde: 'Armário do escritório', texto: 'As fitas de backup ficam no mesmo armário, na mesma sala do servidor.', classe: 'Vulnerabilidade', pilar: 'Disponibilidade', nivel: 'Médio', controle: 'Guardar cópia do backup fora do local (offsite).' },
  { id: 'lixo', objeto: 5, onde: 'Lixeira da recepção', texto: 'Relatórios com CPF e salário dos funcionários jogados inteiros no lixo.', classe: 'Vulnerabilidade', pilar: 'Confidencialidade', nivel: 'Médio', controle: 'Fragmentar documentos sensíveis antes do descarte.' },
  { id: 'porta', objeto: 3, onde: 'Porta da sala do servidor', texto: 'A porta da sala do servidor fica aberta e sem tranca: "é para ventilar".', classe: 'Vulnerabilidade', pilar: 'Confidencialidade', nivel: 'Médio', controle: 'Controle de acesso físico: porta trancada e registro de quem entra.' },
  { id: 'roteador', objeto: 8, onde: 'Roteador', texto: 'O roteador está com usuário e senha de fábrica: admin/admin.', classe: 'Vulnerabilidade', pilar: 'Integridade', nivel: 'Alto', controle: 'Trocar credenciais padrão (hardening do equipamento).' },
  { id: 'tomada', objeto: 10, onde: 'Tomada do servidor', texto: 'Servidor, cafeteira e aquecedor na mesma extensão. Sem nobreak.', classe: 'Vulnerabilidade', pilar: 'Disponibilidade', nivel: 'Médio', controle: 'Circuito elétrico dedicado e nobreak.', evento: 'Alguém ligou o aquecedor: a extensão desarmou e o servidor apagou no meio de uma gravação.' },
  { id: 'janela', objeto: 2, onde: 'Janela do térreo', texto: 'A janela do térreo, ao lado do micro do caixa, não fecha direito.', classe: 'Vulnerabilidade', pilar: 'Confidencialidade', nivel: 'Baixo', controle: 'Reparar a janela e posicionar a tela longe da rua.' },
  { id: 'exfunc', objeto: 11, onde: 'Quadro de avisos', texto: 'Recado no quadro: o ex-técnico, demitido brigado semana passada, "vai se vingar". A conta dele ainda funciona.', classe: 'Ameaça', pilar: 'Integridade', nivel: 'Alto', controle: 'Revogar acessos no desligamento de funcionários.' },
  { id: 'chuva', objeto: 2, onde: 'Janela', texto: 'O rádio avisa: semana de temporais fortes na região, com risco de alagamento.', classe: 'Ameaça', pilar: 'Disponibilidade', nivel: 'Médio', controle: 'Plano de continuidade e equipamentos fora do nível do chão.' },
  { id: 'concorrente', objeto: 7, onde: 'Recepção', texto: 'A recepcionista conta que um "técnico da telefônica" sem crachá pediu para entrar na sala do servidor ontem.', classe: 'Ameaça', pilar: 'Confidencialidade', nivel: 'Médio', controle: 'Identificação e acompanhamento de visitantes (engenharia social).' },
  { id: 'virusdisq', objeto: 0, onde: 'Micro da recepção', texto: 'Antivírus instalado em 1993 e nunca atualizado; todo mundo traz disquete de casa.', classe: 'Vulnerabilidade', pilar: 'Integridade', nivel: 'Médio', controle: 'Atualizar o antivírus e restringir mídias removíveis.' },
  { id: 'extintor', objeto: 9, onde: 'Extintor', texto: 'O único extintor da sala do servidor é de água e venceu em 1991.', classe: 'Vulnerabilidade', pilar: 'Disponibilidade', nivel: 'Baixo', controle: 'Extintor adequado (CO₂) e dentro da validade.' },
];

const DECOYS: { objeto: number; onde: string; txt: string }[] = [
  { objeto: 0, onde: 'Micro do estoque', txt: 'Proteção de tela com senha, papel de parede de golfinho. Nada a apontar.' },
  { objeto: 4, onde: 'Arquivo de aço', txt: 'Trancado; a chave fica com a gerente. Tudo certo.' },
  { objeto: 9, onde: 'Extintor do corredor', txt: 'CO₂, dentro da validade. Alguém aqui é organizado.' },
  { objeto: 5, onde: 'Lixeira do escritório', txt: 'Só papel de bala e uma promessa de dieta.' },
  { objeto: 10, onde: 'Tomada da copa', txt: 'Geladeira e micro-ondas. Nada de TI por aqui.' },
];

export const ACOES_DIAG: AcaoDef[] = [
  { id: 'inspecionar', nome: 'Inspecionar', desc: 'Olhar de perto, abrir, perguntar a quem usa.', horas: 0.45, alvo: ['objeto'], tipo: 'ferramenta', icone: 'lupa' },
  { id: 'conversar', nome: 'Entrevistar o dono', desc: 'Contexto do negócio: o que preocupa, o que já aconteceu.', horas: 0.5, alvo: null, tipo: 'ferramenta', icone: 'fala' },
  { id: 'entrevistar', nome: 'Conversar com os funcionários', desc: 'Quem usa sabe onde aperta.', horas: 0.5, alvo: null, tipo: 'ferramenta', icone: 'pessoa' },
];

export interface Registro { id: string; classe?: Classe; pilar?: Pilar; nivel?: Nivel }

export function gerarDiagnostico(c: Ctx): Incidente {
  const { rng, dif } = c;
  const n = dif === 1 ? 6 : dif === 2 ? 8 : 9;
  const ameacas = ACHADOS.filter((a) => a.classe === 'Ameaça');
  const vulns = ACHADOS.filter((a) => a.classe === 'Vulnerabilidade');
  const escolhidos = [...sortear(rng, ameacas, dif === 1 ? 1 : 2), ...sortear(rng, vulns, n - (dif === 1 ? 1 : 2))];
  const decoys = sortear(rng, DECOYS, dif + 1);
  // posições espalhadas pelo escritório
  const vagas = sortear(rng, [[60, 110], [130, 96], [210, 92], [300, 96], [380, 100], [440, 120], [70, 180], [150, 200], [240, 176], [320, 196], [400, 188], [450, 230], [100, 240], [200, 244], [300, 240]], escolhidos.length + decoys.length);
  const nos: NoInc[] = [];
  escolhidos.forEach((a, i) => {
    const [x, y] = vagas[i] as [number, number];
    nos.push(nN(`o${i}`, 'objeto', a.onde, x, y, { arte: a.objeto, tags: [`achado:${a.id}`] }));
  });
  decoys.forEach((dcy, i) => {
    const [x, y] = vagas[escolhidos.length + i] as [number, number];
    nos.push(nN(`d${i}`, 'objeto', dcy.onde, x, y, { arte: dcy.objeto, tags: [`nada:${i}`] }));
  });
  const ameacaOculta = escolhidos.filter((a) => a.classe === 'Ameaça');
  // ameaças também podem aparecer só nas conversas
  ameacaOculta.forEach((a) => { const nd = nos.find((x) => x.tags.includes(`achado:${a.id}`)); if (nd) marcar(nd, 'conversa'); });
  const comEvento = escolhidos.filter((a) => a.evento);
  const inc = novoIncidente({
    modo: 'diagnostico', titulo: escolher(rng, ['Vistoria geral', 'Onde mora o perigo', 'O check-up do escritório']),
    chamado: `${c.cliente.contato}: "${escolher(rng, ['O banco exigiu um diagnóstico de segurança para renovar nosso crédito.', 'Um amigo foi roubado e agora eu não durmo. Quero saber onde estamos vulneráveis.', 'O seguro pediu uma vistoria de TI. Eu nem sabia que isso existia.'])}"`,
    contato: c.cliente.contato, dif, ano: c.ano, topicos: ['cia', 'hard'], nos, links: [], limite: [4.5, 5.5, 6][dif - 1] as number,
    d: {
      achados: escolhidos.map((a) => a.id), decoys: decoys.map((x) => x.txt), registros: [] as Registro[],
      evento: comEvento.length ? { id: escolher(rng, comEvento).id, em: 1.6 + rng() * 2 } : null, conversou: false, entrevistou: false,
    },
  });
  inc.perguntasEm = dif === 1 ? [inc.limite * 0.5] : [inc.limite * 0.3, inc.limite * 0.7];
  registrar(inc, `Prancheta na mão. São ${nos.length} pontos para olhar e ${inc.limite} horas de visita: não dá para inspecionar tudo com calma. Escolha bem.`, 'sistema');
  return inc;
}

export const achadoPorId = (id: string): Achado | undefined => ACHADOS.find((a) => a.id === id);
const registros = (inc: Incidente): Registro[] => inc.d['registros'] as Registro[];
export const registrosDiag = registros;

function revelar(inc: Incidente, id: string): boolean {
  if (registros(inc).some((r) => r.id === id)) return false;
  registros(inc).push({ id });
  const nd = inc.nos.find((x) => x.tags.includes(`achado:${id}`));
  if (nd) { nd.visto = true; marcar(nd, 'achado'); }
  return true;
}

export const REGRAS_DIAG: Regras = {
  acoes: ACOES_DIAG,

  disponivel(inc, a, n) {
    if (a.id === 'inspecionar' && n?.visto) return 'Já inspecionado.';
    if (a.id === 'conversar' && inc.d['conversou']) return 'Já entrevistado.';
    if (a.id === 'entrevistar' && inc.d['entrevistou']) return 'Você já ouviu a equipe.';
    return true;
  },

  tick(inc, _dh, _rng, fx) {
    const ev = inc.d['evento'] as { id: string; em: number } | null;
    if (ev && inc.hora >= ev.em) {
      inc.d['evento'] = null;
      const a = achadoPorId(ev.id);
      if (!a?.evento) return;
      inc.prejuizo += 12;
      registrar(inc, a.evento, 'alerta');
      const nd = inc.nos.find((x) => x.tags.includes(`achado:${a.id}`));
      if (revelar(inc, a.id)) registrar(inc, `Achado registrado na marra: ${a.texto}`, 'pista', nd?.id);
      if (nd) fx.efeito('quebra', nd.id);
      licao(inc, true, 'O risco se materializou na sua frente', 'Risco é a ameaça explorando uma vulnerabilidade. Até ontem era só uma goteira ou uma extensão; hoje é prejuízo.', 'cia-09');
    }
  },

  executar(inc, a, n, _rng, fx) {
    if (a.id === 'inspecionar' && n) {
      n.visto = true;
      const id = n.tags.find((t) => t.startsWith('achado:'))?.slice(7);
      if (id) {
        const ac = achadoPorId(id)!;
        revelar(inc, id);
        registrar(inc, `${n.nome}: ${ac.texto}`, 'pista', n.id);
        fx.efeito('alerta', n.id);
      } else {
        const k = Number(n.tags.find((t) => t.startsWith('nada:'))?.slice(5) ?? 0);
        registrar(inc, `${n.nome}: ${(inc.d['decoys'] as string[])[k] ?? 'nada a apontar.'}`, 'info', n.id);
      }
      return;
    }
    if (a.id === 'conversar' || a.id === 'entrevistar') {
      inc.d[a.id === 'conversar' ? 'conversou' : 'entrevistou'] = true;
      const pend = (inc.d['achados'] as string[]).map((id) => achadoPorId(id)!).filter((x) => !registros(inc).some((r) => r.id === x.id));
      const alvo = pend.find((x) => (a.id === 'conversar' ? x.classe === 'Ameaça' : x.classe === 'Vulnerabilidade'));
      if (alvo) {
        revelar(inc, alvo.id);
        registrar(inc, `${a.id === 'conversar' ? inc.contato : 'A equipe'} comentou: ${alvo.texto}`, 'pista');
      } else registrar(inc, 'Nada de novo na conversa. Mas o cafezinho estava ótimo.', 'info');
    }
  },

  objetivos(inc) {
    const total = (inc.d['achados'] as string[]).length;
    const regs = registros(inc);
    const classificados = regs.filter((r) => r.classe && r.pilar && r.nivel).length;
    inc.obj = [
      { id: 'achar', txt: `Achados registrados: ${regs.length}`, feito: regs.length >= Math.ceil(total * 0.75) },
      { id: 'classificar', txt: `Achados classificados: ${classificados} de ${regs.length}`, feito: regs.length > 0 && classificados === regs.length },
    ];
  },

  resolucao(inc) {
    const total = (inc.d['achados'] as string[]).length;
    const regs = registros(inc);
    const cobertura = regs.length / total;
    let pontos = 0;
    for (const r of regs) {
      const a = achadoPorId(r.id)!;
      pontos += (r.classe === a.classe ? 0.4 : 0) + (r.pilar === a.pilar ? 0.35 : 0) + (r.nivel === a.nivel ? 0.25 : 0);
    }
    const precisao = regs.length ? pontos / regs.length : 0;
    return 0.5 * cobertura + 0.5 * precisao * cobertura + 0.5 * precisao * (1 - cobertura) * 0;
  },

  balanco(inc) {
    const out: Licao[] = [];
    for (const r of registros(inc)) {
      const a = achadoPorId(r.id)!;
      if (r.classe && r.classe !== a.classe) out.push({ ok: false, titulo: `"${a.onde}" é ${a.classe.toLowerCase()}`, porque: a.classe === 'Ameaça' ? 'Ameaça é o agente ou evento que pode causar dano (pessoa, natureza, software).' : 'Vulnerabilidade é a fraqueza do ativo ou do controle, que a ameaça explora.', item: 'cia-09' });
      else if (r.pilar && r.pilar !== a.pilar) out.push({ ok: false, titulo: `"${a.onde}" afeta a ${a.pilar.toLowerCase()}`, porque: a.texto, item: a.pilar === 'Disponibilidade' ? 'cia-06' : a.pilar === 'Confidencialidade' ? 'cia-04' : 'cia-01' });
      else if (r.classe && r.pilar && r.nivel === a.nivel) out.push({ ok: true, titulo: `Classificou bem: ${a.onde}`, porque: `${a.classe}, ${a.pilar.toLowerCase()}, risco ${a.nivel.toLowerCase()}.` });
    }
    const perdidos = (inc.d['achados'] as string[]).filter((id) => !registros(inc).some((r) => r.id === id)).map((id) => achadoPorId(id)!);
    if (perdidos.length) out.push({ ok: false, titulo: `${perdidos.length} achado(s) passaram batido`, porque: perdidos.map((p) => `${p.onde}: ${p.texto}`).join(' ') });
    return out;
  },

  laudo(inc, rng) {
    const regs = registros(inc).map((r) => achadoPorId(r.id)!);
    const peso = { Alto: 3, Médio: 2, Baixo: 1 } as const;
    const base = regs.length >= 2 ? regs : (inc.d['achados'] as string[]).map((id) => achadoPorId(id)!);
    const ordenados = [...base].filter((a) => a.classe === 'Vulnerabilidade').sort((a, b) => peso[b.nivel] - peso[a.nivel]);
    const top = ordenados[0] ?? base[0]!;
    const empatados = ordenados.filter((a) => a.nivel === top.nivel).map((a) => a.onde);
    const outras = base.filter((a) => a.nivel !== top.nivel && a.onde !== top.onde).map((a) => a.onde);
    const q1 = opcoes(rng, top.onde, outras.length >= 2 ? outras : ACHADOS.filter((a) => a.nivel !== top.nivel).map((a) => a.onde), 4);
    const q2 = opcoes(rng, top.controle, ACHADOS.filter((a) => a.id !== top.id).map((a) => a.controle), 4);
    const q3 = opcoes(rng, 'a fragilidade de um ativo, ou de um controle, que pode ser explorada por uma ameaça', [
      'o agente externo que tem intenção de causar dano a um ativo',
      'a probabilidade de um incidente acontecer, multiplicada pelo impacto',
      'a perda financeira resultante de um incidente de segurança',
      'o controle que reduz o impacto de um incidente já ocorrido',
    ], 5);
    const out: Laudo[] = [
      { enunciado: 'Qual vulnerabilidade deve ser tratada primeiro?', ...q1, item: 'cia-09', porque: `${top.onde} tem risco ${top.nivel.toLowerCase()}${empatados.length > 1 ? ` (empatada com ${empatados.filter((e) => e !== top.onde).join(', ')})` : ''}. Prioriza-se pelo risco: probabilidade × impacto.` },
      { enunciado: `Que controle você recomenda para "${top.onde}"?`, ...q2, porque: top.controle },
      { enunciado: 'No glossário do relatório, vulnerabilidade é', ...q3, item: 'cia-09', porque: 'Vulnerabilidade é a fraqueza; ameaça é quem ou o que a explora; risco combina probabilidade e impacto.' },
    ];
    void no; void tem; void clamp;
    return out;
  },
};
