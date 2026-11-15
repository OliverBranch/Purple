import type { CasoPratico } from './caso';
// Tipos compartilhados do núcleo. Nada aqui depende de Angular.

export type Formato = 'mcq' | 'ce' | 'ordem' | 'erro';

/** Um item de estudo. Todo desafio do jogo é um Item com uma roupagem. */
export interface Item {
  id: string;
  topico: string;
  formato: Formato;
  dif: 1 | 2 | 3;
  enunciado: string;
  /** mcq: alternativas · ordem: sequência na ordem correta · erro: linhas a inspecionar */
  opcoes: string[];
  /** mcq/erro: índice correto · ce: 1 = certo, 0 = errado · ordem: ignorado */
  correta: number;
  explicacao: string;
  ref: string;
}

export interface Topico {
  id: string;
  nome: string;
  bloco: string;
  ato: number;
  resumo: string;
}

export interface EstadoItem {
  caixa: number; // 0 = nunca visto
  vence: number; // dia (epoch) da próxima revisão
  vistos: number;
  acertos: number;
  errouAntes: boolean;
}

export interface RegistroErro {
  itemId: string;
  dia: number;
  resolvido: boolean;
}

export interface EstadoEstudo {
  v: 1;
  itens: { [id: string]: EstadoItem };
  caderno: RegistroErro[];
  sequencia: number;
  sacheDia: number;
  sachesUsados: number;
  revisaoDia: number; // último dia em que a revisão matinal foi feita
  totalRespondidos: number;
  totalAcertos: number;
}

export type Faixa = 'Novo' | 'Bronze' | 'Prata' | 'Ouro';

// ---------- aparência ----------

export interface Aparencia {
  pele: number;
  cabelo: number;
  corCabelo: number;
  barba: number;
  roupa: number; // estilo
  corRoupa: number;
  corCalca: number;
  acessorio: number;
}

export interface GatoDef {
  nome: string;
  pelagem: number;
  olhos: number;
  acessorio: number;
  corAcessorio: number;
  personalidade: number;
}

// ---------- simulação ----------

export interface ServicoModelo {
  id: string;
  nome: string;
  desc: string;
  topicos: string[];
  desdeAno: number;
}

export interface Cliente {
  nome: string;
  setor: string;
  contato: string;
}

export interface Contrato {
  id: number;
  cliente: Cliente;
  servico: string;
  briefing: string;
  valor: number;
  dif: 1 | 2 | 3;
  prazo: number; // semanas para entregar depois do aceite
  expira: number; // semana em que sai do mural
  emergencia: boolean;
  caso: CasoPratico;
}

export interface Caso {
  contrato: Contrato;
  inicio: number;
}

export interface Avaliacao {
  cliente: string;
  servico: string;
  qualidade: number;
  notas: number[];
  comentarios: string[];
  pagamento: number;
  rep: number;
  eixos: { correcao: number; laudo: number; raiz: number; eficiencia: number };
  horas: number;
  prazo: number;
  dicas: string[];
  verificou: boolean;
}

export interface Noticia {
  ano: number;
  mes: number;
  titulo: string;
  texto: string;
  servico?: string;
}

export interface EstadoJogo {
  v: 1;
  fundador: Aparencia;
  nomeFundador: string;
  origem: number;
  empresa: string;
  corMarca: number;
  gato: GatoDef;
  dinheiro: number;
  reputacao: number;
  insight: number;
  semana: number; // semanas desde jan/1995
  fracSemana: number;
  proxId: number;
  mural: Contrato[];
  caso: Caso | null;
  avaliacao: Avaliacao | null;
  concluidos: number;
  melhorNota: number;
  compras: string[];
  servicosAbertos: string[];
  arvore: string[];
  pesquisa: { no: string; prog: number; total: number; pronta: boolean } | null;
  reestudo: { [no: string]: number };
  pago: string[];
  retornos: { semana: number; cliente: string; servico: string }[];
  descobertas: { [chave: string]: number }; // `${servico}:${fase}:${i}` -> -1 | 0 | 1
  noticiasVistas: number;
  noticia: Noticia | null;
  emprestimo: boolean;
  falido: boolean;
  ato1Completo: boolean;
  tutorial: number;
}

export interface EventoSim {
  tipo: 'mes' | 'noticia' | 'contratoNovo' | 'riscoFix' | 'falencia' | 'emprestimo' | 'pesquisaPronta' | 'retorno';
  texto?: string;
  n?: number;
}
