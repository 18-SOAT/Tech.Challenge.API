# DTO

Existem dois tipos de DTO sem relação entre si, que resolvem problemas diferentes. Os dois ficam em `presentation/dtos/`.

## Request schema: validação de formato na borda HTTP

No Elysia, o contrato de entrada é um **schema TypeBox** (`t`). Ele faz três coisas ao mesmo tempo:

1. **Valida em runtime** antes do handler rodar. Payload inválido recebe 400 e o handler nem executa.
2. **Gera o tipo TypeScript** do `body` no handler, sem precisar de uma classe paralela.
3. **Vira o schema do OpenAPI** automaticamente (ver [OpenAPI](../libs/openapi.md)).

```typescript
// modules/auth/presentation/dtos/register.dto.ts
import { t } from 'elysia';

export const RegisterRequestSchema = t.Object(
  {
    email: t.String({ format: 'email', error: 'E-mail inválido.', examples: ['joao@oficina.com'] }),
    password: t.String({
      minLength: 8,
      maxLength: 72,
      error: 'A senha deve ter entre 8 e 72 caracteres.',
      examples: ['senha-forte'],
    }),
    document: t.String({ format: 'cpf-cnpj', error: 'CPF/CNPJ inválido.', examples: ['529.982.247-25'] }),
    phone: t.String({ format: 'phone', error: 'Telefone inválido. Informe DDD + número.', examples: ['(11) 98765-4321'] }),
  },
  { additionalProperties: false },
);

export type RegisterRequest = typeof RegisterRequestSchema.static;
```

- **`error`**: a mensagem que vai para o `message` do envelope de erro. Sem ela, o cliente recebe uma mensagem técnica do TypeBox.
- **`additionalProperties: false`**: rejeita (400) campos que não estão no contrato, em vez de ignorá-los calado. Um campo inesperado no body costuma ser bug do cliente ou tentativa de mass assignment (ex: mandar `"type": "EMPLOYEE"` no cadastro).
- **`examples`**: aparece no OpenAPI.

### Formatos customizados: a mesma função pura do domínio

CPF/CNPJ e telefone são registrados uma vez como formatos do TypeBox, chamando **a mesma função pura** que o Value Object usa:

```typescript
// shared/presentation/http/formats.ts
import { FormatRegistry } from '@sinclair/typebox';
import { isValidDocument } from '../../../modules/customer/domain/validators/is-valid-document.js';

FormatRegistry.Set('cpf-cnpj', (value) => isValidDocument(value));
```

O `formats.ts` é importado uma vez no `app.ts`, antes de qualquer rota. Assim o algoritmo de dígito verificador existe num único lugar (`is-valid-document.ts`) e é chamado de dois pontos.

### Isso não substitui a validação do Value Object

O Value Object do domain (ver [Entity](entity.md)) continua validando o mesmo tipo de coisa. Isso não é duplicação desperdiçada, é defesa em profundidade em duas fronteiras diferentes:

- O schema TypeBox protege a **borda HTTP**.
- O Value Object protege o **invariante de domínio**, não importa por qual caminho a Entity seja construída (consumer de fila, script, outro Use Case). Nenhum desses passa pelo schema HTTP.

### Checagens de unicidade não pertencem a nenhum dos dois

"CPF já cadastrado" e "e-mail já em uso" exigem query no banco. Nem o schema (síncrono, por campo) nem o Value Object (precisa ser puro, sem I/O) conseguem fazer isso. Isso pertence ao Use Case, via Repository, antes de construir/persistir a Entity.

## Response DTO: sempre uma whitelist

```typescript
// modules/auth/presentation/dtos/user.response.dto.ts
export class UserResponseDto {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly type: UserType,
  ) {}

  static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto(user.idValue, user.emailValue, user.typeValue);
  }
}

export const UserResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  email: t.String({ format: 'email' }),
  type: t.Enum(UserType),
});
```

Copie explicitamente só os campos que são seguros para expor. **Nunca confie numa blacklist** como defesa principal: um campo sensível novo, adicionado depois, vaza silenciosamente se ninguém lembrar de colocá-lo na lista. A whitelist falha de forma segura: um campo esquecido só fica faltando na resposta, nunca vaza.

O `UserResponseSchema` ao lado do DTO é o **contrato documentado** da resposta. Ele entra no `response` da rota (dentro do `Envelope`) e é por ele que o OpenAPI mostra o formato real. O DTO (`fromEntity`) é quem garante a whitelist em código; o schema é quem documenta e valida a saída. Os dois precisam estar alinhados, e a validação de resposta do Elysia falha alto se não estiverem.

Listagens reusam o mesmo DTO via `.map(CustomerResponseDto.fromEntity)` e o schema via `t.Array(CustomerResponseSchema)`. Só crie outro formato quando o dado exposto realmente for diferente (ex: item de lista resumido vs. visão de detalhe).

### Respostas compostas / aninhadas

Quando uma listagem junta dados de vários aggregates (ex: `Vehicle` com seu `Customer`), componha um DTO de resposta dedicado. O `select` seletivo do Prisma (buscar só os campos necessários, excluindo `hashedPassword` de uma relação `user` aninhada) é uma otimização complementar e uma camada extra de defesa, mas nunca pode ser a *única* defesa, porque precisaria ser repetido corretamente em cada query. O DTO whitelist continua sendo o checkpoint obrigatório.

Compor dado aninhado para uma resposta é uma preocupação de apresentação. Isso não significa que a Entity `Vehicle` deva carregar um `Customer` completo: aggregates se referenciam por id.
