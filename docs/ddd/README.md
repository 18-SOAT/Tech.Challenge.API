# Documentação DDD

Modelagem do **Sistema Integrado de Atendimento e Execução de Serviços** da oficina, na ordem em que foi construída:

1. a história de como a oficina trabalha (Domain Storytelling);
2. os eventos do domínio (Event Storming);
3. o desenho estratégico (subdomínios e contextos);
4. o tático (agregados e estados).

Os nomes vêm da [**Linguagem Ubíqua**](linguagem-ubiqua.md), que também traz o glossário, as entidades, os objetos de valor, os eventos no código e a relação de cada elemento com o arquivo em `src/`.

| Documento | Conteúdo | PDF |
|---|---|---|
| [Linguagem Ubíqua](linguagem-ubiqua.md) | Glossário, atores, bounded contexts, agregados, entidades, VOs, eventos, regras e relação com o código | — |
| [Domain Storytelling](domain-storytelling.md) | Histórias As-Is e To-Be na linguagem pictográfica + Antes × Depois | [diagramas.pdf](diagramas.pdf) (págs. 1–6) |
| Event Storming | Criação da OS, acompanhamento da OS, peças e insumos, acesso e equipe | [event-storming.pdf](event-storming.pdf) |
| Diagramas | Subdomínios, context map, agregados, máquinas de estado | [diagramas.pdf](diagramas.pdf) (págs. 7–10) |

## 1. Domain Storytelling

Como a oficina trabalha **hoje** (As-Is, com papel e telefone) e **com o sistema** (To-Be). As frases numeradas e as dores de cada passo estão em [domain-storytelling.md](domain-storytelling.md).

### As-Is

![As-Is 1 · Chegada e orçamento](domain-storytelling/as-is-1-chegada-orcamento.svg)
![As-Is 2 · Execução e estoque](domain-storytelling/as-is-2-execucao-estoque.svg)
![As-Is 3 · Entrega](domain-storytelling/as-is-3-entrega.svg)

### To-Be

![To-Be 1 · Criação da OS](domain-storytelling/to-be-1-criacao-os.svg)
![To-Be 2 · Acompanhamento](domain-storytelling/to-be-2-acompanhamento.svg)
![To-Be 3 · Peças e insumos](domain-storytelling/to-be-3-pecas-insumos.svg)

## 2. Event Storming

As tabelas equivalentes, em texto, estão em [Linguagem Ubíqua → Event Storming em texto](linguagem-ubiqua.md#event-storming-em-texto).

![Legenda](event-storming/1-legenda.svg)
![Criação da OS](event-storming/2-criacao-os.svg)
![Acompanhamento da OS](event-storming/3-acompanhamento-os.svg)
![Peças e insumos](event-storming/4-pecas-insumos.svg)
![Acesso e equipe](event-storming/5-acesso-equipe.svg)

## 3. Subdomínios e Context Map

![Subdomínios](diagramas/1-subdominios.svg)
![Context Map](diagramas/2-context-map.svg)

## 4. Agregados e máquinas de estado

![Agregados](diagramas/3-agregados.svg)
![Máquinas de estado](diagramas/4-maquinas-estado.svg)

O modelo de dados (Prisma) está em [`../diagrams/database.svg`](../diagrams/database.svg).

## Como editar

As **fontes** são os arquivos `.drawio` e `.egn`. Os `.svg` e `.pdf` são **exportações**: nunca edite um SVG direto, edite a fonte e exporte de novo.

| Fonte | Ferramenta | Exportar |
|---|---|---|
| `event-storming.drawio`, `diagramas.drawio` | VS Code com a extensão [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio), ou [app.diagrams.net](https://app.diagrams.net) | Uma página por SVG em `event-storming/` e `diagramas/`; PDF com todas as páginas |
| `domain-storytelling/*.egn` | VS Code com a extensão **Egon.io — The Domain Story Modeler** (Miragon), ou [egon.io](https://egon.io) | SVG com o mesmo nome, ao lado do `.egn` |

Os PDFs podem ser gerados pela linha de comando com o [draw.io desktop](https://github.com/jgraph/drawio-desktop/releases):

```bash
drawio -x -f pdf -a --crop -o docs/ddd/event-storming.pdf docs/ddd/event-storming.drawio
drawio -x -f pdf -a --crop -o /tmp/diagramas.pdf docs/ddd/diagramas.drawio
```

O `diagramas.pdf` é a junção das 6 histórias do Domain Storytelling com as 4 páginas do `diagramas.drawio`, nessa ordem (`pdfunite`).
