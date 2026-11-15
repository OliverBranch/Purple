// Montagem de rede local: projetar com os equipamentos certos, contar domínios, diagnosticar a instalação.
import { Etapa, EtapaCampos } from '../../core/caso';
import { Ctx, embaralhar, escolha, ferramenta, novoCaso, sub } from './comum';

const EQUIP = ['Cabo direto', 'Hub', 'Switch', 'Repetidor', 'Bridge', 'Roteador'];
const PRECO: Record<string, number> = { 'Cabo direto': 30, Hub: 180, Switch: 900, Repetidor: 150, Bridge: 600, Roteador: 1400 };

interface Ponto { rotulo: string; aceita: string[]; pista: { id: string; nome: string; linha: string; ferramenta: string } }

export function gerarRede(ctx: Ctx) {
  const { rng } = ctx;
  const nPc = 3 + Math.floor(rng() * 5);
  const desempenho = rng() < 0.6;
  const dist = rng() < 0.55 ? 110 + Math.floor(rng() * 60) : 25 + Math.floor(rng() * 60);
  const internet = rng() < 0.6;
  const separar = rng() < 0.45;
  const pontos: Ponto[] = [
    {
      rotulo: `Sala principal (${nPc} computadores)`,
      aceita: desempenho ? ['Switch'] : ['Hub', 'Switch'],
      pista: desempenho
        ? { id: 'desemp', nome: 'O caixa não pode travar quando o escritório imprime', linha: 'Requisito: "o caixa não pode ficar lento quando o escritório manda imprimir ou copia arquivos grandes"', ferramenta: 'requisitos' }
        : { id: 'leve', nome: 'Uso leve e orçamento apertado', linha: 'Requisito: "uso leve, só planilha e impressora; orçamento apertado"', ferramenta: 'requisitos' },
    },
    {
      rotulo: `Ligação com o depósito (${dist} m de cabo)`,
      aceita: dist > 100 ? ['Repetidor', 'Switch', 'Hub'] : ['Cabo direto'],
      pista: { id: 'dist', nome: `Depósito a ${dist} m de cabo`, linha: `Escritório → depósito: ${dist} m de cabo (par trançado)`, ferramenta: 'planta' },
    },
  ];
  if (internet) pontos.push({ rotulo: 'Saída para o provedor de Internet', aceita: ['Roteador'], pista: { id: 'net', nome: 'Acesso ao provedor por linha dedicada', linha: 'O provedor vai entregar uma linha dedicada; a rede interna é outra rede IP', ferramenta: 'requisitos' } });
  if (separar) pontos.push({ rotulo: 'Separação entre a rede dos clientes e a da administração', aceita: ['Roteador'], pista: { id: 'sep', nome: 'Rede dos clientes isolada da administração (broadcast separado)', linha: 'Requisito: "os micros dos clientes não podem enxergar os da administração, nem receber o broadcast deles"', ferramenta: 'requisitos' } });

  const orcamento = pontos.reduce((a, p) => a + Math.min(...p.aceita.map((x) => PRECO[x] ?? 0)), 0) + 300 + nPc * 40;
  const evidencias = pontos.map((p) => ({ id: p.pista.id, nome: p.pista.nome }));
  const por = (f: string) => pontos.filter((p) => p.pista.ferramenta === f).map((p) => ({ t: p.pista.linha, pista: p.pista.id }));

  const ferramentas = [
    ferramenta('planta', 'Planta do local', 'Medidas, salas e por onde o cabo pode passar.', 1, [
      { t: `Escritório: ${nPc} mesas com computador` }, { t: 'Forro de gesso, canaleta na parede do fundo' }, ...por('planta'), { t: 'Quadro de energia ao lado da porta' },
    ]),
    ferramenta('requisitos', 'Conversa sobre requisitos', 'O que o cliente precisa, nas palavras dele.', 0.5, [{ t: `Orçamento para equipamentos: até R$ ${orcamento}` }, ...por('requisitos'), { t: 'Quer "uma rede bonita, com luzinhas"' }]),
    ferramenta('inventario', 'Inventário', 'Placas de rede, cabos e equipamentos existentes.', 0.5, [
      { t: `${nPc} computadores, todos com placa de rede 10BASE-T (RJ-45)` }, { t: 'Uma impressora matricial na sala principal' }, { t: 'Nenhum equipamento de rede instalado' },
    ]),
    ferramenta('sniffer', 'Analisador de pacotes', 'Escuta o fio da rede provisória (coaxial) que já existe.', 0.5, [
      { t: 'Quadros por segundo: 340   Colisões: 22%' + (desempenho ? '  (picos quando a impressora recebe arquivos)' : ''), ...(desempenho ? { pista: 'desemp' } : {}) },
      { t: 'ARP who-has 192.168.0.1? — entregue a todas as estações (broadcast)' },
      { t: 'Retransmissões TCP altas no micro do caixa', ...(desempenho ? { pista: 'desemp' } : {}) },
    ], 'osi3'),
    ferramenta('catalogo', 'Catálogo do distribuidor', 'Preços de 1995.', 0.25, EQUIP.map((e) => ({ t: `${e.padEnd(12)} R$ ${PRECO[e]}` }))),
  ];

  const projeto: EtapaCampos = {
    tipo: 'campos', titulo: 'Projeto da rede', pergunta: 'Escolha o equipamento de cada ponto. O orçamento conta na nota da contadora.',
    cab: ['Ponto', 'Equipamento'], linhas: pontos.map((p) => ({ rotulo: [p.rotulo], campos: [{ aceita: p.aceita, opcoes: EQUIP }] })),
    explicacao: 'Hub repete tudo para todas as portas (um domínio de colisão); o switch separa colisões porta a porta. Cabo de par trançado vai até 100 m: além disso, é preciso regenerar o sinal (repetidor ou outro equipamento ativo). Roteador interliga redes IP distintas e separa domínios de broadcast.',
    item: 'eqp-02', horasErro: 2,
  };

  // topologia de referência para contar domínios
  const segs = 2 + Math.floor(rng() * 2);
  const desc: string[] = [];
  let col = 0;
  for (let i = 0; i < segs; i++) {
    const hub = rng() < 0.5;
    const n = 2 + Math.floor(rng() * 4);
    desc.push(`${hub ? 'um hub' : 'um switch'} com ${n} computadores`);
    col += hub ? 1 : n + 1;
  }
  const dominios: Etapa = {
    tipo: 'campos', titulo: 'Domínios', pergunta: `O cliente quer entender a rede de outra loja dele: um roteador com ${segs} interfaces, cada uma ligada a ${desc.join('; ')}. (Conte o enlace roteador–equipamento como uma porta.) Quantos domínios existem?`,
    cab: ['Tipo de domínio', 'Quantidade'], linhas: [{ rotulo: ['Colisão'], campos: [{ aceita: [String(col)] }] }, { rotulo: ['Broadcast'], campos: [{ aceita: [String(segs)] }] }],
    explicacao: `Cada porta de switch é um domínio de colisão (os computadores mais a porta que vai ao roteador); um hub inteiro, com o enlace até o roteador, é um só. O roteador separa broadcast: cada interface usada é um domínio de broadcast. Total: ${col} de colisão e ${segs} de broadcast.`,
    item: 'eqp-02', horasErro: 0.5,
  };

  const dev = embaralhar(rng, [['Switch', 'Enlace (2)', 'eqp-08'], ['Hub', 'Física (1)', 'eqp-01'], ['Roteador', 'Rede (3)', 'eqp-03'], ['Repetidor', 'Física (1)', 'eqp-05'], ['Bridge', 'Enlace (2)', 'eqp-04']])[0]!;
  const camada = escolha(rng, 'Na ponta da língua', `O sobrinho quer saber: em que camada do modelo OSI o ${dev[0].toLowerCase()} atua?`, dev[1]!, ['Física (1)', 'Enlace (2)', 'Rede (3)', 'Transporte (4)', 'Aplicação (7)'].filter((x) => x !== dev[1]),
    'Repetidor e hub lidam só com o sinal (física). Bridge e switch decidem pelo endereço MAC (enlace). Roteador decide pelo endereço IP (rede).', dev[2]);

  const falha = rng() < 0.5
    ? escolha(rng, 'Teste final', 'No teste, uma estação mostra no winipcfg o endereço 169.254.37.12 e não fala com ninguém. O diagnóstico é:', 'A estação não obteve resposta do servidor DHCP e se autoconfigurou com link-local',
      ['O cabo excede 100 metros', 'O hub está filtrando quadros dessa porta', 'A estação recebeu um IP público', 'O endereço é o loopback da placa'], 'A faixa 169.254.0.0/16 é link-local (APIPA): a estação se atribui um endereço quando o DHCP não responde.', 'ip4-08')
    : escolha(rng, 'Teste final', `O ping para o micro do depósito falha. A luz de link da placa está apagada e o cabo tem ${Math.max(dist, 120)} m sem nenhum equipamento no meio. O problema está na camada`, 'Física (1)', ['Enlace (2)', 'Rede (3)', 'Transporte (4)', 'Aplicação (7)'],
      'Sem sinal elétrico (luz de link apagada, cabo longo demais) o problema é físico: atenuação. Um repetidor ou equipamento ativo regenera o sinal.', 'eqp-05');

  const laudo: Etapa = {
    tipo: 'ce', titulo: 'Afirmações do laudo', pergunta: 'Julgue as afirmações do laudo de entrega.', explicacao: '', laudo: true, horasErro: 0,
    afirmacoes: embaralhar(rng, [
      { t: 'O hub encaminha cada quadro apenas para a porta do destinatário.', certo: false, item: 'eqp-01', por: 'O hub repete o sinal para todas as portas.' },
      { t: 'Cada porta do switch constitui um domínio de colisão separado.', certo: true, item: 'eqp-02', por: 'O switch segmenta colisões porta a porta.' },
      { t: 'O switch aprende os endereços a partir do MAC de origem dos quadros recebidos.', certo: true, item: 'eqp-08', por: 'Ele anota o MAC de origem e a porta de chegada.' },
      { t: 'O roteador propaga o broadcast de uma rede para as demais.', certo: false, item: 'eqp-03', por: 'Roteador separa domínios de broadcast.' },
    ]).slice(0, 3),
  };

  return novoCaso({
    servico: 'rede', titulo: 'Rede nova', horasPrazo: 9 + ctx.dif,
    chamado: sub(`{p}: "Quero ligar os ${nPc} computadores de {c} numa rede. Hoje o arquivo vai de uma máquina para outra no disquete, e a impressora tem fila na frente da mesa."`, ctx),
    perguntas: [
      { p: 'Para que vão usar a rede?', r: desempenho ? 'Caixa, estoque e impressora. O caixa não pode travar de jeito nenhum.' : 'Planilha e impressora, nada pesado.', horas: 0.25 },
      { p: 'Vai precisar de Internet?', r: internet ? 'O provedor já vendeu uma linha dedicada.' : 'Por enquanto não.', horas: 0.25, ...(internet ? { pista: 'net' } : {}) },
    ],
    ferramentas, evidencias, etapas: [projeto, dominios, camada, falha, laudo],
    verificacao: { texto: 'Testar a rede inteira com ping e copiar arquivos grandes', horas: 1, resultado: 'Todas as estações respondem e a impressora não engasga mais.' },
  });
}
