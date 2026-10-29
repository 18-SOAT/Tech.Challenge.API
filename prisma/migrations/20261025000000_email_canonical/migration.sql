-- E-mail canônico (#46): o login passa a ser único pela forma canônica do e-mail,
-- para aliases da mesma caixa (pontos e +tag no Gmail, googlemail.com...) não virarem
-- contas diferentes. O `email` continua sendo o digitado, usado no envio.
-- O backfill repete a regra de `Email.canonical` (src/shared/domain/value-objects/email.vo.ts).

-- 1. Coluna nullable, para o backfill rodar em tabela com dados.
ALTER TABLE "users" ADD COLUMN "email_canonical" TEXT;

-- 2. Backfill, na mesma ordem do VO: minúsculas → alias de domínio → +tag → pontos.
UPDATE "users" SET "email_canonical" = lower(trim("email"));

UPDATE "users"
SET "email_canonical" = regexp_replace("email_canonical", '@googlemail\.com$', '@gmail.com');

UPDATE "users"
SET "email_canonical" = regexp_replace("email_canonical", '\+[^@]*@', '@')
WHERE split_part("email_canonical", '@', 2) IN (
  'gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'pm.me',
  'fastmail.com'
);

UPDATE "users"
SET "email_canonical" = replace(split_part("email_canonical", '@', 1), '.', '') || '@gmail.com'
WHERE split_part("email_canonical", '@', 2) = 'gmail.com';

-- 3. Contas que já são aliases umas das outras: falha explícita, em vez de escolher
-- uma conta em silêncio. Resolver à mão (desativar/mesclar) e rodar de novo.
DO $$
DECLARE
  duplicated TEXT;
BEGIN
  SELECT string_agg("email_canonical", ', ') INTO duplicated
  FROM (
    SELECT "email_canonical" FROM "users"
    GROUP BY "email_canonical" HAVING count(*) > 1
  ) AS d;

  IF duplicated IS NOT NULL THEN
    RAISE EXCEPTION 'Logins duplicados pelo e-mail canônico: %. Resolva antes de aplicar a migration.', duplicated;
  END IF;
END $$;

-- 4. A unicidade passa para a forma canônica (uma barreira só, não duas).
ALTER TABLE "users" ALTER COLUMN "email_canonical" SET NOT NULL;

CREATE UNIQUE INDEX "users_email_canonical_key" ON "users"("email_canonical");

-- 5. O e-mail digitado deixa de ser único: dois aliases já são barrados pelo índice acima.
DROP INDEX "users_email_key";
