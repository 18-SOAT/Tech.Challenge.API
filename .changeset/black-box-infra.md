---
"tech-challenge-api": patch
---

Testes black-box: `buildApp(env)` separa a montagem da app do `listen` do servidor, o seed exporta `seedDemoEmployees`, e a matriz de autorização passa a ser testada por HTTP contra Postgres e Mailpit reais (job novo no CI).
