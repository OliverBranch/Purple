// Plano de endereçamento: sub-redes calculadas (VLSM), faixa privada, NAT, diagnóstico e IPv6.
import { Etapa, EtapaCampos } from '../../core/caso';
import { Ctx, embaralhar, escolha, ferramenta, ipNum, ipStr, mascara, novoCaso, prefixoPara, sub } from './comum';

const SETORES = ['Vendas', 'Financeiro', 'Estoque', 'Recepção', 'Diretoria', 'Atendimento', 'Oficina', 'Laboratório'];
const GRUPOS = [[50, 60, 40, 33], [20, 25, 28, 18], [10, 12, 14, 9], [3, 5, 6, 4]];

function abreviar6(grupos: number[]): string {
  // maior sequência de zeros vira ::, zeros à esquerda caem
  let ini = -1, len = 0;
  for (let i = 0; i < 8; i++) {
    if (grupos[i] !== 0) continue;
    let j = i;
    while (j < 8 && grupos[j] === 0) j++;
    if (j - i > len && j - i > 1) { ini = i; len = j - i; }
    i = j;
  }
  const h = grupos.map((g) => g.toString(16));
  if (ini < 0) return h.join(':');
  const esq = h.slice(0, ini).join(':');
  const dir = h.slice(ini + len).join(':');
  return `${esq}::${dir}`;
}

export function gerarEnderecos(ctx: Ctx) {
  const { rng } = ctx;
  const privado10 = rng() < 0.4;
  const base = privado10 ? `10.${1 + Math.floor(rng() * 250)}.${Math.floor(rng() * 250)}.0` : `192.168.${1 + Math.floor(rng() * 250)}.0`;
  const n = 2 + Math.min(2, ctx.dif - 1 + Math.floor(rng() * 2));
  const nomes = embaralhar(rng, SETORES).slice(0, n);
  const tamanhos = embaralhar(rng, GRUPOS).slice(0, n).map((g) => g[Math.floor(rng() * g.length)]!);
  const setores = nomes.map((nome, i) => ({ nome, hosts: tamanhos[i]!, p: prefixoPara(tamanhos[i]!) })).sort((a, b) => a.p - b.p);
  let cursor = ipNum(base);
  const plano = setores.map((s) => {
    const tam = 2 ** (32 - s.p);
    const rede = cursor;
    cursor += tam;
    return { ...s, rede: ipStr(rede), bc: ipStr(rede + tam - 1), mask: mascara(s.p) };
  });
  const evidencias = plano.map((s, i) => ({ id: `s${i}`, nome: `${s.nome}: ${s.hosts} equipamentos` }));
  evidencias.push({ id: 'pub', nome: 'O provedor fornece um único IP público' }, { id: 'apipa', nome: 'Estação com endereço que ninguém configurou' });

  const prob = Math.floor(rng() * 3);
  const alvo = plano[0]!;
  const ipAlvo = ipStr(ipNum(alvo.rede) + 7);
  const gw = ipStr(ipNum(alvo.rede) + 1);
  const saida = prob === 0
    ? ['Endereço IP . . . . . : 169.254.81.20', 'Máscara de sub-rede . : 255.255.0.0', 'Gateway padrão  . . . :', 'Servidor DHCP . . . . : (sem resposta)']
    : prob === 1
      ? [`Endereço IP . . . . . : ${ipAlvo}`, `Máscara de sub-rede . : ${alvo.mask}`, `Gateway padrão  . . . : ${ipStr(ipNum(alvo.bc) + 2)}`]
      : [`Endereço IP . . . . . : ${ipAlvo}`, 'Máscara de sub-rede . : 255.255.255.252', `Gateway padrão  . . . : ${gw}`];
  const diag = ['A estação não obteve resposta do DHCP e se autoconfigurou com link-local', 'O gateway padrão está fora da sub-rede da estação', 'A máscara está errada e encolhe a sub-rede da estação'];
  const porque = [
    'A faixa 169.254.0.0/16 é link-local (APIPA): a estação se atribui um endereço quando o DHCP não responde. Ela só fala com vizinhos do mesmo enlace.',
    `A sub-rede de ${alvo.nome} vai de ${alvo.rede} a ${alvo.bc}. O gateway ${ipStr(ipNum(alvo.bc) + 2)} está em outra sub-rede, então a estação não consegue entregar nada para fora.`,
    `Com máscara /30 a estação acha que a rede dela tem 4 endereços; a sub-rede certa é /${alvo.p} (${alvo.mask}). Ela não enxerga quase ninguém.`,
  ];

  const ferramentas = [
    ferramenta('inventario', 'Inventário por setor', 'Quantos equipamentos cada setor tem e terá.', 0.5, [
      { t: 'Setor            Equipamentos (com folga de crescimento)' }, ...plano.map((s, i) => ({ t: `${s.nome.padEnd(16)} ${s.hosts}`, pista: `s${i}` })), { t: 'Impressoras já contadas nos setores' },
    ]),
    ferramenta('provedor', 'Contrato do provedor', 'O que o provedor entrega.', 0.25, [
      { t: 'Link: linha dedicada 64 kbit/s' }, { t: 'Endereços públicos fornecidos: 1 (fixo)', pista: 'pub' }, { t: `Bloco interno sugerido pelo técnico anterior: ${base}/24` },
    ]),
    ferramenta('winipcfg', 'winipcfg da estação com problema', 'Configuração IP da máquina que "não navega".', 0.5, saida.map((t, i) => ({ t, ...(i === 0 || i === 2 ? { pista: 'apipa' } : {}) }))),
  ];

  const tabela: EtapaCampos = {
    tipo: 'campos', titulo: 'Plano de sub-redes', pergunta: `Divida ${base}/24 entre os setores, do maior bloco para o menor, começando do início do bloco e sem pular endereços. Use o menor prefixo que atenda cada setor.`,
    cab: ['Setor', 'Hosts', 'Prefixo', 'Endereço de rede', 'Broadcast'],
    linhas: plano.map((s) => ({ rotulo: [s.nome, String(s.hosts)], campos: [{ aceita: [`/${s.p}`, String(s.p), s.mask], dica: '/26' }, { aceita: [s.rede], dica: 'x.x.x.x' }, { aceita: [s.bc], dica: 'x.x.x.x' }] })),
    explicacao: plano.map((s) => `${s.nome}: ${s.hosts} hosts pedem /${s.p} (${2 ** (32 - s.p) - 2} utilizáveis) → ${s.rede} a ${s.bc}.`).join(' ') + ' Regra: hosts = 2^(32 − prefixo) − 2 (rede e broadcast não contam).',
    item: 'ip4-04', horasErro: 1.5,
  };

  const outro = privado10 ? '172.16.10.0/24' : '10.20.0.0/16';
  const etapas: Etapa[] = [
    tabela,
    escolha(rng, 'Faixa interna', `O técnico anterior sugeriu ${base}/24. Se precisasse de alternativa, qual destes blocos também é privado pela RFC 1918?`, outro, ['172.32.1.0/24', '192.169.0.0/24', '11.0.0.0/8', '200.10.10.0/24'],
      'As faixas privadas são 10.0.0.0/8, 172.16.0.0/12 (de 172.16 a 172.31) e 192.168.0.0/16. 172.32 e 192.169 já são públicos.', 'ip4-03'),
    escolha(rng, 'Saída para a Internet', 'O provedor fornece um único endereço público fixo. Como todas as estações vão acessar a Internet?', 'NAT no roteador de borda, traduzindo os endereços privados para o público',
      ['Configurando o IP público em todas as estações', 'Usando endereços 169.254 nas estações', 'Ativando o broadcast entre as redes', 'Trocando o roteador por um hub'],
      'Com NAT (na forma NAPT), muitas estações saem por um só IP público, diferenciadas pela porta.', 'ip4-10'),
    escolha(rng, 'Estação que não navega', 'Pela saída do winipcfg da estação com problema, o diagnóstico é:', diag[prob]!, [...diag.filter((_, i) => i !== prob), 'A estação está usando o endereço de loopback', 'O cabo passa de 100 metros'],
      porque[prob]!, prob === 0 ? 'ip4-08' : 'ip4-07'),
  ];

  if (ctx.ano >= 1996 || rng() < 0.4) {
    const grupos = [0x2001, 0x0db8, (Math.floor(rng() * 0xfe) + 1) * 16, 0, 0, 0, Math.floor(rng() * 0xff) + 1, Math.floor(rng() * 0xfff) + 1];
    const completo = grupos.map((g) => g.toString(16).padStart(4, '0')).join(':');
    const certo = abreviar6(grupos);
    const errado1 = certo.replace('::', '::0:').replace(':0:', '::');
    const g2 = grupos[2]!.toString(16);
    const errado2 = certo.replace(`:${g2}:`, `:${g2.replace(/0+$/, '')}:`); // erro clássico: cortar zero à direita
    const errado3 = `${certo}::`.replace(':::', '::');
    etapas.push(escolha(rng, 'Laboratório IPng', `A universidade vizinha testa o IPng (IPv6) e pediu para registrar o endereço ${completo} na forma abreviada. Qual está correta?`, certo,
      [...new Set([errado1, errado2, errado3, certo.replace('2001:db8', '21:db8')])].filter((x) => x !== certo).slice(0, 4),
      'Omitem-se os zeros à esquerda de cada grupo e uma única sequência de grupos zerados vira "::". Zeros à direita nunca caem, e "::" só aparece uma vez.', 'ip6-02'));
  }

  const p0 = plano[0]!;
  const verdade = rng() < 0.5;
  const hostsDito = verdade ? 2 ** (32 - p0.p) - 2 : 2 ** (32 - p0.p);
  etapas.push({
    tipo: 'ce', titulo: 'Afirmações do laudo', pergunta: 'Julgue as afirmações do laudo de endereçamento.', explicacao: '', laudo: true, horasErro: 0,
    afirmacoes: [
      { t: `A sub-rede de ${p0.nome}, com prefixo /${p0.p}, comporta até ${hostsDito} hosts.`, certo: verdade, item: 'ip4-02', por: `/${p0.p} tem ${2 ** (32 - p0.p)} endereços, menos rede e broadcast: ${2 ** (32 - p0.p) - 2} hosts.` },
      { t: 'O endereço 169.254.x.x indica que a estação se autoconfigurou por falta de resposta do DHCP.', certo: true, item: 'ip4-08', por: 'É a faixa link-local (APIPA).' },
      { t: 'O CIDR manteve as classes A, B e C obrigatórias, apenas mudando a notação.', certo: false, item: 'ip4-09', por: 'O CIDR acabou com as classes e permitiu prefixos de qualquer tamanho.' },
    ],
  });

  return novoCaso({
    servico: 'enderecos', titulo: 'Endereços em conflito', horasPrazo: 8 + ctx.dif,
    chamado: sub('{p}: "Em {c} os endereços foram dados por ordem de chegada. Duas máquinas brigam pelo mesmo número toda manhã e uma não navega de jeito nenhum. Quero separar os setores direito."', ctx),
    perguntas: [{ p: 'Quantas máquinas cada setor tem?', r: 'Está tudo no inventário que a contadora fez, com folga para crescer.', horas: 0.25 }, { p: 'Quantos IPs o provedor deu?', r: 'Um só. Disseram que é fixo.', horas: 0.25, pista: 'pub' }],
    ferramentas, evidencias, etapas,
    verificacao: { texto: 'Pingar uma máquina de cada setor e o gateway', horas: 1, resultado: 'Todos os setores respondem, e ninguém briga mais pelo mesmo endereço.' },
  });
}
