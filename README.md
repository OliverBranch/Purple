# Purple

Tycoon em pixel art sobre uma empresa de segurança da informação que começa numa garagem em 1995. O estudo é a mecânica: cada atendimento é um incidente ao vivo em que só a decisão tecnicamente certa salva o cliente, e cada decisão está amarrada a um conceito do edital (Analista de TI · Segurança da Informação, estilo FCC).

Versão **0.2**, Ato 1 (a garagem).

## Novidades da 0.2

- **Atendimento ao vivo no mapa do cliente.** O escritório aparece de cima, com mesas, funcionários, hub, modem, servidor e cabos. O relógio corre (com pausa e três velocidades) e a ameaça evolui enquanto você trabalha. O técnico anda até a máquina e executa a ferramenta ou a ação escolhida, que custa horas da visita.
- **Cinco modos, um por serviço:**
  - **Limpeza de vírus:** seis famílias reais (worm, vírus de macro, cavalo de Troia com backdoor, keylogger, vírus de boot e ransomware), cada uma se espalha e causa dano de um jeito. O worm pula de micro em micro pelo hub, o ransomware cifra os arquivos até 100%, o keylogger vaza senhas enquanto houver Internet. Só a ação certa resolve: macro se trata no NORMAL.DOT, boot com disco limpo e FDISK /MBR, worm com isolamento e correções, keylogger com limpeza antes da troca de senhas. Antivírus por assinatura não vê variante nova. Pagar o resgate é sempre um erro.
  - **Blindagem de servidor:** defesa em tempo real. Os ataques chegam pela Internet, cada um numa porta, e você descobre o que está aberto, fecha o desnecessário, troca o Telnet pelo SSH, fecha o relay, aplica patches e configura o bloqueio de conta, sem derrubar o que o cliente usa.
  - **Montagem de rede:** vagas para hub, switch, bridge, repetidor e roteador, com orçamento. Colisões, broadcast, alcance de 100 m e NAT aparecem nos pacotes que correm pelos cabos.
  - **Plano de endereçamento:** VLSM de verdade. Endereço desalinhado, sub-rede pequena ou sobreposta é recusado com a explicação. No meio da visita o DHCP cai (169.254 = APIPA) e a Internet precisa de NAT.
  - **Diagnóstico de segurança:** vistoria com hora para acabar. Você escolhe o que inspecionar, classifica cada achado (ameaça ou vulnerabilidade, pilar da CID, nível de risco) e às vezes vê o risco se materializar na sua frente.
- **O cliente pergunta** no meio do trabalho: questões da banca sobre o tema do atendimento, que pausam o relógio e mexem na paciência dele.
- **Laudo técnico** no fim, com perguntas que dependem do que aconteceu (que praga era, por onde entrou, quantos domínios de colisão a sua rede tem, qual o broadcast da sub-rede que você configurou).
- **Lições** de cada decisão, certa ou errada, com o tema para revisar. Elas alimentam a revisão espaçada e o Caderno de Erros.
- **Avaliação em estrelas** e **carteira de suporte mensal:** atendimento de 4 estrelas rende proposta de contrato mensal; o cliente da carteira liga com emergência e espera você em até duas semanas.
- **Arte:** escritórios dos clientes desenhados por código, funcionários sentados, técnico e gato no mapa, partículas, anéis, tremor de tela, luz de fim de tarde quando a visita atrasa. Na garagem: quadro branco com conceitos do edital, bancada de conserto, poeira no feixe de luz, telefone que toca em emergência, vinheta.

## Como rodar

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm start
```

Abra http://localhost:4200. Para gerar a versão de produção: `npm run build` (sai em `dist/purple/browser`).

## O que já funciona

- Criação do fundador (pele, cabelo, barba, roupa, calça, acessório, origem), da empresa (nome e cor da marca) e do gato (pelagem, olhos, acessório, personalidade).
- Garagem animada em pixel art: ciclo de dia e noite, luz das telas e da luminária, gato com personalidade (dorme, anda, segue você, vai aos potes), clique no gato para miar ou ronronar.
- Mural de chamados com clientes fictícios dos anos 90, cada um com o problema descrito do jeito leigo.
- Cada decisão do atendimento está ligada a um conceito do edital: alimenta a revisão espaçada e o Caderno de Erros na forma da banca.
- Academia, revisão e provas da árvore com 4 formatos de questão: múltipla escolha (5 alternativas), certo ou errado, ordenação e achar a linha errada num log ou configuração.
- Motor de estudo com revisão espaçada em dias reais (1, 3, 7, 16, 35, 75), maestria por tópico (Novo, Bronze, Prata, Ouro), itens enferrujados, Caderno de Erros, revisão do dia com bônus, Academia e sachês de dica (o gato derruba uma alternativa errada).
- Árvore de Tecnologia no estilo Path of Exile: 88 nós em 8 ramos (um por tema), com pontes, anel externo, notáveis e pedras angulares. Cada nó está ligado a questões específicas do edital. Pesquisar custa Insight e semanas de jogo (como no Game Dev Tycoon); no fim, uma prova de conceito confirma que você sabe. Errou? Reestudo de 2 semanas, sem pagar de novo. Os nós liberam serviços, ferramentas de investigação (antivírus heurístico, varredura de portas, analisador de pacotes) e itens da loja, além de bônus.
- Linha do tempo real de 1995 a 2003 (SATAN, SSH, Windows 95, Melissa, ILOVEYOU, Code Red, Slammer...), que muda a demanda do mercado.
- Loja de equipamentos, economia mensal, empréstimo e falência.
- Meta do Ato 1 e simulado de certificação com 20 questões.
- Trilha e efeitos sonoros sintetizados com Web Audio. Toda a arte é gerada por código.
- Save automático no navegador, backup por texto para levar a outra máquina.

## Estrutura

```
src/app/
  core/       simulação, motor de incidente em tempo real (incidente.ts) e motor de estudo, TypeScript puro
  conteudo/   tópicos, questões, serviços, árvore, clientes, notícias, loja
  conteudo/incidentes/  regras e geradores de cada modo: virus, servidor, rede, enderecos, diagnostico
  arte/       pixel art gerada por código: personagens, gatos, garagem, escritório do cliente, ícones
  audio/      sintetizador de efeitos e trilha
  ui/         componentes Angular (cena, criação, tela do jogo, desafio)
  jogo.service.ts   cola entre simulação, estudo e interface
```

Para acrescentar questões, edite `src/app/conteudo/itens-a.ts` e `itens-b.ts`. Para criar um modo de atendimento novo, implemente as `Regras` de `core/incidente.ts` seguindo `src/app/conteudo/incidentes/virus.ts`. Cada item tem tópico, formato, dificuldade, explicação e referência.

No console do navegador, `purple` dá acesso ao serviço do jogo (útil para testar: `purple.velocidade.set(4)`).

## Próximos passos (Fase 2)

Sala comercial, contratação com entrevista técnica (cada técnico contratado executa ações em paralelo no mapa), playbooks que deixam a equipe resolver casos sozinha, modo construção e os nós do Ato 2 do edital.
