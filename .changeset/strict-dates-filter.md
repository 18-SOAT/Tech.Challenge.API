---
"tech-challenge-api": patch
---

Filtros de data das consultas de OS aceitam só ISO 8601 com hora e fuso (ex: 2026-10-01T00:00:00Z); `01/10/2026` e `2026-10-01` passam a responder 400.
