import { Item, Topico } from '../core/tipos';

// Nós do edital disponíveis no Ato 1. Os demais atos acrescentam nós a esta lista.
export const TOPICOS: Topico[] = [
  { id: 'cia', nome: 'Fundamentos: CID e irretratabilidade', bloco: 'Fundamentos', ato: 1,
    resumo: 'Confidencialidade (só quem pode, vê), integridade (ninguém altera sem autorização), disponibilidade (está lá quando precisa) e irretratabilidade (o autor não consegue negar o que fez).' },
  { id: 'osi', nome: 'Modelo de referência OSI', bloco: 'Infraestrutura de redes', ato: 1,
    resumo: 'Sete camadas: Física, Enlace, Rede, Transporte, Sessão, Apresentação e Aplicação. PDUs: bits, quadros, pacotes e segmentos.' },
  { id: 'tcpip', nome: 'Arquitetura TCP/IP', bloco: 'Infraestrutura de redes', ato: 1,
    resumo: 'Quatro camadas (Acesso à rede, Internet, Transporte, Aplicação). TCP é confiável e orientado a conexão; UDP não. Portas bem conhecidas identificam serviços.' },
  { id: 'ipv4', nome: 'IPv4, endereçamento e CIDR', bloco: 'Infraestrutura de redes', ato: 1,
    resumo: 'Endereços de 32 bits. O prefixo CIDR (/n) define rede e hosts: 2^(32-n) endereços, menos rede e broadcast. Faixas privadas: 10/8, 172.16/12 e 192.168/16.' },
  { id: 'ipv6', nome: 'IPv6 e endereçamento', bloco: 'Infraestrutura de redes', ato: 1,
    resumo: 'Endereços de 128 bits em hexadecimal. Sem broadcast: usa multicast e anycast. Link-local em fe80::/10, loopback ::1, descoberta de vizinhos por ICMPv6.' },
  { id: 'equip', nome: 'Equipamentos de interconexão', bloco: 'Infraestrutura de redes', ato: 1,
    resumo: 'Repetidor e hub na camada física; bridge e switch na de enlace; roteador na de rede; gateway converte protocolos. Switch separa colisão, roteador separa broadcast.' },
  { id: 'malware', nome: 'Códigos maliciosos', bloco: 'Resposta a incidentes', ato: 1,
    resumo: 'Vírus precisa de hospedeiro e execução; worm se propaga sozinho pela rede; trojan finge ser legítimo; ransomware sequestra dados; rootkit se esconde; bot obedece a um controlador.' },
  { id: 'hard', nome: 'Hardening básico de sistemas', bloco: 'Hardening de servidores', ato: 1,
    resumo: 'Reduzir a superfície de ataque: desativar o que não se usa, aplicar correções, menor privilégio, senhas fortes, trocar protocolos em texto claro por versões cifradas.' },
];

export const topicoPorId = (id: string): Topico => TOPICOS.find((t) => t.id === id) ?? (TOPICOS[0] as Topico);

// Construtores compactos de itens.
export const q = (id: string, topico: string, dif: 1 | 2 | 3, enunciado: string, opcoes: string[], correta: number, explicacao: string, ref: string): Item =>
  ({ id, topico, formato: 'mcq', dif, enunciado, opcoes, correta, explicacao, ref });
export const ce = (id: string, topico: string, dif: 1 | 2 | 3, enunciado: string, certo: boolean, explicacao: string, ref: string): Item =>
  ({ id, topico, formato: 'ce', dif, enunciado, opcoes: ['Certo', 'Errado'], correta: certo ? 1 : 0, explicacao, ref });
export const ord = (id: string, topico: string, dif: 1 | 2 | 3, enunciado: string, sequencia: string[], explicacao: string, ref: string): Item =>
  ({ id, topico, formato: 'ordem', dif, enunciado, opcoes: sequencia, correta: 0, explicacao, ref });
export const err = (id: string, topico: string, dif: 1 | 2 | 3, enunciado: string, linhas: string[], correta: number, explicacao: string, ref: string): Item =>
  ({ id, topico, formato: 'erro', dif, enunciado, opcoes: linhas, correta, explicacao, ref });
