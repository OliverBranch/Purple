// Limpeza de vírus num PC com Windows 95. Seis famílias reais de praga, cada uma com sintomas,
// artefatos e remediação próprios.
import { Etapa, Linha } from '../../core/caso';
import { Ctx, escolha, ferramenta, hora, misturar, novoCaso, ordem, sub } from './comum';

interface Familia {
  id: string;
  desde: number;
  nomeTitulo: string;
  chamado: string;
  classe: string;
  itemClasse: string;
  porqueClasse: string;
  cid: string;
  itemCid: string;
  porqueCid: string;
  evidencias: { id: string; nome: string }[];
  raiz: string;
  linhas: { [ferramenta: string]: Linha[] };
  perguntas: { p: string; r: string; pista?: string }[];
  remediar: string[];
  distratores: string[];
  porqueOrdem: string;
  laudo: { t: string; certo: boolean; item: string; por: string }[];
  causas: [string, ...string[]];
  extra?: (ctx: Ctx) => Etapa[];
  verifica: string;
}

const CLASSES = ['Vírus', 'Worm', 'Cavalo de troia', 'Ransomware', 'Keylogger', 'Rootkit', 'Bot', 'Vírus de macro', 'Screenlogger', 'Backdoor'];
const CID = ['Confidencialidade', 'Integridade', 'Disponibilidade', 'Irretratabilidade'];

const FAMILIAS: Familia[] = [
  {
    id: 'macro', desde: 1995, nomeTitulo: 'Documentos estranhos no Word',
    chamado: '{p}: "Desde segunda, todo documento que eu salvo vira modelo e aparece uma caixinha só com o número 1. Os pedidos da semana estão todos assim."',
    classe: 'Vírus de macro', itemClasse: 'mal-09',
    porqueClasse: 'O código vive nas macros do NORMAL.DOT e dos documentos: precisa de um documento hospedeiro e se espalha quando alguém abre o arquivo com macros habilitadas. É o comportamento do WM.Concept, de 1995.',
    cid: 'Integridade', itemCid: 'cia-01', porqueCid: 'Os documentos e o modelo NORMAL.DOT foram alterados sem autorização: a integridade foi violada. Ninguém leu nada indevido nem ficou sem acesso.',
    evidencias: [{ id: 'normal', nome: 'NORMAL.DOT alterado hoje' }, { id: 'av', nome: 'Antivírus: WM.Concept em 14 documentos' }, { id: 'disq', nome: 'Pedidos chegaram em disquete do fornecedor' }],
    raiz: 'disq',
    linhas: {
      arquivos: [{ t: 'C:\\MSOFFICE\\MODELOS\\NORMAL.DOT     45.056  hoje 08:12', pista: 'normal' }, { t: 'A:\\PEDIDOS.DOC   (disquete do fornecedor)  12.288  seg 07:55', pista: 'disq' }],
      av: [{ t: '>> WM.Concept (vírus de macro) em C:\\MSOFFICE\\MODELOS\\NORMAL.DOT', pista: 'av' }, { t: '>> WM.Concept em 13 documentos de C:\\PEDIDOS', pista: 'av' }],
      heur: [{ t: 'Macro AutoOpen copia-se para o modelo global ao abrir documento', pista: 'av' }],
    },
    perguntas: [{ p: 'Recebeu algum documento de fora?', r: 'Só a planilha de pedidos do fornecedor de farinha, que veio num disquete.', pista: 'disq' }],
    remediar: ['Fazer cópia dos documentos importantes', 'Limpar o NORMAL.DOT e os documentos com antivírus atualizado', 'Desabilitar a execução automática de macros', 'Examinar o disquete e avisar o fornecedor'],
    distratores: ['Formatar o disco imediatamente', 'Apagar todos os documentos infectados'],
    porqueOrdem: 'Primeiro preserva os dados, depois limpa o modelo global (senão ele reinfecta tudo), então fecha a porta de entrada (macros automáticas) e corta a origem (o disquete). Formatar ou apagar documentos destrói dados que podem ser limpos.',
    laudo: [
      { t: 'O código identificado depende de um documento hospedeiro e da execução de macros para se propagar.', certo: true, item: 'mal-09', por: 'Vírus de macro é escrito na linguagem de macros do aplicativo e infecta documentos.' },
      { t: 'Um antivírus baseado somente em assinaturas detecta variantes ainda não catalogadas.', certo: false, item: 'mal-10', por: 'Assinatura só reconhece o que já foi catalogado; variantes novas exigem heurística.' },
    ],
    causas: ['Disquete de pedidos do fornecedor', 'Queda de energia durante o salvamento', 'Excesso de programas abertos', 'Ataque vindo da Internet'],
    verifica: 'Na manhã seguinte, nenhum documento novo foi alterado. O fornecedor agradeceu o aviso e também tinha o vírus.',
  },
  {
    id: 'worm', desde: 1995, nomeTitulo: 'A rede inteira lenta',
    chamado: '{p}: "As duas máquinas do escritório ficaram lentas ao mesmo tempo, e a luzinha do hub não para de piscar nem de madrugada."',
    classe: 'Worm', itemClasse: 'mal-01',
    porqueClasse: 'O executável se copia sozinho para outras máquinas pela rede, explorando o compartilhamento aberto, sem arquivo hospedeiro nem ação do usuário. Isso é um worm.',
    cid: 'Disponibilidade', itemCid: 'cia-03', porqueCid: 'O worm consome rede e processamento até as máquinas ficarem inutilizáveis: o alvo principal é a disponibilidade.',
    evidencias: [{ id: 'proc', nome: 'WINUPD32.EXE rodando nas duas máquinas' }, { id: 'run', nome: 'WINUPD32 na inicialização' }, { id: 'scan', nome: 'Dezenas de conexões para a porta 139 de outros IPs' }, { id: 'share', nome: 'C:\\ compartilhado sem senha' }],
    raiz: 'share',
    linhas: {
      tarefas: [{ t: 'Winupd32', pista: 'proc' }],
      inicio: [{ t: 'Run: WinUpdate = C:\\WINDOWS\\WINUPD32.EXE', pista: 'run' }],
      netstat: [{ t: '  TCP    192.168.0.2:1047    192.168.0.3:139    SYN_SENT', pista: 'scan' }, { t: '  TCP    192.168.0.2:1048    192.168.0.4:139    SYN_SENT', pista: 'scan' }, { t: '  TCP    192.168.0.2:1049    192.168.0.5:139    SYN_SENT', pista: 'scan' }],
      compart: [{ t: 'C          C:\\          Acesso: total    Senha: (nenhuma)', pista: 'share' }],
      av: [],
      heur: [{ t: '>> WINUPD32.EXE: comportamento de autorreplicação via compartilhamentos de rede', pista: 'proc' }],
    },
    perguntas: [{ p: 'As outras máquinas têm o mesmo problema?', r: 'A do caixa também. Começou nela, eu acho, e passou para a minha sem ninguém fazer nada.', pista: 'proc' }],
    remediar: ['Desconectar as máquinas da rede', 'Encerrar o processo e remover da inicialização em cada máquina', 'Remover o compartilhamento sem senha', 'Reconectar e acompanhar o tráfego'],
    distratores: ['Limpar uma máquina por vez sem tirar da rede', 'Formatar as duas máquinas'],
    porqueOrdem: 'Com o worm vivo na rede, a máquina limpa é reinfectada em minutos: isolar vem primeiro. Depois limpa, fecha a vulnerabilidade explorada (compartilhamento aberto) e só então reconecta, observando.',
    laudo: [
      { t: 'O código se propagou sem depender de arquivo hospedeiro nem de ação do usuário.', certo: true, item: 'mal-01', por: 'Essa é a definição de worm.' },
      { t: 'Por estar ligado a um hub, o tráfego do worm ficou restrito à porta da máquina de destino.', certo: false, item: 'eqp-01', por: 'O hub repete o sinal para todas as portas; quem filtra pelo endereço MAC é o switch.' },
    ],
    causas: ['Disco C:\\ compartilhado sem senha', 'Disquete de joguinhos', 'Cabo de rede com defeito', 'Monitor ligado a noite toda'],
    verifica: 'Depois de 24 horas, o tráfego voltou ao normal e a luz do hub pisca só quando alguém imprime.',
  },
  {
    id: 'trojan', desde: 1995, nomeTitulo: 'O truco que abre o CD-ROM',
    chamado: '{p}: "Instalei um joguinho de truco que veio num disquete de revista. Agora a gaveta do CD-ROM abre sozinha e o mouse anda por conta própria."',
    classe: 'Cavalo de troia', itemClasse: 'mal-03',
    porqueClasse: 'O programa entrou disfarçado de jogo e foi executado pelo próprio usuário. Não se replica sozinho: é um cavalo de troia, que instalou um componente de acesso remoto.',
    cid: 'Confidencialidade', itemCid: 'cia-07', porqueCid: 'Alguém de fora controla a máquina e pode ler qualquer arquivo: a confidencialidade é a propriedade mais exposta.',
    evidencias: [{ id: 'proc', nome: 'PATCH.EXE rodando' }, { id: 'run', nome: 'PATCH.EXE na inicialização' }, { id: 'porta', nome: 'Porta 12345 aberta esperando conexão' }, { id: 'truco', nome: 'TRUCO.EXE instalado no dia em que começou' }],
    raiz: 'truco',
    linhas: {
      tarefas: [{ t: 'Patch', pista: 'proc' }],
      inicio: [{ t: 'Run: Patch = C:\\WINDOWS\\PATCH.EXE', pista: 'run' }],
      netstat: [{ t: '  TCP    0.0.0.0:12345       0.0.0.0:0          LISTENING', pista: 'porta' }],
      arquivos: [{ t: 'C:\\JOGOS\\TRUCO\\TRUCO.EXE    1.204.224  ter 19:40', pista: 'truco' }, { t: 'C:\\WINDOWS\\PATCH.EXE         471.040  ter 19:41', pista: 'proc' }],
      av: [{ t: '>> Trojan.Backdoor em C:\\WINDOWS\\PATCH.EXE', pista: 'proc' }],
      heur: [{ t: '>> PATCH.EXE abre porta de rede e aceita comandos remotos', pista: 'porta' }],
    },
    perguntas: [{ p: 'Instalou algum programa novo?', r: 'Só o truco da revista. O sobrinho garantiu que era original.', pista: 'truco' }],
    remediar: ['Desconectar a máquina da rede', 'Remover o PATCH.EXE e a entrada de inicialização', 'Desinstalar o jogo de truco', 'Trocar as senhas usadas nesta máquina'],
    distratores: ['Manter o jogo e só reiniciar a máquina', 'Trocar as senhas antes de remover o programa'],
    porqueOrdem: 'Isola para cortar o controle remoto, remove o componente malicioso e a origem, e só então troca as senhas: trocar antes, com o invasor ainda dentro, entrega as novas senhas a ele.',
    laudo: [
      { t: 'O cavalo de troia se replica automaticamente para outras máquinas da rede.', certo: false, item: 'mal-03', por: 'Trojan depende de o usuário executá-lo; quem se replica sozinho é o worm.' },
      { t: 'A porta aberta à espera de conexões permite ao invasor voltar à máquina sem repetir a invasão.', certo: true, item: 'mal-07', por: 'É a função da backdoor.' },
    ],
    causas: ['Jogo de truco do disquete da revista', 'Compartilhamento de disco sem senha', 'Vírus de macro em documento', 'Defeito no drive de CD-ROM'],
    extra: (ctx) => [escolha(ctx.rng, 'O que a porta aberta indica', 'O netstat mostra a porta 12345 em estado LISTENING, aberta pelo PATCH.EXE. Esse componente é um(a)', 'Backdoor', ['Rootkit', 'Keylogger', 'Worm', 'Servidor web legítimo'],
      'Um serviço escondido que espera conexões do invasor para que ele volte à máquina é uma backdoor (porta dos fundos).', 'mal-07')],
    verifica: 'Varredura de portas no dia seguinte: nada escutando além do normal. A gaveta do CD-ROM voltou a ter vida própria apenas quando apertam o botão.',
  },
  {
    id: 'keylogger', desde: 1995, nomeTitulo: 'A senha que vazou',
    chamado: '{p}: "Alguém entrou no sistema do banco com a minha senha. Eu não contei para ninguém, juro. Ela só existe na minha cabeça e no computador."',
    classe: 'Keylogger', itemClasse: 'mal-05',
    porqueClasse: 'O programa grava em arquivo tudo o que é digitado. Spyware que captura teclas é keylogger; o que captura a tela é screenlogger.',
    cid: 'Confidencialidade', itemCid: 'cia-07', porqueCid: 'A senha foi exposta a quem não deveria conhecê-la: violação de confidencialidade.',
    evidencias: [{ id: 'proc', nome: 'KBDHOOK.EXE rodando escondido' }, { id: 'log', nome: 'K.LOG crescendo a cada tecla' }, { id: 'run', nome: 'KBDHOOK na inicialização' }, { id: 'acel', nome: '"Acelerador de Internet" instalado' }],
    raiz: 'acel',
    linhas: {
      tarefas: [{ t: 'Kbdhook', pista: 'proc' }],
      inicio: [{ t: 'Run: KbdHook = C:\\WINDOWS\\SYSTEM\\KBDHOOK.EXE', pista: 'run' }],
      arquivos: [{ t: 'C:\\WINDOWS\\TEMP\\K.LOG               48.112  hoje (agora)', pista: 'log' }, { t: 'C:\\ACELERA\\ACELERA.EXE (Acelerador de Internet)  sex 21:03', pista: 'acel' }],
      av: [],
      heur: [{ t: '>> KBDHOOK.EXE intercepta o teclado e grava em C:\\WINDOWS\\TEMP\\K.LOG', pista: 'proc' }],
    },
    perguntas: [{ p: 'Instalou algum programa recentemente?', r: 'Um acelerador de Internet que o meu sobrinho baixou. A Internet continua lenta, mas instalou rapidinho.', pista: 'acel' }],
    remediar: ['Desconectar a máquina da rede', 'Remover o KBDHOOK.EXE e a entrada de inicialização', 'Desinstalar o "acelerador"', 'Trocar todas as senhas usando outra máquina, limpa'],
    distratores: ['Trocar as senhas nesta máquina antes da limpeza', 'Apagar só o arquivo K.LOG'],
    porqueOrdem: 'Senha nova digitada numa máquina com keylogger vaza de novo. Primeiro isola e limpa, remove a origem, e as senhas são trocadas de um computador confiável.',
    laudo: [
      { t: 'O screenlogger registra as teclas digitadas, enquanto o keylogger captura imagens da tela.', certo: false, item: 'mal-05', por: 'É o contrário: keylogger registra teclas; screenlogger captura a tela.' },
      { t: 'A troca de senhas deve ser feita a partir de um equipamento confiável.', certo: true, item: 'hrd-09', por: 'Com a máquina ainda comprometida, a senha nova seria capturada também.' },
    ],
    causas: ['"Acelerador de Internet" baixado pelo sobrinho', 'Senha fraca', 'Vírus de boot', 'Funcionário do banco'],
    verifica: 'Uma semana depois, nenhum acesso estranho na conta. O arquivo K.LOG não voltou.',
  },
  {
    id: 'boot', desde: 1995, nomeTitulo: 'A bolinha quicando',
    chamado: '{p}: "Uma bolinha fica quicando pela tela, e todo disquete que passa por esse computador leva a bolinha junto para os outros."',
    classe: 'Vírus', itemClasse: 'mal-02',
    porqueClasse: 'O código se instala no setor de boot e infecta os disquetes que passam pela máquina. Precisa de hospedeiro (o setor de boot) e de o sistema iniciar por ele: vírus de boot, como o Ping-Pong.',
    cid: 'Integridade', itemCid: 'cia-01', porqueCid: 'O setor de boot e os disquetes foram modificados sem autorização: integridade.',
    evidencias: [{ id: 'boot', nome: 'Setor de boot diferente do padrão' }, { id: 'av', nome: 'Antivírus: Ping-Pong no setor de boot' }, { id: 'disq', nome: 'Computador costuma ligar com disquete no drive' }],
    raiz: 'disq',
    linhas: {
      boot: [{ t: 'Setor de boot de C: ..... DIFERENTE DO PADRÃO (código desconhecido no deslocamento 01C0)', pista: 'boot' }],
      av: [{ t: '>> Ping-Pong (vírus de boot) no setor de boot de C:', pista: 'av' }, { t: '>> Ping-Pong no disquete em A:', pista: 'av' }],
      heur: [{ t: '>> Código residente em memória intercepta acesso a disquetes', pista: 'boot' }],
    },
    perguntas: [{ p: 'Costumam ligar o computador com disquete no drive?', r: 'Direto. O disquete de joguinhos das crianças vive esquecido lá.', pista: 'disq' }],
    remediar: ['Dar boot com disquete limpo, protegido contra gravação', 'Restaurar o setor de boot com o antivírus', 'Examinar todos os disquetes da empresa', 'Configurar para iniciar pelo disco rígido primeiro'],
    distratores: ['Rodar o antivírus com o sistema infectado já carregado', 'Formatar só os disquetes'],
    porqueOrdem: 'Com o vírus residente na memória, qualquer limpeza é enganada: o boot limpo vem primeiro. Depois restaura o setor, limpa os portadores e muda a ordem de boot para a infecção não voltar.',
    laudo: [
      { t: 'O código precisou de um hospedeiro, o setor de boot, para se propagar.', certo: true, item: 'mal-02', por: 'Vírus depende de hospedeiro e de execução.' },
      { t: 'A detecção foi possível porque a assinatura desse vírus já estava catalogada.', certo: true, item: 'mal-10', por: 'O Ping-Pong é antigo e conhecido; antivírus por assinatura o reconhece.' },
    ],
    causas: ['Disquete de joguinhos esquecido no drive', 'Documento do Word com macro', 'Compartilhamento sem senha', 'Linha telefônica com ruído'],
    verifica: 'Os disquetes testados no dia seguinte estão limpos. A bolinha aposentou.',
  },
  {
    id: 'resgate', desde: 1995, nomeTitulo: 'Arquivos sequestrados',
    chamado: '{p}: "Os arquivos viraram nomes esquisitos e apareceu uma mensagem pedindo para mandar dinheiro para uma caixa postal no Panamá."',
    classe: 'Ransomware', itemClasse: 'mal-04',
    porqueClasse: 'Os dados foram cifrados e há pedido de resgate para devolver o acesso: ransomware. O primeiro caso conhecido, o AIDS Trojan, chegou por disquete enviado pelo correio em 1989.',
    cid: 'Disponibilidade', itemCid: 'cia-03', porqueCid: 'Os dados continuam na máquina, mas inacessíveis: o efeito imediato é sobre a disponibilidade.',
    evidencias: [{ id: 'msg', nome: 'Mensagem de resgate na inicialização' }, { id: 'cifr', nome: 'Documentos renomeados e cifrados' }, { id: 'bkp', nome: 'Backup em fita de sexta-feira, guardado fora do computador' }, { id: 'aids', nome: 'Disquete "informações sobre AIDS" chegou pelo correio' }],
    raiz: 'aids',
    linhas: {
      inicio: [{ t: 'AUTOEXEC.BAT: C:\\REMIND.EXE  (exibe mensagem de pagamento)', pista: 'msg' }],
      arquivos: [{ t: 'C:\\DOCS\\#4F2A.!!!  (antes: CONTAS.DOC)   cifrado', pista: 'cifr' }, { t: 'C:\\DOCS\\#7B19.!!!  (antes: CLIENTES.DBF) cifrado', pista: 'cifr' }, { t: 'A:\\INSTALL.EXE  "AIDS Information - Introductory Diskette"', pista: 'aids' }],
      backup: [{ t: 'Fita DAT  "BACKUP SEXTA"  — guardada na gaveta, fora da máquina', pista: 'bkp' }],
      av: [{ t: '>> Trojan.AIDS em C:\\REMIND.EXE', pista: 'msg' }],
      heur: [{ t: '>> Processo cifrando arquivos de dados em lote', pista: 'cifr' }],
    },
    perguntas: [{ p: 'Chegou algum disquete diferente?', r: 'Veio pelo correio um disquete com informações sobre AIDS. Achei que era da prefeitura.', pista: 'aids' }, { p: 'Vocês fazem backup?', r: 'Toda sexta a contadora grava numa fita e leva para casa.', pista: 'bkp' }],
    remediar: ['Desconectar a máquina da rede', 'Guardar uma cópia dos arquivos cifrados', 'Remover o código malicioso', 'Restaurar os arquivos a partir do backup'],
    distratores: ['Pagar o resgate', 'Restaurar o backup antes de remover o código'],
    porqueOrdem: 'Isola para não atingir mais nada, preserva a evidência, remove o código e só então restaura: restaurar com a praga ativa faz ela cifrar o backup também. Pagar não garante nada.',
    laudo: [
      { t: 'O ataque afetou principalmente a disponibilidade dos dados.', certo: true, item: 'mal-04', por: 'Os dados foram tornados inacessíveis.' },
      { t: 'Uma cópia de segurança gravada no mesmo disco do computador seria suficiente contra esse ataque.', certo: false, item: 'cia-06', por: 'A cópia no mesmo disco seria cifrada junto; o backup precisa ficar fora do alcance da máquina.' },
    ],
    causas: ['Disquete "informações sobre AIDS" recebido pelo correio', 'Ataque de negação de serviço', 'Senha anotada em papel', 'Falha no disco rígido'],
    verifica: 'Os arquivos restaurados abrem normalmente, e a mensagem não voltou depois de três reinicializações.',
  },
];

const TAREFAS_NORMAIS = ['Kernel32', 'Msgsrv32', 'Explorer', 'Mprexe', 'Systray', 'Winword', 'Ddhelp'];
const INICIO_NORMAL = ['AUTOEXEC.BAT: LH C:\\WINDOWS\\COMMAND\\MSCDEX.EXE /D:MSCD001', 'AUTOEXEC.BAT: SET BLASTER=A220 I5 D1 T4', 'AUTOEXEC.BAT: LH C:\\MOUSE\\MOUSE.COM', 'WIN.INI: load=', 'Run: SystemTray = SysTray.Exe'];
const NETSTAT_NORMAL = ['Conexões ativas', '  Proto  Endereço local      Endereço externo   Estado', '  TCP    192.168.0.2:137     0.0.0.0:0          LISTENING', '  TCP    192.168.0.2:139     0.0.0.0:0          LISTENING'];
const COMPART_NORMAL = ['Compartilhamento   Caminho        Acesso', 'IMPRESSORA         LPT1           Impressão'];

export function gerarVirus(ctx: Ctx) {
  const { rng } = ctx;
  const fams = FAMILIAS.filter((f) => f.desde <= ctx.ano);
  const f = fams[Math.floor(rng() * fams.length)]!;
  const L = (id: string) => f.linhas[id] ?? [];
  const arquivosNormais = [`C:\\WINDOWS\\WIN.INI              4.112  ${['seg', 'ter', 'qua'][Math.floor(rng() * 3)]} ${hora(rng)}`, 'C:\\CONTAS\\CAIXA.XLS            22.528  ontem 18:02', 'C:\\WINDOWS\\SYSTEM.DAT        491.520  hoje 08:01'];
  const avNormal = ['Varredura completa de C: ... 8.214 arquivos examinados'];
  const avFim = L('av').length ? [] : [{ t: 'Nenhuma ameaça conhecida encontrada.' }];
  const ferramentas = [
    ferramenta('tarefas', 'Lista de tarefas', 'Ctrl+Alt+Del: programas em execução.', 0.5, misturar(rng, TAREFAS_NORMAIS, L('tarefas'))),
    ferramenta('inicio', 'Inicialização', 'AUTOEXEC.BAT, WIN.INI e a chave Run do registro.', 1, misturar(rng, INICIO_NORMAL, L('inicio'))),
    ferramenta('netstat', 'netstat -an', 'Conexões e portas abertas.', 0.5, [...NETSTAT_NORMAL.map((t) => ({ t })), ...L('netstat')]),
    ferramenta('arquivos', 'Arquivos recentes', 'Arquivos modificados nos últimos dias.', 1, misturar(rng, arquivosNormais, L('arquivos'))),
    ferramenta('compart', 'Compartilhamentos', 'Pastas e discos compartilhados na rede.', 0.5, [...COMPART_NORMAL.map((t) => ({ t })), ...L('compart')]),
    ferramenta('boot', 'Setor de boot', 'Inspeção com disquete de boot limpo.', 1, L('boot').length ? L('boot') : [{ t: 'Setor de boot de C: ..... padrão MS-DOS 7.0' }]),
    ferramenta('av', 'Antivírus (assinaturas)', 'Varredura com a base de vacinas atual.', 2, [...avNormal.map((t) => ({ t })), ...L('av'), ...avFim]),
    ferramenta('heur', 'Antivírus heurístico', 'Analisa comportamento, pega o que não tem vacina.', 2, [...avNormal.map((t) => ({ t })), ...L('heur')], 'malware3'),
  ];
  if (f.id === 'resgate') ferramentas.push(ferramenta('backup', 'Mídias de backup', 'Onde estão as cópias de segurança.', 0.5, L('backup')));
  const perguntas = [
    ...f.perguntas.map((p) => ({ ...p, horas: 0.5 })),
    { p: 'Desde quando está assim?', r: `Desde ${['segunda', 'terça', 'o fim de semana', 'ontem'][Math.floor(rng() * 4)]}. Antes funcionava, do jeito dele.`, horas: 0.25 },
    { p: 'Alguém mexeu na máquina?', r: 'Só o sobrinho, mas ele entende de computador.', horas: 0.25 },
  ];
  const etapas: Etapa[] = [
    escolha(rng, 'Diagnóstico', 'Com base nas evidências, a praga é um(a)', f.classe, CLASSES.filter((c) => c !== f.classe).sort(() => rng() - 0.5).slice(0, 4), f.porqueClasse, f.itemClasse),
    ...(f.extra ? f.extra(ctx) : []),
    escolha(rng, 'Impacto', 'A propriedade de segurança mais diretamente atingida neste incidente é a', f.cid, CID.filter((c) => c !== f.cid), f.porqueCid, f.itemCid),
    ordem(rng, 'Intervenção', 'Monte a intervenção: escolha as ações na ordem em que devem ser feitas (há ações que não deveriam entrar).', f.remediar, f.distratores, f.porqueOrdem, 'mal-01'),
    { ...escolha(rng, 'Causa raiz', 'No laudo, a causa raiz do incidente foi', f.causas[0], f.causas.slice(1), 'A causa raiz é o que permitiu a entrada da praga. Sem tratá-la, o problema volta.'), laudo: true, item: undefined },
    { tipo: 'ce', titulo: 'Afirmações do laudo', pergunta: 'Julgue as afirmações que vão no laudo para o cliente.', afirmacoes: f.laudo, explicacao: '', laudo: true, horasErro: 0 },
  ];
  // a etapa de ordem não deve apontar sempre para worm: usa o item da classe
  const et = etapas.find((e) => e.tipo === 'ordem');
  if (et) et.item = f.itemClasse;
  return novoCaso({
    servico: 'virus', titulo: f.nomeTitulo, chamado: sub(f.chamado, ctx), horasPrazo: 7 + ctx.dif,
    perguntas, ferramentas, evidencias: f.evidencias, causaRaiz: f.raiz, etapas,
    verificacao: { texto: 'Voltar amanhã e fazer nova varredura completa', horas: 1.5, resultado: f.verifica },
  });
}
