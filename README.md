# Purple

Tycoon em pixel art sobre uma empresa de segurança da informação que começa numa garagem em 1995. O estudo é a mecânica: cada momento-chave de um projeto é uma questão do edital (Analista de TI · Segurança da Informação, estilo FCC), e só acertando você junta o Insight que abre serviços novos.

Esta é a **Fase 1 (Ato 1: a garagem)** do documento de design.

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
- **Atendimentos práticos**, com o trabalho real de cada serviço:
  - **Investigação:** ferramentas com saída realista (lista de tarefas, inicialização, netstat, arquivos recentes, antivírus por assinatura e heurístico, setor de boot, /etc/passwd, logs, boletins do CERT, planta, inventário, winipcfg, vistoria). Você clica nas linhas suspeitas para marcar evidências e pergunta ao cliente. Cada ação gasta horas da visita.
  - **Resolução:** decisões técnicas reais (classificar a praga, a propriedade CID afetada, ordenar a intervenção, desligar serviços sem derrubar o que o cliente usa, remover contas, projetar a rede, contar domínios de colisão e broadcast, calcular sub-redes VLSM, diagnosticar winipcfg, abreviar IPv6, classificar ameaça x vulnerabilidade, priorizar risco).
  - **Verificação opcional** e **laudo** com afirmações certo/errado no estilo da banca.
  - **Avaliação** em 4 eixos (correção técnica, causa raiz, laudo, eficiência). Se a causa raiz ficar para trás sem verificação, o cliente liga de volta.
- Casos gerados por parâmetros: 6 famílias de praga reais (macro, worm, trojan com backdoor, keylogger, vírus de boot, ransomware), redes com requisitos sorteados e sub-redes com gabarito calculado.
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
  core/       simulação, motor de atendimento (caso.ts) e motor de estudo, TypeScript puro
  conteudo/   tópicos, questões, serviços, árvore, clientes, notícias, loja
  conteudo/casos/  geradores de atendimento: virus, rede, servidor, enderecos, diagnostico
  arte/       pixel art gerada por código: personagens, gatos, garagem, ícones
  audio/      sintetizador de efeitos e trilha
  ui/         componentes Angular (cena, criação, tela do jogo, desafio)
  jogo.service.ts   cola entre simulação, estudo e interface
```

Para acrescentar questões, edite `src/app/conteudo/itens-a.ts` e `itens-b.ts`. Para criar casos novos, siga o modelo de `src/app/conteudo/casos/virus.ts`. Cada item tem tópico, formato, dificuldade, explicação e referência.

No console do navegador, `purple` dá acesso ao serviço do jogo (útil para testar: `purple.velocidade.set(4)`).

## Próximos passos (Fase 2)

Sala comercial, contratação com entrevista técnica, playbooks que deixam a equipe resolver casos sozinha, contratos recorrentes, modo construção e os nós do Ato 2 do edital.
