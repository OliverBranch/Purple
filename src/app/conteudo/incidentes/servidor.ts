// Blindagem de servidor como defesa em tempo real. O servidor está exposto na Internet e os
// ataques chegam pelo fio, cada um batendo numa porta. Você descobre o que está aberto,
// fecha o desnecessário, troca o inseguro e corrige o resto, enquanto o contador de
// comprometimento sobe. Hardening de verdade: menor superfície, sem perder o que o cliente usa.
import { AcaoDef, Incidente, Laudo, Licao, NoInc, Regras, licao, no, novoIncidente, registrar } from '../../core/incidente';
import { Rng, clamp, escolher } from '../../core/rng';
import { Ctx, nN, opcoes, sortear } from './comum';

interface Servico {
  id: string;
  porta: number;
  nome: string;
  desc: string;
  necessario: boolean;
  /** o que fazer quando é necessário mas inseguro */
  correcao?: 'ssh' | 'relay' | 'anonimo' | 'borda';
  ativo: boolean;
  corrigido: boolean;
  conhecido: boolean;
}

const CATALOGO: Omit<Servico, 'ativo' | 'corrigido' | 'conhecido' | 'necessario'>[] = [
  { id: 'telnet', porta: 23, nome: 'Telnet', desc: 'Administração remota. Senha e comandos trafegam em texto claro.', correcao: 'ssh' },
  { id: 'ftp', porta: 21, nome: 'FTP (anônimo com escrita)', desc: 'Qualquer um entra como "anonymous" e grava arquivos.', correcao: 'anonimo' },
  { id: 'smtp', porta: 25, nome: 'SMTP (relay aberto)', desc: 'Entrega e-mail para qualquer destino, de qualquer origem.', correcao: 'relay' },
  { id: 'finger', porta: 79, nome: 'Finger', desc: 'Informa quem são os usuários do servidor. Para qualquer um.' },
  { id: 'http', porta: 80, nome: 'HTTP (site da empresa)', desc: 'O site institucional. Precisa ficar no ar.' },
  { id: 'pop3', porta: 110, nome: 'POP3', desc: 'Leitura de e-mail pelos funcionários.' },
  { id: 'netbios', porta: 139, nome: 'NetBIOS (compartilhamento)', desc: 'Pastas compartilhadas. Útil na rede interna; perigoso na Internet.', correcao: 'borda' },
  { id: 'chargen', porta: 19, nome: 'Echo / Chargen', desc: 'Serviços de teste dos anos 80. Servem de amplificador para negação de serviço.' },
  { id: 'rlogin', porta: 513, nome: 'rlogin / rsh', desc: 'Login remoto baseado em confiança no endereço de origem (.rhosts).' },
];

export const ACOES_SERVIDOR: AcaoDef[] = [
  { id: 'netstat', nome: 'netstat -an', desc: 'Lista as portas em escuta no servidor.', horas: 0.4, alvo: ['servidor'], tipo: 'ferramenta', icone: 'rede' },
  { id: 'portscan', nome: 'Varredura de portas externa', desc: 'Olha o servidor de fora, como o invasor olha.', horas: 0.4, alvo: ['internet'], tipo: 'ferramenta', requer: 'ferr:portscan', icone: 'radar' },
  { id: 'logs', nome: 'Ler os logs', desc: 'O que andou batendo na porta.', horas: 0.4, alvo: ['servidor'], tipo: 'ferramenta', icone: 'lista' },
  { id: 'contas', nome: 'Listar contas', desc: 'Usuários cadastrados e senhas padrão.', horas: 0.3, alvo: ['servidor'], tipo: 'ferramenta', icone: 'pessoa' },
  { id: 'conversar', nome: 'Perguntar o que o servidor faz', desc: 'Descobrir o que o cliente realmente usa.', horas: 0.3, alvo: null, tipo: 'ferramenta', icone: 'fala' },
  { id: 'desativar', nome: 'Desativar serviço', desc: '', horas: 0.3, alvo: ['servidor'], tipo: 'acao', icone: 'x' },
  { id: 'corrigir', nome: 'Corrigir serviço', desc: '', horas: 0.6, alvo: ['servidor'], tipo: 'acao', icone: 'chave' },
  { id: 'patches', nome: 'Aplicar patches de segurança', desc: 'Atualiza o sistema e o servidor web.', horas: 1.6, alvo: ['servidor'], tipo: 'acao', icone: 'remendo' },
  { id: 'lockout', nome: 'Bloqueio após tentativas', desc: 'Trava a conta depois de 5 senhas erradas.', horas: 0.4, alvo: ['servidor'], tipo: 'acao', icone: 'cadeado' },
  { id: 'senhapadrao', nome: 'Trocar senhas padrão', desc: 'admin/admin vira coisa séria.', horas: 0.4, alvo: ['servidor'], tipo: 'acao', icone: 'chave' },
  { id: 'contasoff', nome: 'Desativar contas sem dono', desc: 'Guest e contas de quem já saiu da empresa.', horas: 0.4, alvo: ['servidor'], tipo: 'acao', icone: 'pessoa' },
  { id: 'filtro', nome: 'Filtrar NetBIOS na borda', desc: 'O roteador descarta as portas 137-139 vindas da Internet.', horas: 0.5, alvo: ['roteador'], tipo: 'acao', icone: 'escudo' },
];

const svs = (inc: Incidente): Servico[] => inc.d['servicos'] as Servico[];
export const servicosDe = svs;

export function gerarServidor(c: Ctx): Incidente {
  const { rng, dif } = c;
  const email = rng() < 0.7;
  const ftpUsado = rng() < 0.4;
  const escolhidos = new Set(['telnet', 'http', 'finger', 'chargen', ...(email ? ['smtp', 'pop3'] : []), ...(dif >= 2 ? ['ftp', 'netbios'] : rng() < 0.5 ? ['ftp'] : ['netbios']), ...(dif === 3 ? ['rlogin'] : [])]);
  if (!email && rng() < 0.5) escolhidos.add('smtp');
  const servicos: Servico[] = CATALOGO.filter((s) => escolhidos.has(s.id)).map((s) => ({
    ...s, ativo: true, corrigido: false, conhecido: false,
    necessario: s.id === 'http' || s.id === 'telnet' || (email && (s.id === 'smtp' || s.id === 'pop3')) || (s.id === 'ftp' && ftpUsado) || s.id === 'netbios',
  }));
  const nos: NoInc[] = [
    nN('internet', 'internet', 'Internet', 40, 120),
    nN('roteador', 'roteador', 'Roteador de borda', 150, 130),
    nN('hub', 'hub', 'Hub', 260, 200),
    nN('srv', 'servidor', 'Servidor Unix', 300, 104),
    nN('pc1', 'pc', `Micro de ${c.cliente.contato}`, 380, 214, { dono: c.cliente.contato, arte: Math.floor(rng() * 1000) }),
    nN('pc2', 'pc', 'Micro do estagiário', 210, 236, { dono: 'Estagiário', arte: Math.floor(rng() * 1000) }),
  ];
  const inc = novoIncidente({
    modo: 'servidor', titulo: escolher(rng, ['O servidor peneira', 'Porta aberta é convite', 'Ataques às 3 da tarde']),
    chamado: `${c.cliente.contato}: "${escolher(rng, ['O provedor avisou que nosso servidor está mandando spam e sendo usado para atacar outros.', 'O site amanheceu com um desenho ofensivo na página inicial. Arrumamos, mas sabe como é.', 'O servidor está lento e o log tem mil tentativas de login de gente que não existe.'])}"`,
    contato: c.cliente.contato, dif, ano: c.ano, topicos: ['hard', 'tcpip'],
    nos, links: [
      { a: 'internet', b: 'roteador', tipo: 'longo' }, { a: 'roteador', b: 'srv', tipo: 'cabo' }, { a: 'roteador', b: 'hub', tipo: 'cabo' },
      { a: 'hub', b: 'pc1', tipo: 'cabo' }, { a: 'hub', b: 'pc2', tipo: 'cabo' },
    ],
    limite: [7, 8, 9][dif - 1] as number,
    d: { servicos, email, ftpUsado, patches: false, lockout: false, senhaPadrao: false, contasOff: false, filtro: false, info: false, comp: 0, proxAtaque: 0.6, seqAtq: 0, contasVistas: false, logsVistos: false, conversou: false, invadido: false, bloqueados: 0, sucessos: 0 },
  });
  inc.nos.find((n) => n.id === 'srv')!.visto = true;
  inc.perguntasEm = dif === 1 ? [inc.limite * 0.5] : [inc.limite * 0.35, inc.limite * 0.7];
  registrar(inc, 'Você sentou em frente ao servidor. Lá fora, a Internet de 1990 e poucos já está batendo na porta.', 'sistema');
  return inc;
}

/** Um ataque é bem-sucedido se encontra a porta aberta e a fraqueza que ele explora. */
function resolverAtaque(inc: Incidente, porta: number): { ok: boolean; dano: number; txt: string; item?: string } {
  const s = svs(inc).find((x) => x.porta === porta);
  const d = inc.d;
  if (porta === 139 && d['filtro']) return { ok: false, dano: 0, txt: 'NetBIOS vindo da Internet descartado no roteador.' };
  if (!s || !s.ativo) return { ok: false, dano: 0, txt: `porta ${porta} fechada. Pacote descartado.` };
  const fraco = !d['lockout'] || !d['senhaPadrao'];
  switch (s.id) {
    case 'telnet':
      if (s.corrigido) return { ok: false, dano: 0, txt: 'SSH: tentativa de força bruta frustrada, canal cifrado.' };
      return fraco ? { ok: true, dano: d['info'] ? 14 : 10, txt: 'força bruta no Telnet entrou com uma senha fraca.', item: 'hrd-04' } : { ok: false, dano: 0, txt: 'força bruta no Telnet barrada pelo bloqueio de conta.' };
    case 'ftp':
      return s.corrigido ? { ok: false, dano: 0, txt: 'FTP anônimo recusado.' } : { ok: true, dano: 8, txt: 'alguém subiu 600 MB de "software" pelo FTP anônimo.' };
    case 'smtp':
      return s.corrigido ? { ok: false, dano: 0, txt: 'relay negado para destino externo.' } : { ok: true, dano: 6, txt: 'o servidor foi usado como relay para 40 mil e-mails de spam.' };
    case 'finger':
      d['info'] = true;
      return { ok: true, dano: 2, txt: 'finger entregou a lista de usuários. Os próximos ataques sabem quem atacar.' };
    case 'http':
      return d['patches'] ? { ok: false, dano: 0, txt: 'exploit no servidor web falhou: versão corrigida.' } : { ok: true, dano: 14, txt: 'exploit conhecido no servidor web desatualizado.', item: 'hrd-06' };
    case 'pop3':
      return fraco ? { ok: true, dano: 7, txt: 'senha de e-mail adivinhada por força bruta no POP3.', item: 'hrd-07' } : { ok: false, dano: 0, txt: 'força bruta no POP3 travada pelo bloqueio de conta.' };
    case 'netbios':
      return { ok: true, dano: 9, txt: 'pasta compartilhada acessada direto da Internet.' };
    case 'chargen':
      inc.paciencia = clamp(inc.paciencia - 3, 0, 100);
      return { ok: true, dano: 3, txt: 'chargen usado para amplificar um ataque de negação de serviço. O site engasgou.', item: 'cia-03' };
    case 'rlogin':
      return { ok: true, dano: 12, txt: 'rlogin aceitou um endereço forjado como confiável.' };
  }
  return { ok: false, dano: 0, txt: '' };
}

export const REGRAS_SERVIDOR: Regras = {
  acoes: ACOES_SERVIDOR,

  disponivel(inc, a, n) {
    const d = inc.d;
    if (a.id === 'patches' && d['patches']) return 'Já atualizado.';
    if (a.id === 'lockout' && d['lockout']) return 'Já configurado.';
    if (a.id === 'senhapadrao' && (!d['contasVistas'] || d['senhaPadrao'])) return d['senhaPadrao'] ? 'Já trocadas.' : 'Liste as contas primeiro.';
    if (a.id === 'contasoff' && (!d['contasVistas'] || d['contasOff'])) return d['contasOff'] ? 'Já desativadas.' : 'Liste as contas primeiro.';
    if (a.id === 'filtro' && d['filtro']) return 'Filtro já aplicado.';
    if (a.id === 'conversar' && d['conversou']) return 'O cliente já explicou.';
    void n;
    return true;
  },

  tick(inc, dh, rng, fx) {
    const d = inc.d;
    if (d['invadido']) return;
    d['proxAtaque'] -= dh;
    const ritmo = 1.15 - Math.min(0.75, inc.hora / (inc.limite * 1.2)) - (inc.dif - 1) * 0.1;
    if (d['proxAtaque'] <= 0) {
      d['proxAtaque'] = Math.max(0.22, ritmo * (0.6 + rng() * 0.6));
      const portas = svs(inc).map((s) => s.porta);
      const lixo = [22, 80, 443, 3389, 8080];
      const porta = rng() < 0.82 ? escolher(rng, portas) : escolher(rng, lixo);
      const s = svs(inc).find((x) => x.porta === porta);
      inc.ataques.push({ id: ++d['seqAtq'], alvo: 'srv', porta, rotulo: s ? `${porta}/${s.id}` : `${porta}`, sai: inc.hora, chega: inc.hora + 0.35, de: 'internet' });
    }
    for (const at of inc.ataques.filter((x) => x.chega <= inc.hora)) {
      const r = resolverAtaque(inc, at.porta);
      const s = svs(inc).find((x) => x.porta === at.porta);
      if (s && !s.conhecido && (s.ativo || r.ok)) {
        s.conhecido = true;
        registrar(inc, `Tráfego chegando na porta ${at.porta}: ${s.nome} está aberto.`, 'pista', 'srv');
      }
      if (r.ok) {
        d['comp'] = clamp(d['comp'] + r.dano, 0, 100);
        d['sucessos']++;
        inc.prejuizo += r.dano * 0.45;
        registrar(inc, `Porta ${at.porta}: ${r.txt}`, 'alerta', 'srv');
        fx.efeito('quebra', 'srv', String(at.porta));
        if (r.item) licao(inc, false, `Ataque pela porta ${at.porta}`, r.txt, r.item);
      } else {
        d['bloqueados']++;
        fx.efeito('bloqueia', 'srv', String(at.porta));
      }
      if (d['comp'] >= 100 && !d['invadido']) {
        d['invadido'] = true;
        inc.paciencia = clamp(inc.paciencia - 30, 0, 100);
        registrar(inc, 'O servidor foi tomado. Tem um desenho de caveira no site e o invasor trocou a senha do root.', 'alerta', 'srv');
      }
    }
    inc.ataques = inc.ataques.filter((x) => x.chega > inc.hora);
  },

  executar(inc, a, n, _rng, fx) {
    const d = inc.d;
    const alvo = d['alvoServico'] as string | undefined;
    const s = svs(inc).find((x) => x.id === alvo);
    switch (a.id) {
      case 'netstat': case 'portscan': {
        svs(inc).forEach((x) => (x.conhecido = true));
        const lista = svs(inc).filter((x) => x.ativo && (a.id === 'netstat' || x.porta !== 139 || !d['filtro']));
        registrar(inc, `${a.id === 'portscan' ? 'Visto de fora' : 'Em escuta'}: ${lista.map((x) => `${x.porta}/${x.id}`).join('  ') || 'nada'}`, 'pista', a.id === 'netstat' ? 'srv' : 'internet');
        fx.efeito('alerta', 'srv');
        break;
      }
      case 'logs':
        d['logsVistos'] = true;
        registrar(inc, `Logs: ${d['sucessos'] + 1200} tentativas de login no Telnet e no POP3 vindas de dezenas de endereços; usuário mais tentado: "${d['info'] ? 'neide' : 'root'}".`, 'pista', 'srv');
        break;
      case 'contas':
        d['contasVistas'] = true;
        registrar(inc, 'Contas: root (senha "root"), admin (senha "admin"), guest (ativo, sem senha), jsilva (saiu da empresa em 1994).', 'pista', 'srv');
        break;
      case 'conversar':
        d['conversou'] = true;
        registrar(inc, `${inc.contato}: "O site tem que ficar no ar. ${d['email'] ? 'A gente usa o e-mail daqui, para mandar e para ler.' : 'E-mail a gente usa o do provedor.'} ${d['ftpUsado'] ? 'O sobrinho atualiza o site por FTP.' : 'FTP? Nunca ouvi falar.'} O técnico antigo administrava pelo Telnet de casa. E as pastas compartilhadas são para o escritório."`, 'cliente');
        break;
      case 'desativar': {
        if (!s) break;
        s.ativo = false;
        registrar(inc, `${s.nome} desativado. A porta ${s.porta} fechou.`, 'ok', 'srv');
        fx.efeito('bloqueia', 'srv', String(s.porta));
        if (s.necessario) {
          inc.paciencia = clamp(inc.paciencia - (s.id === 'http' ? 20 : 10), 0, 100);
          registrar(inc, `${inc.contato}: "Ei! ${s.id === 'http' ? 'O site saiu do ar!' : s.id === 'netbios' ? 'Ninguém consegue abrir as pastas!' : s.id === 'telnet' ? 'E agora como eu acesso de casa?' : 'Parou o e-mail!'}"`, 'cliente', 'srv');
          licao(inc, false, `Desativou ${s.nome}, que o cliente usa`, s.correcao === 'ssh' ? 'Administração remota é necessária: o certo é trocar o Telnet pelo SSH, não ficar sem.' : s.correcao === 'borda' ? 'O compartilhamento é necessário na rede interna; o certo é bloquear o acesso vindo da Internet no roteador.' : 'Hardening é remover o desnecessário. O que o negócio usa deve continuar funcionando, de forma segura.', 'hrd-01');
        } else {
          licao(inc, true, `Desativou ${s.nome}`, 'Serviço desnecessário é superfície de ataque de graça. Hardening começa por desligá-lo.', 'hrd-01');
          fx.efeito('acerta', 'srv');
        }
        break;
      }
      case 'corrigir': {
        if (!s) break;
        s.corrigido = true;
        const txt: Record<string, [string, string, string]> = {
          ssh: ['Telnet trocado por SSH na porta 22.', 'Trocou Telnet por SSH', 'O SSH cifra a sessão inteira, inclusive a senha; o Telnet manda tudo em texto claro.'],
          relay: ['Relay fechado: o SMTP só entrega o que é da empresa.', 'Fechou o relay aberto', 'Relay aberto transforma o servidor em distribuidor de spam e põe o domínio em listas negras.'],
          anonimo: ['FTP anônimo desativado; só o sobrinho entra, com senha.', 'Desativou o FTP anônimo', 'Acesso anônimo com escrita vira depósito de arquivos piratas.'],
          borda: ['Compartilhamento liberado só para a rede interna.', 'Restringiu o compartilhamento à rede interna', 'O serviço é necessário dentro de casa; o que não pode é estar exposto para a Internet.'],
        };
        const t = txt[s.correcao ?? ''];
        if (t) {
          if (s.correcao === 'ssh') { s.porta = 22; s.nome = 'SSH'; }
          if (s.correcao === 'borda') d['filtro'] = true;
          registrar(inc, t[0], 'ok', 'srv');
          licao(inc, true, t[1], t[2], s.correcao === 'ssh' ? 'hrd-04' : 'hrd-03');
          fx.efeito('acerta', 'srv');
        }
        break;
      }
      case 'patches':
        d['patches'] = true;
        registrar(inc, 'Patches aplicados. O servidor web saiu da versão de 1994.', 'ok', 'srv');
        licao(inc, true, 'Aplicou os patches', 'A maioria dos ataques explora falhas que já têm correção publicada. Gestão de patches é rotina, não evento.', 'hrd-06');
        fx.efeito('acerta', 'srv');
        break;
      case 'lockout':
        d['lockout'] = true;
        registrar(inc, 'Bloqueio de conta após 5 tentativas configurado.', 'ok', 'srv');
        licao(inc, true, 'Configurou bloqueio por tentativas', 'Travar a conta depois de algumas senhas erradas inviabiliza a força bruta online.', 'hrd-07');
        fx.efeito('acerta', 'srv');
        break;
      case 'senhapadrao':
        d['senhaPadrao'] = true;
        registrar(inc, 'root e admin com senhas novas, que não estão em nenhuma lista de senhas padrão.', 'ok', 'srv');
        licao(inc, true, 'Trocou as senhas padrão', 'Senha de fábrica é a primeira coisa que o atacante tenta.', 'hrd-03');
        fx.efeito('acerta', 'srv');
        break;
      case 'contasoff':
        d['contasOff'] = true;
        registrar(inc, 'guest e jsilva desativados.', 'ok', 'srv');
        licao(inc, true, 'Desativou contas sem dono', 'Conta de ex-funcionário e guest são acessos que ninguém vigia. Mínimo privilégio também vale para contas.', 'hrd-02');
        fx.efeito('acerta', 'srv');
        break;
      case 'filtro':
        d['filtro'] = true;
        registrar(inc, 'Roteador agora descarta NetBIOS (137-139) vindo da Internet.', 'ok', n?.id);
        if (svs(inc).some((x) => x.id === 'netbios')) {
          const nb = svs(inc).find((x) => x.id === 'netbios')!;
          nb.corrigido = true;
          licao(inc, true, 'Filtrou o NetBIOS na borda', 'Defesa em profundidade: o serviço segue útil por dentro e invisível por fora.', 'hrd-09');
        }
        fx.efeito('acerta', n?.id);
        break;
    }
    d['alvoServico'] = undefined;
  },

  objetivos(inc) {
    const c = checklist(inc);
    const feitos = c.filter((x) => x.ok).length;
    inc.obj = [
      { id: 'resistir', txt: `Não deixar o servidor ser tomado (comprometimento ${Math.round(inc.d['comp'])}%)`, feito: !inc.d['invadido'] },
      { id: 'blindar', txt: `Blindagem: ${feitos} de ${c.length} itens`, feito: feitos === c.length },
      { id: 'servir', txt: 'Manter no ar o que o cliente usa', feito: svs(inc).filter((s) => s.necessario).every((s) => s.ativo) },
    ];
  },

  resolucao(inc) {
    const c = checklist(inc);
    const frac = c.filter((x) => x.ok).length / c.length;
    const servir = svs(inc).filter((s) => s.necessario).every((s) => s.ativo) ? 1 : 0;
    return (inc.d['invadido'] ? 0.4 : 1) * (0.7 * frac + 0.3 * servir);
  },

  balanco(inc) {
    return checklist(inc).filter((x) => !x.ok).map((x): Licao => ({ ok: false, titulo: `Faltou: ${x.txt}`, porque: x.porque, item: x.item }));
  },

  laudo(inc, rng) {
    const q1 = opcoes(rng, 'Hardening: reduzir a superfície de ataque, removendo serviços, contas e permissões desnecessários e corrigindo os demais.', [
      'Hardening: instalar o maior número possível de ferramentas de segurança no servidor.',
      'Hardening: aumentar a capacidade do hardware para resistir a ataques de negação de serviço.',
      'Hardening: cifrar todos os arquivos do disco para garantir a disponibilidade.',
      'Hardening: manter todos os serviços ativos e monitorar os acessos pelos logs.',
    ], 5);
    const q2 = opcoes(rng, 'O SSH cifra toda a sessão, inclusive a autenticação, enquanto o Telnet trafega em texto claro.', [
      'O SSH usa a porta 23, que é bloqueada pelos firewalls, e o Telnet a porta 22.',
      'O Telnet não permite autenticação por senha, apenas por endereço IP.',
      'O SSH funciona sobre UDP, o que evita ataques de SYN flood.',
      'O Telnet cifra apenas a senha, e o SSH cifra apenas os comandos.',
    ], 4);
    const extras = sortear(rng, ['tcp-03', 'tcp-04', 'hrd-02', 'hrd-07', 'tcp-08'], 1);
    void extras;
    const out: Laudo[] = [
      { enunciado: 'No relatório, como você define o trabalho feito?', ...q1, item: 'hrd-01', porque: 'Hardening é o processo de reduzir a superfície de ataque: desligar o desnecessário e endurecer o que fica.' },
      { enunciado: 'Por que trocar o Telnet pelo SSH?', ...q2, item: 'hrd-04', porque: 'Telnet (23/TCP) é texto claro; SSH (22/TCP) cifra a sessão inteira.' },
    ];
    const portas = opcoes(rng, '22', ['21', '23', '25', '80', '110'], 4);
    out.push({ enunciado: 'O cliente quer anotar no firewall: em que porta TCP o SSH escuta por padrão?', ...portas, item: 'tcp-04', porque: 'SSH: 22/TCP. FTP 21, Telnet 23, SMTP 25, HTTP 80, POP3 110.' });
    return out;
  },
};

function checklist(inc: Incidente): { txt: string; ok: boolean; porque: string; item: string }[] {
  const d = inc.d;
  const L = svs(inc);
  const out: { txt: string; ok: boolean; porque: string; item: string }[] = [];
  const desn = L.filter((s) => !s.necessario);
  if (desn.length) out.push({ txt: `desativar ${desn.map((s) => s.nome.split(' ')[0]).join(', ')}`, ok: desn.every((s) => !s.ativo), porque: 'Serviço que ninguém usa só serve ao atacante.', item: 'hrd-01' });
  const t = L.find((s) => s.id === 'telnet');
  if (t) out.push({ txt: 'trocar Telnet por SSH', ok: t.corrigido || !t.ativo, porque: 'Telnet manda a senha do administrador em texto claro.', item: 'hrd-04' });
  for (const s of L.filter((x) => x.necessario && x.correcao && x.correcao !== 'ssh')) out.push({ txt: s.correcao === 'relay' ? 'fechar o relay do SMTP' : s.correcao === 'anonimo' ? 'desativar o FTP anônimo' : 'tirar o NetBIOS da Internet', ok: s.corrigido || (s.correcao === 'borda' && !!d['filtro']), porque: 'Serviço necessário fica, mas sem a configuração perigosa.', item: 'hrd-03' });
  out.push({ txt: 'aplicar patches', ok: !!d['patches'], porque: 'Falha com correção publicada é a porta mais usada.', item: 'hrd-06' });
  out.push({ txt: 'bloqueio por tentativas', ok: !!d['lockout'], porque: 'Sem bloqueio, a força bruta tem tentativas infinitas.', item: 'hrd-07' });
  out.push({ txt: 'trocar senhas padrão', ok: !!d['senhaPadrao'], porque: 'admin/admin está em toda lista de ataque.', item: 'hrd-03' });
  out.push({ txt: 'desativar contas sem dono', ok: !!d['contasOff'], porque: 'Guest e ex-funcionário: acessos sem responsável.', item: 'hrd-02' });
  return out;
}
export const checklistServidor = checklist;
