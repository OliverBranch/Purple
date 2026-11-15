import { Cliente, ServicoModelo } from '../core/tipos';

// Serviços pontuais do Ato 1. {c} = cliente, {p} = pessoa de contato.
// Serviços do Ato 1. Cada um tem um gerador de atendimento em conteudo/casos.
export const SERVICOS: ServicoModelo[] = [
  { id: 'rede', nome: 'Montagem de rede local', desc: 'Projetar e instalar a rede com os equipamentos certos.', topicos: ['equip', 'osi', 'ipv4'], desdeAno: 1995 },
  { id: 'virus', nome: 'Limpeza de vírus', desc: 'Investigar, identificar e remover a praga, e achar por onde ela entrou.', topicos: ['malware', 'cia'], desdeAno: 1995 },
  { id: 'servidor', nome: 'Blindagem de servidor', desc: 'Fechar serviços, contas e acessos que não deveriam existir.', topicos: ['hard', 'tcpip'], desdeAno: 1995 },
  { id: 'enderecos', nome: 'Plano de endereçamento', desc: 'Calcular sub-redes, configurar NAT e resolver conflitos de IP.', topicos: ['ipv4', 'ipv6'], desdeAno: 1995 },
  { id: 'diagnostico', nome: 'Diagnóstico de segurança', desc: 'Vistoriar, classificar ameaças e vulnerabilidades e priorizar riscos.', topicos: ['cia', 'hard'], desdeAno: 1995 },
];

export const servicoPorId = (id: string): ServicoModelo => SERVICOS.find((s) => s.id === id) ?? (SERVICOS[0] as ServicoModelo);

// Clientes fictícios da era da garagem. Qualquer semelhança é paródia.
export const CLIENTES: Cliente[] = [
  { nome: 'Locadora Rebobine Vídeo', setor: 'Locadora', contato: 'Seu Agenor' },
  { nome: 'Polystation Games', setor: 'Loja de videogames', contato: 'Marquinhos' },
  { nome: 'Contabilidade Débito & Crédito', setor: 'Escritório contábil', contato: 'Dona Neide' },
  { nome: 'Provedor Discadão Online', setor: 'Provedor de Internet', contato: 'Jorge do Modem' },
  { nome: 'Macrohard Cursos de Informática', setor: 'Escola de informática', contato: 'Professor Gates' },
  { nome: 'Netscafé Cyber Café', setor: 'Cyber café', contato: 'Marcão' },
  { nome: 'Compaqto Computadores', setor: 'Loja de informática', contato: 'Seu Valdir' },
  { nome: 'Clínica Sorriso 2000', setor: 'Clínica odontológica', contato: 'Dra. Lúcia' },
  { nome: 'Imobiliária Lar Doce Laje', setor: 'Imobiliária', contato: 'Sandra' },
  { nome: 'Transportadora Roda Presa', setor: 'Transportadora', contato: 'Seu Olavo' },
  { nome: 'BBS Toca do Modem', setor: 'BBS', contato: 'SysOp Trovão' },
  { nome: 'Mappão Móveis e Eletro', setor: 'Loja de departamentos', contato: 'Gerente Peixoto' },
  { nome: 'Padaria Sonho Meu', setor: 'Padaria', contato: 'Seu Manoel' },
  { nome: 'Rádio Maré Alta FM', setor: 'Emissora de rádio', contato: 'Locutor Dinho' },
  { nome: 'Cooperativa Poupa Tudo', setor: 'Cooperativa de crédito', contato: 'Sr. Abelardo' },
  { nome: 'Altavisto Classificados', setor: 'Jornal de anúncios', contato: 'Editora Carla' },
];

// Quem avalia o serviço num cliente pequeno.
export const AVALIADORES = ['O dono', 'O sobrinho que entende de computador', 'A contadora', 'O funcionário mais antigo'];
export const CRITERIOS = ['Resolveu e achou a causa', 'Correção técnica', 'Horas cobradas', 'Laudo e causa raiz'];

export const COMENTARIOS: { alto: string[]; medio: string[]; baixo: string[] }[] = [
  { // dono
    alto: ['"Não entendi metade do que foi feito, mas funciona. Recomendo."', '"Vou indicar para o meu cunhado. Ele precisa mais do que eu."', '"Pela primeira vez o computador faz o que eu mando."'],
    medio: ['"Ficou bom. Podia ter ficado pronto antes, mas ficou bom."', '"Resolveu. Não me pergunte o quê."', '"Serviço honesto. O preço também, infelizmente."'],
    baixo: ['"Paguei para aprender que o problema era outro."', '"Antes dava defeito de graça."', '"O rapaz é esforçado. É o que posso dizer."'],
  },
  { // sobrinho
    alto: ['"Eu teria feito igual. Só não fiz porque estava ocupado."', '"Tá, admito que aprendi umas coisas."', '"Perguntei um monte de coisa e a resposta fazia sentido. Estranho."'],
    medio: ['"Eu faria diferente, mas não vou dizer como."', '"Algumas explicações ficaram meio vagas."', '"Funciona. Meu jeito era mais rápido, e também não funcionava."'],
    baixo: ['"Fiz uma pergunta simples e a resposta estava errada. Eu conferi na revista."', '"Até eu sei que não é assim."', '"Meu tio pagou por isso?"'],
  },
  { // contadora
    alto: ['"Entregou no prazo e sem surpresa na nota. Raridade."', '"Custo justificado. Pode lançar."', '"Se todo fornecedor fosse assim, eu dormiria melhor."'],
    medio: ['"Dentro do orçamento. Quase dentro do prazo."', '"Aceitável. Vou parcelar mesmo assim."', '"O relatório podia explicar melhor para onde foi o dinheiro."'],
    baixo: ['"Vou pagar porque está no contrato."', '"O prazo era uma sugestão, pelo visto."', '"Já vi orçamento de reforma mais confiável."'],
  },
  { // funcionário
    alto: ['"Trabalho aqui há vinte anos e é a primeira vez que alguém explica direito."', '"Parou de travar. Milagre não é, então deve ser competência."', '"Até a impressora obedece agora."'],
    medio: ['"Melhorou. A máquina de escrever ainda está guardada, por via das dúvidas."', '"Ficou diferente. Diferente é bom?"', '"Ainda trava de vez em quando, mas com mais educação."'],
    baixo: ['"No meu tempo se resolvia isso desligando da tomada."', '"Mexeram em tudo e a minha pasta sumiu."', '"Prefiro o defeito antigo, que eu já conhecia."'],
  },
];

export const ORIGENS = [
  { nome: 'Ex-operador de CPD', desc: 'Anos trocando fita de backup de madrugada. Todo atendimento gasta 15% menos horas.', horas: 0.85, ferramentas: 1, laudo: 1, insight: 1, pagamento: 1 },
  { nome: 'Hacker de BBS regenerado', desc: 'Jura que só olhava. Ferramentas de investigação custam 30% menos horas.', horas: 1, ferramentas: 0.7, laudo: 1, insight: 1, pagamento: 1 },
  { nome: 'Ex-auditor de banco', desc: 'Já leu normas por prazer. Laudos valem 20% mais na nota.', horas: 1, ferramentas: 1, laudo: 1.2, insight: 1, pagamento: 1 },
  { nome: 'Técnico de informática do bairro', desc: 'Conhece todo mundo e todo mundo deve um favor. Recebe 15% a mais por contrato.', horas: 1, ferramentas: 1, laudo: 1, insight: 1, pagamento: 1.15 },
  { nome: 'Concurseiro', desc: 'Estuda até em fila de banco. Ganha 25% mais Insight por acerto.', horas: 1, ferramentas: 1, laudo: 1, insight: 1.25, pagamento: 1 },
];

export const PERSONALIDADES = [
  { nome: 'Preguiçoso', desc: 'Dorme em cima de qualquer coisa quente.' },
  { nome: 'Caótico', desc: 'Corre sem motivo às três da manhã.' },
  { nome: 'Carinhoso', desc: 'Segue você pela garagem.' },
  { nome: 'Caçador', desc: 'Persegue o cursor do mouse. E cabos.' },
  { nome: 'Curioso', desc: 'Precisa inspecionar cada caixa.' },
];
