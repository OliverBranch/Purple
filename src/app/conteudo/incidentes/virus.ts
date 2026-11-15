// Limpeza de vírus em tempo real. A praga é sorteada entre seis famílias reais da época;
// cada uma se espalha e causa dano de um jeito, deixa pistas diferentes nas ferramentas
// e só é resolvida pela ação certa. Saber a diferença entre worm, vírus de macro,
// cavalo de Troia, keylogger, vírus de boot e ransomware é literalmente o que salva o cliente.
import { AcaoDef, Fx, Incidente, Laudo, Licao, NoInc, Regras, alcancaveis, licao, marcar, no, novoIncidente, registrar, tem } from '../../core/incidente';
import { Rng, clamp, escolher } from '../../core/rng';
import { Ctx, escritorio, opcoes, sortear } from './comum';

export type Fam = 'worm' | 'macro' | 'trojan' | 'keylogger' | 'boot' | 'ransom';

interface FamDef {
  nome: string;
  desde: number;
  definicao: string;
  prevencao: string;
  item: string;
  sintoma: string;
  titulo: string;
  entrada: { depoimento: string; opcao: string };
  assinatura: string;
  tarefas: string | null;
  netstat: string | null;
  arquivos: string | null;
  boot: string | null;
  heuristica: string;
  sintomaVisivel: boolean;
}

export const FAMILIAS: Record<Fam, FamDef> = {
  worm: {
    nome: 'Worm', desde: 1995, item: 'mal-01',
    definicao: 'Worm: propaga-se sozinho pela rede, enviando cópias de si mesmo e explorando falhas, sem precisar de um arquivo hospedeiro.',
    prevencao: 'Aplicar as correções (patches) que fecham a falha explorada na rede.',
    sintoma: 'Os micros estão lentíssimos e a luzinha do hub não para de piscar. Parece que a rede está gritando.',
    titulo: 'A rede que não para de piscar',
    entrada: { depoimento: 'O sobrinho trouxe o notebook de casa e ligou direto no hub hoje cedo, para "pegar um arquivo".', opcao: 'Notebook de fora ligado direto na rede interna' },
    assinatura: 'Verme.LAN', heuristica: 'tenta se copiar para outras máquinas pela porta 139',
    tarefas: 'VERME.EXE · 92% da CPU · iniciado há pouco', netstat: 'dezenas de conexões saindo para 192.168.0.x:139, uma atrás da outra',
    arquivos: 'cópias de LEIAME.EXE apareceram nas pastas compartilhadas', boot: null, sintomaVisivel: true,
  },
  macro: {
    nome: 'Vírus de macro', desde: 1995, item: 'mal-09',
    definicao: 'Vírus de macro: escrito na linguagem de macro de um aplicativo; infecta documentos e o modelo padrão, e se espalha quando eles são abertos.',
    prevencao: 'Desativar a execução automática de macros em documentos de origem externa.',
    sintoma: 'Todo documento que a gente salva sai com um "1" estranho e o Word insiste em salvar como modelo.',
    titulo: 'O Word possuído',
    entrada: { depoimento: 'Um fornecedor mandou a "Tabela de preços.doc" por e-mail. Abri e passei para todo mundo na pasta compartilhada.', opcao: 'Documento do Word recebido por e-mail' },
    assinatura: 'WM.Concept', heuristica: 'macro AutoOpen que se copia para o NORMAL.DOT',
    tarefas: null, netstat: null, arquivos: 'NORMAL.DOT modificado hoje às 08:12; vários .DOC alterados no mesmo minuto', boot: null, sintomaVisivel: true,
  },
  trojan: {
    nome: 'Cavalo de Troia (backdoor)', desde: 1995, item: 'mal-07',
    definicao: 'Cavalo de Troia com backdoor: disfarça-se de programa útil e abre um acesso remoto para o invasor voltar quando quiser.',
    prevencao: 'Não executar programas de origem desconhecida e manter o antivírus atualizado.',
    sintoma: 'A bandeja do CD-ROM abre sozinha e o mouse anda sem ninguém encostar. O padre já foi chamado.',
    titulo: 'O micro mal-assombrado',
    entrada: { depoimento: 'Baixei um joguinho de paciência numa BBS. Ele nem abriu direito, mas tudo bem.', opcao: 'Programa baixado de fonte desconhecida (BBS)' },
    assinatura: 'Backdoor.Orifice', heuristica: 'programa escondido aceitando conexões de fora',
    tarefas: 'PACIENCIA.EXE · sem janela · iniciado junto com o Windows', netstat: 'ESTABLISHED 200.187.4.9:31337, uma conexão vinda de fora, aberta o tempo todo',
    arquivos: 'chave Run do registro aponta para C:\\WINDOWS\\PACIENCIA.EXE', boot: null, sintomaVisivel: true,
  },
  keylogger: {
    nome: 'Keylogger', desde: 1995, item: 'mal-05',
    definicao: 'Keylogger: spyware que captura e armazena o que é digitado no teclado e envia ao atacante.',
    prevencao: 'Não abrir anexos executáveis e trocar as senhas a partir de uma máquina limpa.',
    sintoma: 'Alguém entrou na conta do banco da empresa. A senha era segredo absoluto: só estava no caderninho e no computador.',
    titulo: 'A senha que vazou sozinha',
    entrada: { depoimento: 'A moça do caixa abriu um "cartão virtual" que chegou por e-mail. Tinha um coelhinho.', opcao: 'Anexo executável disfarçado de cartão virtual' },
    assinatura: 'Spy.Teclas', heuristica: 'gancho no teclado gravando tudo o que é digitado',
    tarefas: 'KBDHOOK.DLL carregada dentro do EXPLORER.EXE', netstat: 'conexão para smtp.correio-gratis.com:25 a cada 10 minutos',
    arquivos: 'arquivo oculto C:\\WINDOWS\\TECLAS.LOG crescendo sem parar', boot: null, sintomaVisivel: false,
  },
  boot: {
    nome: 'Vírus de boot', desde: 1995, item: 'mal-02',
    definicao: 'Vírus de boot: infecta o setor de inicialização do disco e é carregado na memória antes do sistema operacional.',
    prevencao: 'Não dar boot por disquetes desconhecidos e configurar a BIOS para iniciar pelo disco rígido.',
    sintoma: 'De vez em quando um micro não liga e aparece "Missing operating system". Aí desliga, liga, e às vezes volta.',
    titulo: 'Missing operating system',
    entrada: { depoimento: 'Os disquetes de backup rodam por todas as máquinas. Um deles veio da escola do meu filho.', opcao: 'Disquete contaminado esquecido no drive na hora do boot' },
    assinatura: 'Boot.Stoned', heuristica: 'código residente instalado antes do DOS',
    tarefas: null, netstat: null, arquivos: null, boot: 'setor de inicialização alterado: código desconhecido roda antes do DOS', sintomaVisivel: true,
  },
  ransom: {
    nome: 'Ransomware', desde: 1995, item: 'mal-04',
    definicao: 'Ransomware: torna os dados inacessíveis, em geral cifrando os arquivos, e exige um resgate para devolvê-los.',
    prevencao: 'Manter backup periódico e guardado fora da máquina (offline).',
    sintoma: 'Os arquivos viraram nomes esquisitos e apareceu uma mensagem pedindo dinheiro para uma caixa postal no Panamá.',
    titulo: 'Arquivos sequestrados',
    entrada: { depoimento: 'Chegou pelo correio um disquete "Informações sobre AIDS". Instalei para ler, ué.', opcao: 'Disquete com programa "informativo" recebido pelo correio' },
    assinatura: 'Ransom.AIDS', heuristica: 'programa cifrando arquivos em sequência',
    tarefas: 'AIDSINFO.EXE gravando no disco sem parar', netstat: null,
    arquivos: 'CARTA.DOC → CARTA.DOC.AIDS, CAIXA.XLS → CAIXA.XLS.AIDS, e a lista cresce', boot: null, sintomaVisivel: true,
  },
};

export const ACOES_VIRUS: AcaoDef[] = [
  // ferramentas
  { id: 'conversar', nome: 'Conversar com o cliente', desc: 'Perguntar o que aconteceu antes de tudo começar.', horas: 0.4, alvo: null, tipo: 'ferramenta', icone: 'fala' },
  { id: 'tarefas', nome: 'Lista de tarefas', desc: 'Ctrl+Alt+Del: o que está rodando na máquina.', horas: 0.3, alvo: ['pc', 'servidor'], tipo: 'ferramenta', icone: 'lista' },
  { id: 'netstat', nome: 'netstat -an', desc: 'Conexões e portas abertas agora.', horas: 0.3, alvo: ['pc', 'servidor'], tipo: 'ferramenta', icone: 'rede' },
  { id: 'arquivos', nome: 'Arquivos e registro', desc: 'O que mudou no disco e no registro hoje.', horas: 0.4, alvo: ['pc', 'servidor'], tipo: 'ferramenta', icone: 'pasta' },
  { id: 'setorboot', nome: 'Setor de boot', desc: 'Inspecionar a inicialização com disquete de boot limpo.', horas: 0.6, alvo: ['pc', 'servidor'], tipo: 'ferramenta', icone: 'disquete' },
  { id: 'av', nome: 'Antivírus (assinaturas)', desc: 'Varre a máquina com a base de vacinas atual.', horas: 0.4, alvo: ['pc', 'servidor'], tipo: 'ferramenta', icone: 'escudo' },
  { id: 'heur', nome: 'Antivírus heurístico', desc: 'Analisa comportamento: pega até praga sem vacina.', horas: 0.4, alvo: ['pc', 'servidor'], tipo: 'ferramenta', requer: 'ferr:heur', icone: 'lupa' },
  { id: 'sniffer', nome: 'Analisador de pacotes', desc: 'Escuta o hub e mostra quem está falando demais.', horas: 0.8, alvo: null, tipo: 'ferramenta', requer: 'ferr:sniffer', icone: 'onda' },
  { id: 'varredura', nome: 'Varredura final em tudo', desc: 'Passa o antivírus em todas as máquinas. Demora, mas confirma o serviço.', horas: 2, alvo: null, tipo: 'ferramenta', icone: 'radar' },
  // ações
  { id: 'isolar', nome: 'Tirar o cabo de rede', desc: 'Isola a máquina: nada entra nem sai pela rede. O funcionário fica parado.', horas: 0.15, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'cabo' },
  { id: 'reconectar', nome: 'Religar o cabo', desc: 'Devolve a máquina para a rede.', horas: 0.15, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'cabo' },
  { id: 'desligar', nome: 'Desligar da tomada', desc: 'Para tudo o que roda na máquina, inclusive a praga.', horas: 0.1, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'energia' },
  { id: 'ligar', nome: 'Ligar a máquina', desc: 'Liga de novo.', horas: 0.1, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'energia' },
  { id: 'limpar_av', nome: 'Remover com antivírus', desc: 'Deixa o antivírus apagar o que ele reconhece.', horas: 0.8, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'escudo' },
  { id: 'limpar_manual', nome: 'Remoção manual', desc: 'Matar o processo, apagar o executável e limpar a chave Run.', horas: 1, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'chave' },
  { id: 'macro', nome: 'Limpar NORMAL.DOT e travar macros', desc: 'Recria o modelo do Word e desativa macros automáticas.', horas: 0.6, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'doc' },
  { id: 'mbr', nome: 'Boot limpo + FDISK /MBR', desc: 'Inicia por disquete protegido e reescreve o setor de boot.', horas: 0.9, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'disquete' },
  { id: 'patch', nome: 'Aplicar correções', desc: 'Instala as atualizações do sistema que fecham falhas conhecidas.', horas: 0.5, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'remendo' },
  { id: 'backup', nome: 'Restaurar da fita', desc: 'Devolve os arquivos a partir do último backup.', horas: 1.5, alvo: ['pc', 'servidor'], tipo: 'acao', icone: 'fita' },
  { id: 'hub_off', nome: 'Desligar o hub', desc: 'Derruba a rede inteira de uma vez. Nada se espalha, mas ninguém trabalha.', horas: 0.1, alvo: ['hub'], tipo: 'acao', icone: 'energia' },
  { id: 'hub_on', nome: 'Religar o hub', desc: 'A rede volta para todo mundo.', horas: 0.1, alvo: ['hub'], tipo: 'acao', icone: 'energia' },
  { id: 'bloquear', nome: 'Desligar o modem', desc: 'Corta a Internet do escritório inteiro.', horas: 0.1, alvo: ['modem'], tipo: 'acao', icone: 'energia' },
  { id: 'religar_modem', nome: 'Religar o modem', desc: 'Volta a Internet.', horas: 0.1, alvo: ['modem'], tipo: 'acao', icone: 'energia' },
  { id: 'senhas', nome: 'Trocar todas as senhas', desc: 'Banco, e-mail e rede, digitadas de uma máquina limpa.', horas: 0.8, alvo: null, tipo: 'acao', icone: 'chave' },
  { id: 'disquetes', nome: 'Recolher os disquetes', desc: 'Junta todos os disquetes do escritório e proíbe boot por eles.', horas: 0.4, alvo: null, tipo: 'acao', icone: 'disquete' },
  { id: 'resgate', nome: 'Pagar o resgate', desc: 'Mandar o dinheiro para a caixa postal do Panamá.', horas: 0.1, alvo: null, tipo: 'acao', icone: 'dinheiro' },
];

const HOSTS = (inc: Incidente) => inc.nos.filter((n) => n.tipo === 'pc' || n.tipo === 'servidor');
const fam = (inc: Incidente): Fam => inc.d['fam'] as Fam;
const F = (inc: Incidente): FamDef => FAMILIAS[fam(inc)];
const ativo = (n: NoInc) => !tem(n, 'desligado');
const naRede = (n: NoInc) => ativo(n) && !tem(n, 'isolado');

function infectar(inc: Incidente, n: NoInc, fx: Fx, silencioso = false): void {
  if (n.infec > 0) return;
  n.infec = 0.01;
  marcar(n, 'limpo', false);
  if (!(inc.d['infectados'] as string[]).includes(n.id)) (inc.d['infectados'] as string[]).push(n.id);
  n.visto = false;
  if (!silencioso) {
    marcar(n, 'suspeito');
    fx.efeito('infecta', n.id);
  }
}

function limpar(inc: Incidente, n: NoInc, fx: Fx, como: string): void {
  n.infec = 0;
  n.visto = true;
  marcar(n, 'limpo');
  marcar(n, 'suspeito', false);
  inc.d['carga'][n.id] = 0;
  registrar(inc, `${n.nome}: ${como}`, 'ok', n.id);
  fx.efeito('limpa', n.id);
}

export function gerarVirus(c: Ctx, forcar?: Fam): Incidente {
  const { rng, dif } = c;
  const disp = (Object.keys(FAMILIAS) as Fam[]).filter((f) => FAMILIAS[f].desde <= c.ano);
  const f = forcar ?? escolher(rng, disp);
  const def = FAMILIAS[f];
  const nPcs = dif === 1 ? 3 + Math.floor(rng() * 2) : dif === 2 ? 5 : 6 + Math.floor(rng() * 2);
  const comServidor = dif >= 2 || f === 'ransom' || f === 'macro';
  const backup = f === 'ransom' ? escolher(rng, dif === 1 ? ['bom', 'bom', 'velho'] : ['bom', 'velho', 'nenhum']) : escolher(rng, ['bom', 'velho', 'nenhum']);
  const p = escritorio(c, nPcs, { servidor: comServidor, fita: backup !== 'nenhum', impressora: rng() < 0.5 });
  const variante = rng() < (dif === 1 ? 0.15 : dif === 2 ? 0.35 : 0.55);
  const inc = novoIncidente({
    modo: 'virus', titulo: def.titulo, chamado: `${c.cliente.contato}: "${def.sintoma}"`, contato: c.cliente.contato, dif, ano: c.ano,
    topicos: ['malware', 'cia'], nos: p.nos, links: p.links, limite: ([7, 9, 11][dif - 1] as number) + (f === 'worm' ? 2 : f === 'macro' || f === 'boot' ? 1 : 0),
    d: { fam: f, variante, backup, infectados: [], carga: {}, depo: 0, senhas: false, disquetes: false, varreu: false, pagou: false, evento: null, vazou: 0 },
  });
  const zero = f === 'keylogger' ? escolher(rng, p.pcs.slice(1)) : (p.pcs[0] as NoInc);
  infectar(inc, zero, { efeito: () => undefined }, true);
  zero.infec = 0.25;
  zero.visto = def.sintomaVisivel;
  // a praga já andou antes de você chegar
  const extras = f === 'worm' || f === 'macro' || f === 'boot' ? dif - 1 : f === 'keylogger' && dif === 3 ? 1 : 0;
  for (const alvo of sortear(rng, p.pcs.filter((x) => x !== zero), extras)) {
    infectar(inc, alvo, { efeito: () => undefined }, true);
    alvo.infec = 0.1;
  }
  inc.perguntasEm = dif === 1 ? [inc.limite * 0.45] : [inc.limite * 0.3, inc.limite * 0.68];
  registrar(inc, `Você chegou ao escritório de ${c.cliente.nome}. ${zero.visto ? `O problema começou no ${zero.nome}.` : 'Ninguém sabe dizer em qual máquina está o problema.'}`, 'sistema');
  if (variante) inc.d['dicaVariante'] = true;
  return inc;
}

const pistaNo = (inc: Incidente, n: NoInc, campo: 'tarefas' | 'netstat' | 'arquivos' | 'boot'): string | null => (n.infec > 0 ? F(inc)[campo] : null);

const LIMPO: Record<string, string> = {
  tarefas: 'nada fora do comum: EXPLORER, WINWORD e o protetor de tela de peixinhos.',
  netstat: 'nenhuma conexão estranha; só o compartilhamento de arquivos de sempre.',
  arquivos: 'nada mudou hoje além da planilha do caixa.',
  setorboot: 'setor de inicialização original.',
};

export const REGRAS_VIRUS: Regras = {
  acoes: ACOES_VIRUS,

  disponivel(inc, a, n) {
    const f = fam(inc);
    if (a.id === 'reconectar' && !tem(n, 'isolado')) return 'Já está na rede.';
    if (a.id === 'isolar' && tem(n, 'isolado')) return 'Já está sem cabo.';
    if (a.id === 'ligar' && !tem(n, 'desligado')) return 'Já está ligada.';
    if (a.id === 'desligar' && tem(n, 'desligado')) return 'Já está desligada.';
    if (a.id === 'bloquear' && tem(n, 'desligado')) return 'O modem já está desligado.';
    if (a.id === 'hub_off' && tem(n, 'desligado')) return 'Já está desligado.';
    if (a.id === 'hub_on' && !tem(n, 'desligado')) return 'Já está ligado.';
    if (a.id === 'religar_modem' && !tem(n, 'desligado')) return 'O modem está ligado.';
    if (n && ['tarefas', 'netstat', 'av', 'heur', 'arquivos'].includes(a.id) && tem(n, 'desligado')) return 'A máquina está desligada.';
    if (a.id === 'backup') {
      if (inc.d['backup'] === 'nenhum') return 'Este cliente não tem backup.';
      if (!tem(n, 'cifrado') && !tem(n, 'nao-liga')) return 'Os arquivos desta máquina estão intactos.';
    }
    if (a.id === 'resgate' && (f !== 'ransom' || !inc.nos.some((x) => tem(x, 'cifrado')) || inc.d['pagou'])) return 'Não há resgate a pagar.';
    if (a.id === 'conversar' && inc.d['depo'] >= 3) return 'O cliente já contou tudo o que sabe.';
    return true;
  },

  tick(inc, dh, rng, fx) {
    const f = fam(inc);
    const carga = inc.d['carga'] as Record<string, number>;
    const internet = no(inc, 'internet');
    if (tem(no(inc, 'hub'), 'desligado')) {
      inc.paciencia = clamp(inc.paciencia - dh * 2.2, 0, 100);
      inc.prejuizo += dh * 0.4;
    }
    for (const n of HOSTS(inc)) {
      if (n.infec <= 0) continue;
      if (!ativo(n)) continue;
      n.infec = clamp(n.infec + dh * ({ worm: 0.11, macro: 0.07, trojan: 0.05, keylogger: 0.05, boot: 0.06, ransom: 0.13 }[f]), 0, 1);
      // dano ao cliente
      if (f === 'worm') inc.prejuizo += dh * 0.9;
      if (f === 'macro') inc.prejuizo += dh * 0.55;
      if (f === 'boot') inc.prejuizo += dh * 0.5;
      if ((f === 'trojan' || f === 'keylogger') && internet && naRede(n) && alcancaveis(inc, n.id).includes('internet')) {
        inc.prejuizo += dh * (f === 'trojan' ? 3 : 2.4);
        inc.d['vazou'] += dh;
      }
      if (f === 'ransom' && !tem(n, 'cifrado')) {
        inc.prejuizo += dh * 0.8;
        if (n.infec >= 1) {
          marcar(n, 'cifrado');
          n.visto = true;
          inc.prejuizo += 10;
          registrar(inc, `${n.nome}: todos os arquivos foram cifrados. Sobrou só o bilhete do resgate.`, 'alerta', n.id);
          fx.efeito('quebra', n.id);
        }
      }
      // sintomas que entregam a máquina
      if (!n.visto && F(inc).sintomaVisivel && n.infec > 0.4) {
        n.visto = true;
        const queixa = { worm: 'o meu também ficou uma carroça!', macro: 'meu documento saiu com aquele "1" esquisito!', boot: 'o meu deu "Missing operating system"!', ransom: 'meus arquivos estão com nomes estranhos!', trojan: 'o meu CD-ROM abriu sozinho agora!', keylogger: '' }[f];
        registrar(inc, `${n.dono ?? 'Alguém'}: "${queixa}"`, 'cliente', n.id);
        fx.efeito('alerta', n.id);
      }
      if (f === 'boot' && n.infec > 0.7 && !tem(n, 'nao-liga')) {
        marcar(n, 'nao-liga');
        inc.prejuizo += 4;
      }
      // propagação
      if (f === 'worm' || f === 'macro' || (f === 'ransom' && n.tipo === 'pc')) {
        if (!naRede(n)) continue;
        carga[n.id] = (carga[n.id] ?? 0) + dh * (f === 'worm' ? 0.5 : f === 'macro' ? 0.32 : 0.3);
        if ((carga[n.id] as number) < 1) continue;
        carga[n.id] = 0;
        const viz = alcancaveis(inc, n.id).map((id) => no(inc, id)!).filter((x) => (x.tipo === 'pc' || x.tipo === 'servidor') && x.infec <= 0);
        const alvos = viz.filter((x) => (f === 'worm' ? !tem(x, 'imune') : f === 'macro' ? !tem(x, 'macros-off') : x.tipo === 'servidor'));
        if (!alvos.length) continue;
        const alvo = escolher(rng, alvos);
        infectar(inc, alvo, fx);
        fx.efeito('pacote', n.id, alvo.id);
      }
    }
    // vírus de boot: os disquetes circulam
    if (f === 'boot' && !inc.d['disquetes']) {
      const ev = inc.d['evento'] as { de: string; para: string; em: number } | null;
      if (ev && inc.hora >= ev.em) {
        const alvo = no(inc, ev.para);
        if (alvo && alvo.infec <= 0) infectar(inc, alvo, fx);
        inc.d['evento'] = null;
      } else if (!ev) {
        carga['_disq'] = (carga['_disq'] ?? 0) + dh * 0.45;
        if ((carga['_disq'] as number) >= 1) {
          carga['_disq'] = 0;
          const fontes = HOSTS(inc).filter((x) => x.infec > 0);
          const alvos = HOSTS(inc).filter((x) => x.infec <= 0);
          if (fontes.length && alvos.length) {
            const de = escolher(rng, fontes);
            const para = escolher(rng, alvos);
            inc.d['evento'] = { de: de.id, para: para.id, em: inc.hora + 0.9 };
            registrar(inc, `${para.dono ?? 'Alguém'} pegou um disquete no ${de.nome} e vai dar boot com ele no próprio micro daqui a pouco.`, 'cliente', para.id);
          }
        }
      }
    }
  },

  executar(inc, a, n, rng, fx) {
    const f = fam(inc);
    const def = F(inc);
    const desperdicio = (porque: string, item?: string) => {
      inc.paciencia = clamp(inc.paciencia - 4, 0, 100);
      registrar(inc, porque, 'erro', n?.id);
      fx.efeito('erra', n?.id);
      licao(inc, false, `${a.nome} não resolveu`, porque, item);
    };
    const ok = (porque: string, titulo: string, item?: string) => {
      inc.paciencia = clamp(inc.paciencia + 3, 0, 100);
      licao(inc, true, titulo, porque, item);
      fx.efeito('acerta', n?.id);
    };
    switch (a.id) {
      case 'conversar': {
        const k = inc.d['depo'] as number;
        inc.d['depo'] = k + 1;
        const falas = [
          `${inc.contato}: "${def.entrada.depoimento}"`,
          `${inc.contato}: "${inc.d['backup'] === 'nenhum' ? 'Backup? A gente ia começar a fazer mês que vem.' : inc.d['backup'] === 'velho' ? 'Tem uma fita de backup, mas acho que a última é de uns três meses atrás.' : 'Toda sexta a contadora grava uma fita e leva para casa.'}"`,
          `${inc.contato}: "${f === 'keylogger' ? 'O pessoal do caixa é quem mais mexe no banco pelo computador.' : f === 'boot' ? 'Ah, e todo mundo empresta disquete para todo mundo.' : 'Mais nada de diferente. Só o café que acabou.'}"`,
        ];
        registrar(inc, falas[k] ?? 'Nada a acrescentar.', 'cliente');
        break;
      }
      case 'tarefas': case 'netstat': case 'arquivos': case 'setorboot': {
        if (!n) break;
        const campo = a.id === 'setorboot' ? 'boot' : a.id;
        const p = pistaNo(inc, n, campo as 'tarefas');
        if (p) {
          n.visto = true;
          registrar(inc, `${n.nome} › ${p}`, 'pista', n.id);
          fx.efeito('alerta', n.id);
        } else {
          if (n.infec <= 0) n.visto = true;
          registrar(inc, `${n.nome} › ${LIMPO[a.id]}`, 'info', n.id);
        }
        break;
      }
      case 'av': {
        if (!n) break;
        if (n.infec > 0 && !inc.d['variante']) {
          n.visto = true;
          registrar(inc, `${n.nome} › antivírus: encontrado ${def.assinatura}.`, 'pista', n.id);
          fx.efeito('alerta', n.id);
        } else {
          registrar(inc, `${n.nome} › antivírus: nenhum vírus encontrado. (Base de vacinas de dois meses atrás.)`, 'info', n.id);
          if (n.infec > 0 && inc.d['variante']) inc.d['avEnganado'] = true;
        }
        break;
      }
      case 'heur': {
        if (!n) break;
        n.visto = true;
        if (n.infec > 0) {
          registrar(inc, `${n.nome} › heurística: ${def.heuristica}.`, 'pista', n.id);
          fx.efeito('alerta', n.id);
        } else registrar(inc, `${n.nome} › heurística: comportamento normal.`, 'info', n.id);
        break;
      }
      case 'sniffer': {
        const falantes = HOSTS(inc).filter((x) => x.infec > 0 && naRede(x) && (f === 'worm' || f === 'trojan' || f === 'keylogger'));
        falantes.forEach((x) => { x.visto = true; fx.efeito('alerta', x.id); });
        registrar(inc, falantes.length ? `Analisador: tráfego anormal saindo de ${falantes.map((x) => x.nome).join(', ')}.` : 'Analisador: o tráfego da rede parece normal.', falantes.length ? 'pista' : 'info');
        break;
      }
      case 'varredura': {
        const achados: string[] = [];
        for (const x of HOSTS(inc)) {
          if (x.infec > 0 && (!inc.d['variante'] || inc.d['temHeur'])) {
            x.visto = true;
            achados.push(x.nome);
            fx.efeito('alerta', x.id);
          } else if (x.infec <= 0) x.visto = true;
        }
        inc.d['varreu'] = achados.length === 0 && HOSTS(inc).every((x) => x.infec <= 0) ? inc.hora : 0;
        if (achados.length) registrar(inc, `Varredura: ainda tem praga em ${achados.join(', ')}.`, 'alerta');
        else if (HOSTS(inc).some((x) => x.infec > 0)) registrar(inc, 'Varredura: nada encontrado. (Mas a base de assinaturas é antiga...)', 'info');
        else { registrar(inc, 'Varredura: todas as máquinas limpas. Serviço confirmado.', 'ok'); fx.efeito('conclui'); }
        if (!achados.length && HOSTS(inc).some((x) => x.infec > 0)) inc.d['varreu'] = 0;
        break;
      }
      case 'isolar':
        if (!n) break;
        marcar(n, 'isolado');
        inc.paciencia = clamp(inc.paciencia - 1.5, 0, 100);
        registrar(inc, `${n.nome} desconectado da rede.${n.dono ? ` ${n.dono} cruzou os braços.` : ''}`, 'info', n.id);
        fx.efeito('bloqueia', n.id);
        if (n.infec > 0 && n.visto && (f === 'worm' || f === 'macro' || f === 'trojan' || f === 'keylogger' || f === 'ransom')) ok('Isolar a máquina contaminada impede que a praga use a rede para se espalhar ou mandar dados para fora.', 'Contenção: isolou a máquina contaminada', f === 'worm' ? 'mal-01' : undefined);
        break;
      case 'reconectar':
        if (!n) break;
        marcar(n, 'isolado', false);
        registrar(inc, `${n.nome} de volta à rede.`, 'info', n.id);
        break;
      case 'desligar':
        if (!n) break;
        marcar(n, 'desligado');
        inc.paciencia = clamp(inc.paciencia - 1, 0, 100);
        registrar(inc, `${n.nome} desligado.`, 'info', n.id);
        fx.efeito('bloqueia', n.id);
        if (f === 'ransom' && n.infec > 0 && !tem(n, 'cifrado')) ok('Desligar a máquina interrompe a cifragem no meio: o que ainda não foi cifrado está salvo.', 'Desligou a máquina que estava cifrando', 'mal-04');
        break;
      case 'ligar':
        if (!n) break;
        marcar(n, 'desligado', false);
        registrar(inc, `${n.nome} ligado.`, 'info', n.id);
        break;
      case 'limpar_av': {
        if (!n) break;
        if (n.infec <= 0) { desperdicio(`${n.nome}: o antivírus não encontrou nada para remover. Esta máquina estava limpa.`); break; }
        if (inc.d['variante']) { desperdicio(`${n.nome}: o antivírus não reconhece esta variante. Praga nova não tem vacina na base de assinaturas.`, 'mal-10'); n.visto = true; break; }
        if (f === 'boot') { desperdicio(`${n.nome}: o vírus está residente na memória e reinfecta o disco na hora. Vírus de boot se remove dando boot por um disquete limpo.`, 'mal-02'); n.visto = true; break; }
        limpar(inc, n, fx, `antivírus removeu ${def.assinatura}.`);
        if (f === 'ransom' && tem(n, 'cifrado')) registrar(inc, `${n.nome}: a praga saiu, mas os arquivos continuam cifrados.`, 'alerta', n.id);
        ok('O antivírus remove o que já está na base de assinaturas.', 'Removeu a praga com o antivírus');
        break;
      }
      case 'limpar_manual': {
        if (!n) break;
        if (n.infec <= 0) { desperdicio(`${n.nome}: você vasculhou tudo e não havia nada para remover.`); break; }
        if (f === 'macro') { desperdicio(`${n.nome}: não há processo nem executável. O vírus de macro mora dentro dos documentos e do NORMAL.DOT.`, 'mal-09'); n.visto = true; break; }
        if (f === 'boot') { desperdicio(`${n.nome}: nenhum arquivo suspeito. O vírus de boot está no setor de inicialização, fora do sistema de arquivos.`, 'mal-02'); n.visto = true; break; }
        limpar(inc, n, fx, 'processo encerrado, executável apagado e chave Run limpa.');
        ok('Matar o processo e apagar o executável e a entrada de inicialização remove pragas que rodam como programa.', 'Removeu a praga manualmente', def.item);
        break;
      }
      case 'macro': {
        if (!n) break;
        marcar(n, 'macros-off');
        if (f !== 'macro') { if (n.infec > 0) desperdicio(`${n.nome}: o NORMAL.DOT estava limpo. A praga não é de macro.`, 'mal-09'); else registrar(inc, `${n.nome}: macros automáticas desativadas por precaução.`, 'info', n.id); break; }
        if (n.infec > 0) { limpar(inc, n, fx, 'NORMAL.DOT recriado e macros automáticas travadas.'); ok('Vírus de macro vive no modelo padrão e nos documentos; travar macros automáticas impede a reinfecção.', 'Tratou o vírus de macro', 'mal-09'); }
        else registrar(inc, `${n.nome}: macros travadas. Esta máquina não pega mais o vírus pelos documentos.`, 'ok', n.id);
        break;
      }
      case 'mbr': {
        if (!n) break;
        if (f !== 'boot') { if (n.infec > 0) desperdicio(`${n.nome}: o setor de boot estava íntegro. A praga está em outro lugar.`, 'mal-02'); else registrar(inc, `${n.nome}: setor de boot já estava limpo.`, 'info', n.id); break; }
        if (n.infec > 0) { limpar(inc, n, fx, 'setor de boot reescrito. Ligou normalmente.'); marcar(n, 'nao-liga', false); ok('Boot por disquete limpo e protegido contra gravação, e o setor de inicialização reescrito: é assim que se remove vírus de boot.', 'Removeu o vírus de boot', 'mal-02'); }
        else { registrar(inc, `${n.nome}: setor de boot já estava limpo.`, 'info', n.id); inc.paciencia -= 2; }
        break;
      }
      case 'patch': {
        if (!n) break;
        marcar(n, 'imune');
        registrar(inc, `${n.nome}: correções aplicadas.`, 'ok', n.id);
        if (f === 'worm') ok('O worm entra explorando uma falha. Corrigida a falha, a máquina não é reinfectada.', 'Fechou a falha que o worm explora', 'mal-01');
        break;
      }
      case 'backup': {
        if (!n) break;
        if (n.infec > 0 && ativo(n)) { desperdicio(`${n.nome}: você restaurou com a praga ainda ativa, e ela cifrou tudo de novo. Primeiro remova, depois restaure.`, 'mal-04'); n.infec = 0.6; marcar(n, 'cifrado', false); break; }
        marcar(n, 'cifrado', false);
        marcar(n, 'nao-liga', false);
        const velho = inc.d['backup'] === 'velho';
        if (velho) inc.prejuizo += 5;
        registrar(inc, `${n.nome}: arquivos restaurados da fita${velho ? ', mas o backup era de três meses atrás' : ''}.`, 'ok', n.id);
        ok('Backup guardado fora da máquina é o que salva de um ransomware: remove-se a praga e restauram-se os dados.', 'Recuperou os dados pelo backup', 'cia-06');
        fx.efeito('limpa', n.id);
        break;
      }
      case 'bloquear':
        if (!n) break;
        marcar(n, 'desligado');
        inc.paciencia = clamp(inc.paciencia - 3, 0, 100);
        registrar(inc, 'Modem desligado. O escritório inteiro ficou sem Internet.', 'info', n.id);
        fx.efeito('bloqueia', n.id);
        if ((f === 'trojan' || f === 'keylogger') && HOSTS(inc).some((x) => x.infec > 0)) ok('Cortar a saída para a Internet interrompe o canal que a praga usa para falar com o atacante.', 'Cortou o canal com o atacante', f === 'trojan' ? 'mal-08' : 'mal-05');
        break;
      case 'hub_off':
        if (!n) break;
        marcar(n, 'desligado');
        inc.paciencia = clamp(inc.paciencia - 4, 0, 100);
        registrar(inc, 'Hub desligado. O escritório inteiro ficou sem rede; um coro de "ué?" ecoa pela sala.', 'info', n.id);
        fx.efeito('bloqueia', n.id);
        if (f === 'worm' || f === 'macro') ok('Num surto que se espalha pela rede, derrubar o segmento inteiro contém tudo de uma vez, enquanto você limpa máquina por máquina.', 'Conteve o surto derrubando a rede', f === 'worm' ? 'mal-01' : undefined);
        break;
      case 'hub_on':
        if (!n) break;
        marcar(n, 'desligado', false);
        registrar(inc, 'Hub religado. A rede voltou.', 'info', n.id);
        if (f === 'worm' && HOSTS(inc).some((x) => x.infec > 0 && !tem(x, 'isolado') && !tem(x, 'desligado'))) registrar(inc, 'Cuidado: ainda tem máquina contaminada ligada na rede.', 'alerta', n.id);
        break;
      case 'religar_modem':
        if (!n) break;
        marcar(n, 'desligado', false);
        registrar(inc, 'Modem religado. Barulhinho de discagem.', 'info', n.id);
        break;
      case 'senhas': {
        const keyAtivo = HOSTS(inc).some((x) => x.infec > 0 && ativo(x));
        if (f === 'keylogger' && keyAtivo) {
          desperdicio('Você trocou as senhas, mas ainda há keylogger ativo: as senhas novas foram capturadas também. Primeiro limpe, depois troque.', 'mal-05');
          break;
        }
        inc.d['senhas'] = true;
        registrar(inc, 'Senhas do banco, do e-mail e da rede trocadas a partir de uma máquina limpa.', 'ok');
        if (f === 'keylogger' || f === 'trojan') ok('As senhas que passaram pela máquina comprometida devem ser consideradas vazadas; troca-se tudo de um equipamento limpo.', 'Trocou as senhas comprometidas', f === 'keylogger' ? 'mal-05' : 'mal-07');
        break;
      }
      case 'disquetes':
        inc.d['disquetes'] = true;
        inc.d['evento'] = null;
        registrar(inc, 'Disquetes recolhidos numa caixa de sapato. Boot pelo disco rígido configurado na BIOS.', 'ok');
        if (f === 'boot') ok('Vírus de boot passa de máquina em máquina pelo disquete esquecido no drive na hora de ligar.', 'Cortou o contágio por disquete', 'mal-02');
        break;
      case 'resgate':
        inc.d['pagou'] = true;
        inc.prejuizo += 12;
        inc.paciencia = clamp(inc.paciencia - 10, 0, 100);
        registrar(inc, 'O dinheiro foi para o Panamá. A chave nunca chegou.', 'erro');
        licao(inc, false, 'Pagou o resgate', 'Pagar não garante a devolução dos dados e financia o crime. A defesa contra ransomware é backup offline e testado.', 'mal-04');
        fx.efeito('erra');
        break;
    }
    void rng;
  },

  objetivos(inc) {
    const f = fam(inc);
    const hosts = HOSTS(inc);
    const infectados = hosts.filter((x) => x.infec > 0);
    const hubOff = tem(no(inc, 'hub'), 'desligado') && f !== 'boot' && f !== 'trojan' && f !== 'keylogger';
    const contido = (hubOff || infectados.every((x) => tem(x, 'desligado') || (tem(x, 'isolado') && f !== 'boot'))) && (f !== 'boot' || !!inc.d['disquetes']);
    const ever = (inc.d['infectados'] as string[]).map((id) => no(inc, id)!).filter(Boolean);
    const rem = remediado(inc, ever);
    inc.obj = [
      { id: 'conter', txt: 'Conter a praga (ela para de avançar)', feito: contido },
      { id: 'erradicar', txt: 'Erradicar e confirmar com a varredura final', feito: infectados.length === 0 && !!inc.d['varreu'] },
      { id: 'causa', txt: 'Tratar a causa e o estrago (depende da praga)', feito: rem && (f !== 'ransom' || infectados.length === 0) && (f !== 'worm' || infectados.length === 0) },
    ];
  },

  resolucao(inc) {
    const hosts = HOSTS(inc);
    const ever = (inc.d['infectados'] as string[]).map((id) => no(inc, id)!).filter(Boolean);
    const limpos = ever.length ? ever.filter((x) => x.infec <= 0).length / ever.length : 1;
    const tudo = hosts.every((x) => x.infec <= 0) ? 1 : 0;
    return 0.35 * limpos + 0.25 * tudo + 0.4 * (remediado(inc, ever) ? 1 : 0);
  },

  balanco(inc) {
    const f = fam(inc);
    const def = F(inc);
    const out: Licao[] = [];
    const sobrou = HOSTS(inc).filter((x) => x.infec > 0);
    if (sobrou.length) out.push({ ok: false, titulo: `Ficou praga em ${sobrou.length === 1 ? sobrou[0]!.nome : sobrou.length + ' máquinas'}`, porque: inc.d['varreu'] ? 'A praga escapou da varredura por assinatura. Variante nova pede heurística.' : 'Sem a varredura final você não tinha como saber. O cliente vai ligar de volta.', item: inc.d['variante'] ? 'mal-10' : def.item });
    const ever = (inc.d['infectados'] as string[]).map((id) => no(inc, id)!).filter(Boolean);
    if (!remediado(inc, ever)) {
      const porque: Record<Fam, string> = {
        worm: 'Sem as correções, as máquinas limpas voltam a ser infectadas pela mesma falha.',
        macro: 'Sem travar as macros automáticas, o próximo documento infectado recomeça tudo.',
        trojan: 'O invasor teve acesso remoto: as senhas usadas naquela máquina devem ser trocadas.',
        keylogger: 'Tudo o que foi digitado vazou. Faltou trocar as senhas, a partir de uma máquina limpa.',
        boot: 'Os disquetes contaminados continuam circulando. Faltou recolhê-los e travar o boot por disquete.',
        ransom: inc.d['backup'] === 'nenhum' ? 'Sem backup, os arquivos cifrados estão perdidos. A lição para o cliente é backup periódico e offline.' : 'Faltou restaurar os arquivos cifrados a partir da fita.',
      };
      out.push({ ok: false, titulo: 'A causa não foi tratada', porque: porque[f], item: f === 'ransom' ? 'cia-06' : def.item });
    }
    if (inc.d['avEnganado']) out.push({ ok: false, titulo: 'O antivírus disse que estava limpo', porque: 'Antivírus por assinatura só reconhece o que já está na base. Variante nova passa batido; heurística olha o comportamento.', item: 'mal-10' });
    return out;
  },

  laudo(inc, rng) {
    const f = fam(inc);
    const def = F(inc);
    const todas = Object.values(FAMILIAS);
    const q1 = opcoes(rng, def.definicao, todas.map((x) => x.definicao), 5);
    const q2 = opcoes(rng, def.entrada.opcao, todas.map((x) => x.entrada.opcao), 4);
    const q3 = opcoes(rng, def.prevencao, todas.map((x) => x.prevencao), 4);
    const out: Laudo[] = [
      { enunciado: 'Classifique a praga encontrada.', ...q1, item: def.item, porque: def.definicao },
      { enunciado: 'Por onde ela entrou?', ...q2, porque: `${def.entrada.depoimento} Conversar com o cliente costuma revelar a porta de entrada.` },
      { enunciado: 'Que recomendação evita a próxima?', ...q3, item: f === 'ransom' ? 'cia-06' : def.item, porque: def.prevencao },
    ];
    return out;
  },
};

function remediado(inc: Incidente, ever: NoInc[]): boolean {
  switch (fam(inc)) {
    case 'worm': return ever.every((x) => tem(x, 'imune'));
    case 'macro': return ever.every((x) => tem(x, 'macros-off'));
    case 'trojan': case 'keylogger': return !!inc.d['senhas'];
    case 'boot': return !!inc.d['disquetes'];
    case 'ransom': return inc.d['backup'] !== 'nenhum' && !inc.nos.some((x) => tem(x, 'cifrado'));
  }
}
