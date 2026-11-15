// Blindagem de servidor Unix: serviços, contas, acesso remoto, força bruta e princípios.
import { Etapa } from '../../core/caso';
import { Ctx, embaralhar, escolha, ferramenta, novoCaso, sub } from './comum';

interface Servico { porta: number; nome: string; desc: string }
const TODOS: Servico[] = [
  { porta: 21, nome: 'ftp', desc: 'FTP' }, { porta: 23, nome: 'telnet', desc: 'Telnet' }, { porta: 25, nome: 'smtp', desc: 'SMTP (sendmail)' },
  { porta: 79, nome: 'finger', desc: 'Finger' }, { porta: 80, nome: 'http', desc: 'HTTP (site)' }, { porta: 111, nome: 'sunrpc', desc: 'Portmapper (RPC)' },
  { porta: 512, nome: 'exec', desc: 'rexec' }, { porta: 513, nome: 'login', desc: 'rlogin' }, { porta: 6000, nome: 'x11', desc: 'X11' },
];

export function gerarServidor(ctx: Ctx) {
  const { rng } = ctx;
  const ssh = ctx.ano >= 1996;
  const abertos = TODOS.filter((s) => [21, 23, 25, 80].includes(s.porta) || rng() < 0.55);
  const precisaFtp = rng() < 0.5;
  const precisaMail = rng() < 0.6;
  const precisa = new Set([80, ...(precisaFtp ? [21] : []), ...(precisaMail ? [25] : [])]);
  const ipAtacante = `200.${Math.floor(rng() * 250)}.${Math.floor(rng() * 250)}.${Math.floor(rng() * 250)}`;
  const contasRuins = embaralhar(rng, [
    { l: 'guest::1001:100:Convidado:/home/guest:/bin/sh', nome: 'Conta guest sem senha', ok: true },
    { l: 'admin:x:0:0:Admin do site:/root:/bin/sh', nome: 'Segunda conta com UID 0 (admin)', ok: true },
    { l: 'teste:x:1002:100:teste (senha: teste):/home/teste:/bin/sh', nome: 'Conta de teste com senha óbvia', ok: true },
  ]).slice(0, 2);
  const contasBoas = [
    { l: 'root:x:0:0:root:/root:/bin/sh', ok: false }, { l: 'daemon:x:1:1:daemon:/usr/sbin:/bin/false', ok: false },
    { l: 'www:x:33:33:Servidor web:/var/www:/bin/false', ok: false }, { l: `${ctx.cliente.contato.split(' ').pop()?.toLowerCase() ?? 'dono'}:x:1000:100:Dono:/home/dono:/bin/sh`, ok: false },
  ];
  const contas = embaralhar(rng, [...contasBoas, ...contasRuins]);

  const evidencias = [
    { id: 'portas', nome: 'Serviços antigos e desnecessários escutando' },
    { id: 'contas', nome: 'Contas indevidas no /etc/passwd' },
    { id: 'brute', nome: `Centenas de falhas de login vindas de ${ipAtacante}` },
    { id: 'telnet', nome: 'Administração remota feita por Telnet' },
    { id: 'cert', nome: 'sendmail com alerta do CERT sem correção' },
  ];
  const dispensaveis = abertos.filter((s) => !precisa.has(s.porta));
  const ferramentas = [
    ferramenta('netstat', 'netstat -an', 'Serviços escutando na rede.', 0.5, [
      { t: 'Proto  Endereço local   Estado' },
      ...abertos.map((s) => ({ t: `tcp    0.0.0.0:${String(s.porta).padEnd(6)}  LISTEN   (${s.desc})`, ...(!precisa.has(s.porta) && s.porta !== 23 ? { pista: 'portas' } : s.porta === 23 ? { pista: 'telnet' } : {}) })),
    ]),
    ferramenta('passwd', '/etc/passwd', 'Contas do sistema.', 0.5, contas.map((c) => ({ t: c.l, ...(c.ok ? { pista: 'contas' } : {}) }))),
    ferramenta('log', '/var/log/messages', 'Autenticações recentes.', 1, [
      { t: `Mar 12 03:14:01 loja login: FAILED LOGIN 1 FROM ${ipAtacante} FOR root`, pista: 'brute' },
      { t: `Mar 12 03:14:03 loja login: FAILED LOGIN 2 FROM ${ipAtacante} FOR root`, pista: 'brute' },
      { t: '   ... (312 linhas iguais em 10 minutos) ...', pista: 'brute' },
      { t: 'Mar 12 08:02:44 loja login: LOGIN ON ttyp0 BY dono FROM 192.168.0.10 (telnet)', pista: 'telnet' },
      { t: 'Mar 12 08:30:10 loja httpd: started' },
    ]),
    ferramenta('versoes', 'Versões x boletins do CERT', 'Compara o instalado com os alertas publicados.', 1, [
      { t: 'Apache 1.0.3 ............ sem alertas' }, { t: 'sendmail 8.6.9 .......... VULNERÁVEL (alerta do CERT; correção disponível)', pista: 'cert' }, { t: 'kernel 1.2.13 ........... sem alertas' },
    ]),
    ferramenta('portscan', 'Varredura de portas externa', 'Vê o servidor como o invasor vê.', 0.5, abertos.map((s) => ({ t: `${s.porta}/tcp aberta  ${s.nome}`, ...(!precisa.has(s.porta) ? { pista: 'portas' } : {}) })), 'tcpip3'),
  ];

  const etapas: Etapa[] = [
    {
      tipo: 'multi', titulo: 'Serviços', pergunta: `O site (porta 80) precisa continuar no ar${precisaFtp ? ', a contadora envia arquivos por FTP' : ''}${precisaMail ? ' e a loja recebe e-mail no servidor' : ''}. Marque os serviços que devem ser DESATIVADOS.`,
      opcoes: abertos.map((s) => ({ t: `${s.porta} · ${s.desc}`, ok: !precisa.has(s.porta) })),
      explicacao: `Tudo o que não é necessário sai: menos serviço é menos código para explorar e menos porta para entrar (redução da superfície de ataque). Ficam só ${[...precisa].sort((a, b) => a - b).join(', ')}. Desligar o que o cliente usa também é falha: disponibilidade é segurança.`,
      item: 'hrd-10', horasErro: 1,
    },
    {
      tipo: 'multi', titulo: 'Contas', pergunta: 'Marque as contas que devem ser removidas ou bloqueadas.', mono: true,
      opcoes: contas.map((c) => ({ t: c.l, ok: c.ok })),
      explicacao: 'Conta sem senha, segunda conta com UID 0 e conta de teste com senha óbvia são portas abertas. root, daemon, www e o usuário do dono são legítimos.',
      item: 'hrd-08', horasErro: 1,
    },
    escolha(rng, 'Acesso remoto', 'O dono administra o servidor de casa, por Telnet. O que fazer?', ssh ? 'Substituir o Telnet pelo SSH, que cifra a sessão inteira' : 'Desativar o Telnet e administrar só pelo console até haver acesso cifrado',
      ['Manter o Telnet, trocando a senha toda semana', 'Mudar o Telnet para outra porta', 'Liberar o rlogin, que é mais moderno'],
      'O Telnet transmite tudo em texto claro, inclusive a senha. O SSH (criado em 1995) cifra a sessão e autentica o servidor. Mudar de porta é segurança por obscuridade.', 'hrd-04'),
    escolha(rng, 'Ataque em andamento', `O log mostra 312 tentativas de login como root vindas de ${ipAtacante} em 10 minutos. A medida que mitiga diretamente esse ataque é`,
      'Bloquear temporariamente a conta ou o endereço após poucas tentativas inválidas', ['Aumentar o tamanho do disco de logs', 'Desativar o servidor web', 'Cifrar o disco do servidor', 'Trocar o hub por um switch'],
      'É um ataque de força bruta. Bloquear após N falhas torna a tentativa em massa inviável; proibir login direto do root ajuda mais ainda.', 'hrd-07'),
    escolha(rng, 'Correções', 'O sendmail instalado tem alerta do CERT com correção disponível. O procedimento adequado é', 'Testar e aplicar a correção numa janela combinada com o cliente, registrando a mudança',
      ['Esperar acontecer um incidente para justificar a parada', 'Aplicar direto em produção no horário de pico', 'Ignorar, porque o servidor tem firewall'],
      'A maior parte dos ataques explora falhas já corrigidas. O processo é inventariar, priorizar, testar, aplicar e registrar.', 'hrd-06'),
    {
      tipo: 'ce', titulo: 'Afirmações do laudo', pergunta: 'Julgue as afirmações do laudo de blindagem.', explicacao: '', laudo: true, horasErro: 0,
      afirmacoes: embaralhar(rng, [
        { t: 'Desativar serviços desnecessários reduz a superfície de ataque do servidor.', certo: true, item: 'hrd-01', por: 'O que não está ativo não pode ser explorado.' },
        { t: 'A conta admin com UID 0 usada pelo estagiário respeita o princípio do menor privilégio.', certo: false, item: 'hrd-02', por: 'UID 0 é poder total; o estagiário precisa só do que o trabalho exige.' },
        { t: 'Com as correções aplicadas, os demais controles de segurança tornam-se dispensáveis.', certo: false, item: 'hrd-09', por: 'Defesa em profundidade: as camadas se somam.' },
        { t: 'Manter contas com senhas padrão facilita o suporte e não representa risco relevante.', certo: false, item: 'hrd-03', por: 'Senhas padrão são públicas e as primeiras tentadas.' },
      ]).slice(0, 3),
    },
  ];
  void dispensaveis;
  return novoCaso({
    servico: 'servidor', titulo: 'Servidor de portas abertas', horasPrazo: 8 + ctx.dif,
    chamado: sub('{p}: "O servidor do site de {c} está na Internet do jeito que veio de fábrica. Um amigo disse que dá para entrar nele de qualquer lugar. Ele tem razão?"', ctx),
    perguntas: [
      { p: 'O que roda nesse servidor?', r: `O site da loja${precisaFtp ? ', o FTP da contadora' : ''}${precisaMail ? ' e o e-mail' : ''}. O resto eu não sei, veio instalado.`, horas: 0.25 },
      { p: 'Quem tem acesso?', r: 'Eu, o estagiário, que usa a conta admin para atualizar o site, e o técnico antigo.', horas: 0.25, pista: 'contas' },
      { p: 'Como administra de longe?', r: 'Pelo Telnet, lá de casa. Prático.', horas: 0.25, pista: 'telnet' },
    ],
    ferramentas, evidencias, etapas,
    verificacao: { texto: 'Rodar um teste de invasão à noite contra o servidor', horas: 1.5, resultado: 'O teste noturno só encontrou o que deveria estar aberto. Nenhuma tentativa de força bruta passou do bloqueio.' },
  });
}
