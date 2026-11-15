// Plano de endereçamento: um bloco, vários setores, cada um com um número de micros.
// Você divide o bloco em sub-redes (VLSM) e configura cada setor no roteador; endereço
// desalinhado, sub-rede pequena demais ou sobreposta é recusado com a explicação.
// No meio do caminho, a Internet precisa de NAT e o DHCP resolve morrer.
import { AcaoDef, Incidente, Laudo, Licao, NoInc, Regras, licao, marcar, no, novoIncidente, registrar, tem } from '../../core/incidente';
import { Rng, clamp, escolher } from '../../core/rng';
import { Ctx, nN, opcoes } from './comum';

export const ipNum = (s: string): number | null => {
  const p = s.trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x)) return null;
    const v = Number(x);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
};
export const ipStr = (n: number): string => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
export const tamanho = (pref: number): number => 2 ** (32 - pref);
export const prefixoPara = (hosts: number): number => {
  for (let p = 30; p >= 8; p--) if (tamanho(p) - 2 >= hosts) return p;
  return 8;
};
export const mascaraStr = (pref: number): string => ipStr(2 ** 32 - tamanho(pref));

export interface Setor { id: string; nome: string; hosts: number; cfg: { rede: number; pref: number } | null }

export const ACOES_ENDERECOS: AcaoDef[] = [
  { id: 'conversar', nome: 'Conferir a planilha do cliente', desc: 'Quantos micros cada setor tem hoje e vai ter.', horas: 0.3, alvo: null, tipo: 'ferramenta', icone: 'fala' },
  { id: 'ipconfig', nome: 'winipcfg no setor', desc: 'Mostra o endereço que os micros do setor estão usando.', horas: 0.2, alvo: ['depto'], tipo: 'ferramenta', icone: 'lista' },
  { id: 'configurar', nome: 'Configurar sub-rede', desc: 'Grava rede e prefixo do setor na interface do roteador e no DHCP.', horas: 0.35, alvo: ['depto'], tipo: 'acao', icone: 'chave' },
  { id: 'nat_pat', nome: 'Ativar NAT com sobrecarga (PAT)', desc: 'Todos saem para a Internet pelo único IP público, diferenciados pela porta.', horas: 0.4, alvo: ['roteador'], tipo: 'acao', icone: 'roteador' },
  { id: 'nat_rota', nome: 'Rotear os endereços internos direto', desc: 'Anunciar a rede interna para o provedor como ela está.', horas: 0.4, alvo: ['roteador'], tipo: 'acao', icone: 'rede' },
  { id: 'dhcp', nome: 'Reiniciar o serviço DHCP', desc: 'Volta a distribuir endereços para quem pedir.', horas: 0.3, alvo: ['roteador'], tipo: 'acao', icone: 'energia' },
  { id: 'fixo', nome: 'Pôr IP fixo no micro', desc: 'Digita na mão um endereço do setor.', horas: 0.3, alvo: ['depto'], tipo: 'acao', icone: 'chave' },
];

const NOMES_SETOR = ['Vendas', 'Depósito', 'Financeiro', 'Diretoria', 'Atendimento', 'Oficina', 'Estúdio', 'Recepção'];

export function gerarEnderecos(c: Ctx): Incidente {
  const { rng, dif } = c;
  const terceiro = 1 + Math.floor(rng() * 200);
  const base = ipNum(`192.168.${terceiro}.0`)!;
  const conjuntos = dif === 1 ? [[100, 50], [60, 28, 12], [50, 25, 20]] : dif === 2 ? [[60, 28, 12, 6], [100, 50, 20], [55, 30, 14, 5]] : [[100, 50, 20, 10, 2], [60, 30, 28, 12, 2], [110, 60, 25, 6, 2]];
  const hosts = escolher(rng, conjuntos);
  const nomes = [...NOMES_SETOR].sort(() => rng() - 0.5);
  const setores: Setor[] = hosts.map((h, i) => ({ id: `s${i}`, nome: h === 2 ? 'Enlace com a filial' : (nomes[i] as string), hosts: h, cfg: null }));
  const nos: NoInc[] = [
    nN('internet', 'internet', 'Internet', 34, 30),
    nN('modem', 'modem', 'Linha do provedor', 92, 84),
    nN('roteador', 'roteador', 'Roteador da empresa', 240, 104),
  ];
  const links = [{ a: 'internet', b: 'modem', tipo: 'discada' as const }, { a: 'modem', b: 'roteador', tipo: 'cabo' as const }];
  const pos = [[90, 196], [210, 222], [330, 210], [420, 150], [400, 70]];
  setores.forEach((s, i) => {
    const [x, y] = pos[i] as [number, number];
    nos.push(nN(s.id, 'depto', `${s.nome} · ${s.hosts} ${s.hosts === 2 ? 'pontas' : 'micros'}`, x, y, { arte: Math.min(6, Math.ceil(s.hosts / 18)) }));
    links.push({ a: s.id, b: 'roteador', tipo: 'cabo' });
  });
  const inc = novoIncidente({
    modo: 'enderecos', titulo: escolher(rng, ['Endereço para todo mundo', 'O quebra-cabeça do /24', 'Sub-redes sob medida']),
    chamado: `${c.cliente.contato}: "A empresa cresceu e a rede virou bagunça: conflito de IP todo dia. O provedor nos deu um IP só, e internamente vamos usar 192.168.${terceiro}.0/24. Cada setor na sua sub-rede, por favor."`,
    contato: c.cliente.contato, dif, ano: c.ano, topicos: ['ipv4', 'tcpip'], nos, links, limite: [5, 6, 7][dif - 1] as number,
    d: { base, setores, nat: null, dhcpQuebra: 1.5 + rng() * (dif + 1), dhcpOk: true, dhcpAlvo: null, conversou: false, erros: 0 },
  });
  inc.perguntasEm = dif === 1 ? [inc.limite * 0.55] : [inc.limite * 0.35, inc.limite * 0.75];
  registrar(inc, `Bloco disponível: ${ipStr(base)}/24. Comece pelos setores maiores: é assim que o VLSM não deixa buraco.`, 'sistema');
  return inc;
}

const setoresDe = (inc: Incidente): Setor[] => inc.d['setores'] as Setor[];
export const setoresEnd = setoresDe;

/** Valida uma configuração proposta. Devolve null se estiver certa, ou a explicação do erro. */
export function validar(inc: Incidente, s: Setor, rede: number, pref: number): { erro: string; item: string } | null {
  const base = inc.d['base'] as number;
  const t = tamanho(pref);
  if (pref < 24 || pref > 30) return { erro: `/${pref} não cabe: o bloco inteiro é um /24.`, item: 'ip4-01' };
  if (rede < base || rede + t > base + 256) return { erro: `${ipStr(rede)}/${pref} está fora do bloco ${ipStr(base)}/24.`, item: 'ip4-03' };
  if ((rede - base) % t !== 0) {
    const ini = base + Math.floor((rede - base) / t) * t;
    return { erro: `${ipStr(rede)} não é endereço de rede de um /${pref}: os blocos de ${t} endereços começam em múltiplos de ${t}. Esse endereço cai na sub-rede ${ipStr(ini)}/${pref}.`, item: 'ip4-04' };
  }
  if (t - 2 < s.hosts) return { erro: `Um /${pref} tem ${t - 2} endereços de host (${t} menos rede e broadcast). ${s.nome} precisa de ${s.hosts}.`, item: 'ip4-02' };
  for (const o of setoresDe(inc)) {
    if (o === s || !o.cfg) continue;
    const a1 = rede, a2 = rede + t, b1 = o.cfg.rede, b2 = o.cfg.rede + tamanho(o.cfg.pref);
    if (a1 < b2 && b1 < a2) return { erro: `Sobrepõe a sub-rede de ${o.nome} (${ipStr(o.cfg.rede)}/${o.cfg.pref}).`, item: 'ip4-06' };
  }
  return null;
}

export const REGRAS_ENDERECOS: Regras = {
  acoes: ACOES_ENDERECOS,

  disponivel(inc, a, n) {
    if (a.id === 'dhcp' && inc.d['dhcpOk']) return 'O DHCP está funcionando.';
    if ((a.id === 'nat_pat' || a.id === 'nat_rota') && inc.d['nat'] === 'pat') return 'NAT já configurado.';
    if (a.id === 'conversar' && inc.d['conversou']) return 'Você já tem a planilha.';
    if (a.id === 'fixo' && (!n || inc.d['dhcpAlvo'] !== n.id)) return 'Os micros deste setor estão recebendo endereço normalmente.';
    return true;
  },

  tick(inc, dh, rng, fx) {
    const L = setoresDe(inc);
    inc.prejuizo += dh * 0.7 * L.filter((s) => !s.cfg).length;
    if (inc.d['nat'] !== 'pat' && L.some((s) => s.cfg)) inc.prejuizo += dh * 0.4;
    if (inc.d['dhcpOk'] && inc.d['dhcpQuebra'] !== null && inc.hora >= inc.d['dhcpQuebra']) {
      const prontos = L.filter((s) => s.cfg && s.hosts > 2);
      if (prontos.length) {
        const s = escolher(rng, prontos);
        inc.d['dhcpOk'] = false;
        inc.d['dhcpQuebra'] = null;
        inc.d['dhcpAlvo'] = s.id;
        const nd = no(inc, s.id)!;
        marcar(nd, 'pane');
        nd.visto = false;
        registrar(inc, `Ligaram do setor ${s.nome}: "Os micros que acabaram de ligar não acessam nada!"`, 'cliente', s.id);
        fx.efeito('alerta', s.id);
      } else inc.d['dhcpQuebra'] = inc.hora + 0.5;
    }
    if (!inc.d['dhcpOk']) inc.prejuizo += dh * 0.9;
  },

  executar(inc, a, n, _rng, fx) {
    const d = inc.d;
    if (a.id === 'conversar') {
      d['conversou'] = true;
      registrar(inc, `Planilha: ${setoresDe(inc).map((s) => `${s.nome}: ${s.hosts}`).join(' · ')}. "Pode deixar uma folga, mas não dá para estourar o /24."`, 'cliente');
      return;
    }
    const s = n ? setoresDe(inc).find((x) => x.id === n.id) : undefined;
    if (a.id === 'ipconfig' && s && n) {
      n.visto = true;
      if (d['dhcpAlvo'] === s.id) registrar(inc, `${s.nome} › IP 169.254.${37 + s.hosts % 50}.12, máscara 255.255.0.0, sem gateway. O micro não recebeu resposta do DHCP e se autoconfigurou (APIPA).`, 'pista', n.id);
      else if (s.cfg) registrar(inc, `${s.nome} › IP ${ipStr(s.cfg.rede + 5)}, máscara ${mascaraStr(s.cfg.pref)}, gateway ${ipStr(s.cfg.rede + 1)}.`, 'info', n.id);
      else registrar(inc, `${s.nome} › IP 192.168.0.${10 + s.hosts % 90}: endereço antigo, conflitando com outro setor.`, 'info', n.id);
      return;
    }
    if (a.id === 'configurar' && s && n) {
      const prop = d['arg'] as { rede: string; pref: number } | undefined;
      d['arg'] = undefined;
      const rede = prop ? ipNum(prop.rede) : null;
      if (rede === null || !prop) { registrar(inc, 'Endereço inválido. Use o formato 192.168.x.y.', 'erro', n.id); return; }
      const v = validar(inc, s, rede, prop.pref);
      if (v) {
        d['erros']++;
        inc.paciencia = clamp(inc.paciencia - 3, 0, 100);
        registrar(inc, `Recusado: ${v.erro}`, 'erro', n.id);
        licao(inc, false, `Configuração recusada em ${s.nome}`, v.erro, v.item);
        fx.efeito('erra', n.id);
        return;
      }
      s.cfg = { rede, pref: prop.pref };
      marcar(n, 'ok');
      n.visto = true;
      const t = tamanho(prop.pref);
      registrar(inc, `${s.nome}: ${ipStr(rede)}/${prop.pref} (máscara ${mascaraStr(prop.pref)}), gateway ${ipStr(rede + 1)}, broadcast ${ipStr(rede + t - 1)}. ${t - 2} hosts para ${s.hosts} micros.`, 'ok', n.id);
      fx.efeito('acerta', n.id);
      const justo = prop.pref === prefixoPara(s.hosts);
      if (justo) licao(inc, true, `Sub-rede sob medida para ${s.nome}`, `O menor bloco que comporta ${s.hosts} hosts é o /${prop.pref} (${t - 2} utilizáveis).`, 'ip4-02');
      return;
    }
    if (a.id === 'nat_pat') {
      d['nat'] = 'pat';
      registrar(inc, 'NAT com sobrecarga ativo: todos os micros saem pelo IP do provedor, cada conexão numa porta.', 'ok', n?.id);
      licao(inc, true, 'Configurou NAT/PAT', 'Endereços privados (RFC 1918) não são roteados na Internet; o NAT traduz para o IP público e o PAT multiplexa pelas portas.', 'ip4-10');
      fx.efeito('acerta', n?.id);
      return;
    }
    if (a.id === 'nat_rota') {
      d['nat'] = 'rota';
      inc.paciencia = clamp(inc.paciencia - 5, 0, 100);
      registrar(inc, 'O provedor descartou tudo: endereços 192.168.x.x não são roteáveis na Internet. Ninguém navega.', 'erro', n?.id);
      licao(inc, false, 'Tentou rotear endereço privado na Internet', 'Os blocos 10/8, 172.16/12 e 192.168/16 são privados: só saem para a Internet através de NAT.', 'ip4-03');
      fx.efeito('erra', n?.id);
      return;
    }
    if (a.id === 'dhcp') {
      d['dhcpOk'] = true;
      const alvo = no(inc, d['dhcpAlvo']);
      if (alvo) { marcar(alvo, 'pane', false); alvo.visto = true; }
      d['dhcpAlvo'] = null;
      registrar(inc, 'DHCP reiniciado. Os micros renovaram o endereço e voltaram para a sub-rede certa.', 'ok', n?.id);
      licao(inc, true, 'Reconheceu o 169.254 e consertou o DHCP', 'Endereço 169.254.x.x é APIPA: o micro pediu endereço ao DHCP e ninguém respondeu.', 'ip4-08');
      fx.efeito('acerta', n?.id);
      return;
    }
    if (a.id === 'fixo' && n) {
      registrar(inc, 'IP fixo num micro resolve aquele micro. Os outros que ligarem continuam sem endereço: o problema é o DHCP.', 'erro', n.id);
      inc.paciencia = clamp(inc.paciencia - 3, 0, 100);
      licao(inc, false, 'Remendou um micro em vez de achar a causa', '169.254 em vários micros aponta para o servidor DHCP, não para cada máquina.', 'ip4-08');
      fx.efeito('erra', n.id);
    }
  },

  objetivos(inc) {
    const L = setoresDe(inc);
    inc.obj = [
      { id: 'sub', txt: `Setores com sub-rede válida: ${L.filter((s) => s.cfg).length} de ${L.length}`, feito: L.every((s) => s.cfg) },
      { id: 'nat', txt: 'Todos navegando pelo IP único do provedor', feito: inc.d['nat'] === 'pat' },
      { id: 'dhcp', txt: 'Ninguém sem endereço', feito: !!inc.d['dhcpOk'] && inc.d['dhcpQuebra'] === null },
    ];
  },

  resolucao(inc) {
    const L = setoresDe(inc);
    const sub = L.filter((s) => s.cfg).length / L.length;
    return 0.6 * sub + 0.25 * (inc.d['nat'] === 'pat' ? 1 : 0) + 0.15 * (inc.d['dhcpOk'] ? 1 : 0);
  },

  balanco(inc) {
    const out: Licao[] = [];
    const sem = setoresDe(inc).filter((s) => !s.cfg);
    if (sem.length) {
      const sug = planoVlsm(inc);
      out.push({ ok: false, titulo: `Sem sub-rede: ${sem.map((s) => s.nome).join(', ')}`, porque: `Um plano que cabe: ${sug.map((p) => `${p.nome} ${ipStr(p.rede)}/${p.pref}`).join(' · ')}. Do maior para o menor, cada um começando no fim do anterior.`, item: 'ip4-06' });
    }
    if (inc.d['nat'] !== 'pat') out.push({ ok: false, titulo: 'Sem NAT', porque: 'Com um IP público só e a rede em 192.168.x.x, a saída para a Internet depende de NAT com sobrecarga.', item: 'ip4-10' });
    if (!inc.d['dhcpOk']) out.push({ ok: false, titulo: 'Setor ficou sem endereço', porque: '169.254.x.x = APIPA: o DHCP não respondeu.', item: 'ip4-08' });
    return out;
  },

  laudo(inc, rng) {
    const L = setoresDe(inc);
    const plano = planoVlsm(inc);
    const s = L.find((x) => x.cfg && x.hosts > 2) ?? L[0]!;
    const cfg = s.cfg ?? plano.find((p) => p.nome === s.nome)!;
    const t = tamanho(cfg.pref);
    const bc = ipStr(cfg.rede + t - 1);
    const errados = [ipStr(cfg.rede + t), ipStr(cfg.rede + t - 2), ipStr(cfg.rede), ipStr(cfg.rede + Math.floor(t / 2) - 1), ipStr(cfg.rede + 255 - (cfg.rede % 256))];
    const q1 = opcoes(rng, bc, errados.filter((x) => x !== bc), 5);
    const pref = escolher(rng, [25, 26, 27, 28, 29]);
    const certo = String(tamanho(pref) - 2);
    const q2 = opcoes(rng, certo, [String(tamanho(pref)), String(tamanho(pref) - 1), String(tamanho(pref) / 2 - 2), String(tamanho(pref) * 2 - 2)], 4);
    const q3 = opcoes(rng, '172.20.15.9', ['172.32.1.1', '192.169.4.20', '10.256.0.1', '200.168.1.1', '11.0.0.1'], 5);
    return [
      { enunciado: `Qual é o endereço de broadcast da sub-rede de ${s.nome} (${ipStr(cfg.rede)}/${cfg.pref})?`, ...q1, item: 'ip4-04', porque: `Bloco de ${t} endereços: rede ${ipStr(cfg.rede)}, broadcast ${bc} (o último).` },
      { enunciado: `Quantos hosts utilizáveis cabem num /${pref}?`, ...q2, item: 'ip4-02', porque: `2^(32−${pref}) = ${tamanho(pref)} endereços, menos rede e broadcast: ${certo}.` },
      { enunciado: 'Qual destes endereços é privado pela RFC 1918?', ...q3, item: 'ip4-03', porque: 'Privados: 10.0.0.0/8, 172.16.0.0/12 (172.16 a 172.31) e 192.168.0.0/16.' },
    ];
  },
};

/** Plano VLSM de referência: do maior setor para o menor. */
export function planoVlsm(inc: Incidente): { nome: string; rede: number; pref: number }[] {
  let cur = inc.d['base'] as number;
  return [...setoresDe(inc)].sort((a, b) => b.hosts - a.hosts).map((s) => {
    const pref = prefixoPara(s.hosts);
    const p = { nome: s.nome, rede: cur, pref };
    cur += tamanho(pref);
    return p;
  });
}
void tem;
