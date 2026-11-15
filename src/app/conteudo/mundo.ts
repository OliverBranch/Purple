import { Item, Noticia } from '../core/tipos';
import { ITENS_A } from './itens-a';
import { ITENS_B } from './itens-b';

export const ITENS: Item[] = [...ITENS_A, ...ITENS_B];
export const itemPorId = (id: string): Item | undefined => ITENS.find((i) => i.id === id);
export const itensDoTopico = (t: string): Item[] => ITENS.filter((i) => i.topico === t);
export const itensDosTopicos = (ts: string[]): Item[] => ITENS.filter((i) => ts.includes(i.topico));

// Linha do tempo: fatos reais da história da segurança, na ordem em que aconteceram.
export const NOTICIAS: Noticia[] = [
  { ano: 1995, mes: 1, titulo: 'A Internet comercial vem aí',
    texto: 'O acesso comercial à Internet chega ao Brasil neste ano. Por enquanto, segurança da informação é trancar a sala do computador. Bem-vindo a 1995.' },
  { ano: 1995, mes: 2, titulo: 'Reino Unido publica a BS 7799',
    texto: 'Sai o código de prática britânico de gestão de segurança da informação. Parece papelada. Um dia vai virar a família ISO 27000 e pagar muitas contas.' },
  { ano: 1995, mes: 4, titulo: 'SATAN está à solta',
    texto: 'É lançado o SATAN, ferramenta gratuita que varre redes em busca de falhas conhecidas. Administradores entram em pânico; a imprensa também. Procura por blindagem de servidores em alta.', servico: 'servidor' },
  { ano: 1995, mes: 7, titulo: 'Nasce o SSH',
    texto: 'Depois de um ataque de captura de senhas em sua universidade, o finlandês Tatu Ylönen cria o Secure Shell. O Telnet finge que não viu.' },
  { ano: 1995, mes: 8, titulo: 'Windows 95 chega às lojas',
    texto: 'Filas à meia-noite por um sistema operacional. Todo escritório agora quer computadores em rede. Procura por montagem de redes em alta.', servico: 'rede' },
  { ano: 1995, mes: 12, titulo: 'IPv6 ganha sua primeira especificação',
    texto: 'A RFC 1883 descreve o sucessor do IPv4, com endereços de 128 bits. A previsão é de adoção rápida. Guarde este jornal.', servico: 'enderecos' },
  { ano: 1996, mes: 11, titulo: 'Estouro de pilha vira receita',
    texto: 'A revista Phrack publica "Smashing the Stack for Fun and Profit". Explorar buffer overflow deixa de ser arte de poucos.' },
  { ano: 1997, mes: 6, titulo: 'Brasil ganha grupo de resposta a incidentes',
    texto: 'É criado o NBSO, que mais tarde se chamará CERT.br. Agora existe a quem avisar quando der errado.' },
  { ano: 1997, mes: 9, titulo: 'Nmap é lançado',
    texto: 'Um varredor de portas gratuito aparece na Phrack. Em pouco tempo, ninguém mais consegue fingir que não sabe quais portas deixou abertas.', servico: 'servidor' },
  { ano: 1998, mes: 4, titulo: 'Projeto Nessus começa',
    texto: 'Surge um scanner de vulnerabilidades de código aberto. Procurar falha em rede alheia ficou mais barato. Procurar na própria, também.' },
  { ano: 1998, mes: 6, titulo: 'Vírus CIH é descoberto',
    texto: 'Também chamado de Chernobyl, o CIH consegue sobrescrever a BIOS de algumas placas. Limpeza de vírus em alta.', servico: 'virus' },
  { ano: 1998, mes: 12, titulo: 'IPv6, agora vai (RFC 2460)',
    texto: 'A especificação do IPv6 é revisada e consolidada. O IPv4 segue firme, forte e remendado com NAT.', servico: 'enderecos' },
  { ano: 1999, mes: 1, titulo: 'TLS 1.0 é publicado',
    texto: 'A RFC 2246 padroniza o sucessor do SSL. O cadeado do navegador ganha um nome novo que ninguém vai usar por mais uns dez anos.' },
  { ano: 1999, mes: 3, titulo: 'Melissa derruba servidores de e-mail',
    texto: 'Um vírus de macro em documento do Word se envia aos 50 primeiros contatos da vítima. Empresas desligam o correio eletrônico. Limpeza de vírus em alta.', servico: 'virus' },
  { ano: 1999, mes: 9, titulo: 'Vulnerabilidades ganham identidade: CVE',
    texto: 'É lançada a lista CVE, com um identificador único para cada falha conhecida. Finalmente todos podem discutir o mesmo problema.' },
  { ano: 2000, mes: 2, titulo: 'Ataques derrubam gigantes da web',
    texto: 'Yahoo!, eBay, Amazon e CNN saem do ar sob negação de serviço distribuída. O autor era um adolescente. Disponibilidade vira assunto de diretoria.', servico: 'diagnostico' },
  { ano: 2000, mes: 5, titulo: 'ILOVEYOU: a carta de amor mais cara da história',
    texto: 'Um worm disfarçado de declaração de amor se espalha por e-mail e sobrescreve arquivos mundo afora. Limpeza de vírus em alta.', servico: 'virus' },
  { ano: 2000, mes: 12, titulo: 'BS 7799 vira norma internacional',
    texto: 'É publicada a ISO/IEC 17799:2000. Segurança da informação agora tem norma ISO. Os auditores agradecem.' },
  { ano: 2001, mes: 7, titulo: 'Code Red infecta servidores web',
    texto: 'Um worm explora servidores IIS sem correção e se espalha sem depender de ninguém clicar em nada. A correção existia havia um mês. Blindagem de servidores em alta.', servico: 'servidor' },
  { ano: 2001, mes: 9, titulo: 'Nimda bate recorde de propagação',
    texto: 'Um worm que usa e-mail, compartilhamentos de rede e servidores web ao mesmo tempo. Defesa em profundidade deixa de ser papo de consultor.', servico: 'virus' },
  { ano: 2001, mes: 11, titulo: 'AES é oficializado',
    texto: 'O algoritmo Rijndael vira o padrão de criptografia simétrica dos Estados Unidos (FIPS 197). O DES pode se aposentar.' },
  { ano: 2003, mes: 1, titulo: 'SQL Slammer: dez minutos para dar a volta ao mundo',
    texto: 'Um worm de 376 bytes em um único pacote UDP congestiona a Internet. A correção existia havia seis meses. De novo.', servico: 'servidor' },
];

export interface ItemLoja {
  id: string;
  nome: string;
  preco: number;
  desc: string;
  efeito: string;
  desdeAno: number;
  requer?: string;
}

export const LOJA: ItemLoja[] = [
  { id: 'cafeteira', nome: 'Cafeteira', preco: 120, desdeAno: 1995,
    desc: 'O verdadeiro motor da indústria de tecnologia.', efeito: 'Trabalho 8% mais rápido' },
  { id: 'cadeira', nome: 'Cadeira giratória', preco: 260, desdeAno: 1995,
    desc: 'Com rodinhas que giram, um luxo que o banquinho não oferecia.', efeito: 'Menos riscos surgem nos casos' },
  { id: 'planta', nome: 'Samambaia', preco: 45, desdeAno: 1995,
    desc: 'Sobrevive à sua rotina. É a única.', efeito: 'Garagem mais aconchegante' },
  { id: 'arranhador', nome: 'Arranhador', preco: 90, desdeAno: 1995,
    desc: 'Mais barato do que trocar o sofá de novo.', efeito: 'Um sachê de dica a mais por dia' },
  { id: 'monitor15', nome: 'Monitor de 15 polegadas', preco: 650, desdeAno: 1995,
    desc: 'Enxergar a linha inteira do log sem rolar a tela.', efeito: 'Trabalho 12% mais rápido' },
  { id: 'nobreak', nome: 'Nobreak', preco: 420, desdeAno: 1995,
    desc: 'Dez minutos de energia para salvar o arquivo e a sua reputação.', efeito: 'Ferramenta para blindagem de servidores' },
  { id: 'switch', nome: 'Switch de 8 portas', preco: 980, desdeAno: 1995,
    desc: 'Aposenta o hub. Cada porta vira um domínio de colisão, e o tráfego dos outros deixa de passar pela sua placa.', efeito: 'Ferramenta para serviços de rede', requer: 'equip3' },
  { id: 'modem56k', nome: 'Modem de 56k', preco: 380, desdeAno: 1997,
    desc: 'Quase o dobro da velocidade, o mesmo barulho.', efeito: 'Contratos novos aparecem com mais frequência' },
];

export const lojaPorId = (id: string): ItemLoja | undefined => LOJA.find((l) => l.id === id);

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
