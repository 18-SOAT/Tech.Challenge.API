---
"tech-challenge-api": patch
---

Corrida em campo único (placa, documento, SKU, nome do serviço) responde 409 em vez de 500: a violação de unique é reconhecida também pelo nome do índice que o driver adapter do pg devolve.
