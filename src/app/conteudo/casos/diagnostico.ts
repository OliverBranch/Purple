// Diagnóstico de segurança: vistoria, classificar ameaça x vulnerabilidade, propriedade afetada, priorizar risco.
import { Etapa } from '../../core/caso';
import { Ctx, embaralhar, escolha, ferramenta, novoCaso, sub } from './comum';

interface Achado { id: string; texto: string; tipo: 'Ameaça' | 'Vulnerabilidade'; pilar: string; prob: number; imp: number; controle: string; onde: string }

const ACHADOS: Achado[] = [
  { id: 'postit', texto: 'Senha do sistema anotada num post-it colado no monitor', tipo: 'Vulnerabilidade', pilar: 'Confidencialidade', prob: 3, imp: 2, controle: 'Política de senhas e conscientização dos usuários', onde: 'escritorio' },
  { id: 'escada', texto: 'Servidor embaixo da escada, com marca de infiltração na parede', tipo: 'Vulnerabilidade', pilar: 'Disponibilidade', prob: 2, imp: 3, controle: 'Mudar o servidor para local seco, fechado e com acesso controlado', onde: 'servidor' },
  { id: 'nobreak', texto: 'Nenhum nobreak, numa rua com quedas de energia frequentes', tipo: 'Vulnerabilidade', pilar: 'Disponibilidade', prob: 3, imp: 2, controle: 'Instalar nobreak e desligamento automático', onde: 'servidor' },
  { id: 'fita', texto: 'Fitas de backup guardadas na mesma sala do servidor', tipo: 'Vulnerabilidade', pilar: 'Disponibilidade', prob: 1, imp: 3, controle: 'Guardar cópias fora do local e testar a restauração', onde: 'servidor' },
  { id: 'exfunc', texto: 'Ex-funcionário demitido mês passado, insatisfeito, conhece a rotina', tipo: 'Ameaça', pilar: 'Integridade', prob: 2, imp: 3, controle: 'Revogar acessos no desligamento e trocar senhas compartilhadas', onde: 'entrevista' },
  { id: 'planilha', texto: 'Planilha financeira editada por todos, sem registro de quem alterou o quê', tipo: 'Vulnerabilidade', pilar: 'Irretratabilidade', prob: 2, imp: 2, controle: 'Contas individuais e registro de alterações (trilha de auditoria)', onde: 'escritorio' },
  { id: 'macro', texto: 'Vírus de macro circulando em disquetes de fornecedores da região', tipo: 'Ameaça', pilar: 'Integridade', prob: 2, imp: 2, controle: 'Antivírus atualizado e verificação de mídias recebidas', onde: 'entrevista' },
  { id: 'modem', texto: 'Modem no PC do sócio atendendo chamadas para acesso remoto, sem senha', tipo: 'Vulnerabilidade', pilar: 'Confidencialidade', prob: 2, imp: 3, controle: 'Desativar o atendimento automático ou exigir autenticação forte', onde: 'escritorio' },
  { id: 'enchente', texto: 'A rua alaga todo verão', tipo: 'Ameaça', pilar: 'Disponibilidade', prob: 2, imp: 3, controle: 'Elevar os equipamentos e manter cópia fora do local', onde: 'entrevista' },
  { id: 'antivirus', texto: 'Antivírus instalado, mas sem atualizar as vacinas há dois anos', tipo: 'Vulnerabilidade', pilar: 'Integridade', prob: 3, imp: 2, controle: 'Atualização periódica das vacinas', onde: 'escritorio' },
  { id: 'contacaixa', texto: 'Todos os funcionários usam a mesma conta "caixa" no sistema', tipo: 'Vulnerabilidade', pilar: 'Irretratabilidade', prob: 3, imp: 2, controle: 'Uma conta por pessoa e registro de operações', onde: 'escritorio' },
  { id: 'varredura', texto: 'Grupo da BBS local varrendo redes da cidade com o SATAN', tipo: 'Ameaça', pilar: 'Confidencialidade', prob: 2, imp: 2, controle: 'Hardening e desativação de serviços expostos', onde: 'entrevista' },
];

const NIVEL = ['', 'baixa', 'média', 'alta'];
const NIVEL_I = ['', 'baixo', 'médio', 'alto'];

export function gerarDiagnostico(ctx: Ctx) {
  const { rng } = ctx;
  let achados = embaralhar(rng, ACHADOS).slice(0, 3 + ctx.dif > 4 ? 5 : 4);
  // garante um maior risco único
  achados = achados.map((a, i) => (i === 0 ? { ...a, prob: 3, imp: 3 } : a.prob * a.imp >= 9 ? { ...a, imp: 2 } : a));
  achados = embaralhar(rng, achados);
  const topo = achados.reduce((m, a) => (a.prob * a.imp > m.prob * m.imp ? a : m));
  const linhasDe = (onde: string, normais: string[]) => embaralhar(rng, [...normais.map((t) => ({ t })), ...achados.filter((a) => a.onde === onde).map((a) => ({ t: a.texto, pista: a.id }))]);

  const ferramentas = [
    ferramenta('servidor', 'Vistoria: sala do servidor', 'Onde fica o coração da empresa.', 1, linhasDe('servidor', ['Servidor 486 DX2 com 16 MB de RAM', 'Cabos de rede organizados com abraçadeiras', 'Extintor de incêndio na validade'])),
    ferramenta('escritorio', 'Vistoria: escritório', 'Mesas, telas e hábitos.', 1, linhasDe('escritorio', ['Quatro computadores e uma impressora a laser', 'Cortina blackout na janela', 'Calendário da padaria do bairro'])),
    ferramenta('entrevista', 'Entrevista com o dono', 'O que preocupa e o que já aconteceu.', 0.5, linhasDe('entrevista', ['"Nunca aconteceu nada sério aqui"', '"O sistema de vendas é o mais importante"'])),
  ];
  const evidencias = achados.map((a) => ({ id: a.id, nome: a.texto }));
  const descr = (a: Achado) => `${a.texto} (probabilidade ${NIVEL[a.prob]}, impacto ${NIVEL_I[a.imp]})`;
  const etapas: Etapa[] = [
    {
      tipo: 'campos', titulo: 'Classificação dos achados', pergunta: 'Para cada achado, diga se é uma ameaça ou uma vulnerabilidade e qual propriedade de segurança ele põe em risco.',
      cab: ['Achado', 'Ameaça ou vulnerabilidade', 'Propriedade'],
      linhas: achados.map((a) => ({ rotulo: [a.texto], campos: [{ aceita: [a.tipo], opcoes: ['Ameaça', 'Vulnerabilidade'] }, { aceita: [a.pilar], opcoes: ['Confidencialidade', 'Integridade', 'Disponibilidade', 'Irretratabilidade'] }] })),
      explicacao: 'Vulnerabilidade é a fragilidade do ativo ou do controle (o post-it, a falta de nobreak). Ameaça é a causa potencial do incidente (o ex-funcionário, a enchente, o vírus circulando). Registro de quem fez o quê sustenta a irretratabilidade.',
      item: 'cia-09', horasErro: 1,
    },
    escolha(rng, 'Prioridade', `Considerando risco = probabilidade × impacto, qual achado deve ser tratado primeiro?\n\n${achados.map(descr).join('\n')}`, topo.texto, achados.filter((a) => a !== topo).map((a) => a.texto),
      `${topo.texto}: probabilidade alta e impacto alto, o maior produto da lista. Risco combina a chance de a ameaça explorar a vulnerabilidade com o estrago resultante.`, 'cia-09'),
    escolha(rng, 'Recomendação', `Para o achado prioritário (${topo.texto.toLowerCase()}), qual controle você recomenda?`, topo.controle, achados.filter((a) => a !== topo).map((a) => a.controle),
      'O controle precisa atacar a vulnerabilidade ou reduzir o impacto daquele risco específico. Os outros controles são bons, mas para outros achados.', topo.pilar === 'Disponibilidade' ? 'cia-06' : topo.pilar === 'Irretratabilidade' ? 'cia-02' : 'hrd-09'),
    {
      tipo: 'ce', titulo: 'Afirmações do parecer', pergunta: 'Julgue as afirmações do parecer entregue ao dono.', explicacao: '', laudo: true, horasErro: 0,
      afirmacoes: embaralhar(rng, [
        { t: 'Vulnerabilidade é a causa potencial de um incidente indesejado.', certo: false, item: 'cia-09', por: 'Essa é a definição de ameaça; vulnerabilidade é a fragilidade explorável.' },
        { t: 'Contas individuais com registro das operações apoiam a irretratabilidade.', certo: true, item: 'cia-02', por: 'Com cada ação ligada a uma pessoa, ninguém consegue negar o que fez.' },
        { t: 'Guardar o backup na mesma sala do servidor protege adequadamente a disponibilidade dos dados.', certo: false, item: 'cia-06', por: 'Um único incidente (incêndio, enchente) leva os dois.' },
        { t: 'Combinar várias camadas de controles independentes é o princípio da defesa em profundidade.', certo: true, item: 'hrd-09', por: 'A falha de uma camada não compromete o todo.' },
      ]).slice(0, 3),
    },
  ];
  return novoCaso({
    servico: 'diagnostico', titulo: 'O que pode dar errado?', horasPrazo: 7 + ctx.dif,
    chamado: sub('{p}: "Depois do susto do concorrente, quero saber o que pode dar errado aqui em {c}. Mas sem me assustar muito, por favor."', ctx),
    perguntas: [{ p: 'O que é mais importante para o negócio?', r: 'O sistema de vendas e a planilha financeira. Sem eles eu fecho as portas.', horas: 0.25 }],
    ferramentas, evidencias, etapas,
    verificacao: { texto: 'Revisar o parecer com o dono antes de entregar', horas: 1, resultado: 'O dono entendeu as prioridades e já encomendou o nobreak. Ou pelo menos disse que vai.' },
  });
}
