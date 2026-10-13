# OpenAPI (Swagger)

Pacote: `@elysia/openapi`. A UI (Scalar) fica em **`/openapi`** e o JSON do spec em **`/openapi/json`**.

O OpenAPI é gerado a partir **dos mesmos schemas TypeBox que validam a rota**. Não existe uma descrição paralela (decorators ou YAML à parte) que possa divergir do código: o que está documentado é o que é validado.

## Configuração (no `createApp`)

```typescript
openapi({
  documentation: {
    info: { title: 'Tech Challenge API — Oficina', version: pkg.version },
    tags: [{ name: 'Auth', description: 'Cadastro, login e usuário autenticado' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
})
```

- `version` vem do `package.json`, que é atualizado pelos Changesets. A versão da API documentada acompanha o versionamento do projeto.
- Toda tag usada num `index.ts` (`new Elysia({ tags: ['Auth'] })`) é declarada aqui, com descrição.

## Request: vem do schema da rota

`body`, `params`, `query` e `headers` declarados na rota aparecem automaticamente. Use `examples` e `description` nos campos do schema (ver [DTO](../patterns/dto.md)).

## Response: declare todos os status, inclusive os de erro

```typescript
response: {
  201: Envelope(UserResponseSchema),
  400: ApiError,
  409: ApiError,
},
detail: { summary: 'Cadastra um cliente com login' },
```

- **Sucesso** sempre embrulhado em `Envelope(...)`, porque é exatamente o que o `ok()` devolve (ver [Tratamento de erros](../patterns/error-handling.md#envelope-de-sucesso-ok)).
- **Erros nunca são inferidos.** TypeScript não tem checked exceptions, e o OpenAPI não sabe o que um Use Case pode lançar. Quem escreve o handler declara cada status de erro possível com base nos `DomainError`s que os use cases daquela rota lançam, mais o 400 de validação quando há body/params.
- **Um único `ApiError`** cobre todos os erros (`{ data: null, message, status }`). Só o status varia por rota.
- Para rota protegida, inclua o `401` (e o `403` se tiver role).

## Segurança (cadeado no Scalar)

O `.guard()` das rotas protegidas declara `detail: { security: [{ bearerAuth: [] }] }` junto do `auth: true` (ver [Autenticação](../patterns/auth.md)). Assim todas as rotas dentro do guard aparecem com cadeado, e o botão de autorizar do Scalar envia o Bearer.

## Checklist de rota nova

- [ ] `detail.summary` em português.
- [ ] Tag do módulo vindo do `index.ts`.
- [ ] `response` com o status de sucesso (`Envelope`) + todos os erros possíveis (`ApiError`).
- [ ] `security` herdado do guard, se protegida.
- [ ] Conferir em `/openapi` antes de abrir o PR.
