// Payload do link de acesso (finalidade "definir senha"). Union discriminada por
// `kind`: primeiro acesso aponta pro Customer (ainda sem User); redefinição aponta
// pro User e carrega o carimbo da senha atual — trocou a senha, o link morre.
export type AccessLinkPayload =
  | { kind: 'first-access'; customerId: string }
  | { kind: 'password-reset'; userId: string; passwordStamp: string };

// Separado do TokenService de sessão: cada um assina com sua audiência (`aud`), então
// um link de e-mail nunca vale como Bearer e um Bearer nunca vale como link.
export interface AccessLinkTokenService {
  sign(payload: AccessLinkPayload): Promise<string>;
  // Lança se o token for inválido, expirado ou de outra finalidade.
  verify(token: string): Promise<AccessLinkPayload>;
}
