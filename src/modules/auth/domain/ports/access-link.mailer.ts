// E-mails do link de acesso, um método por tipo (padrão catalog). O use case só
// conhece este contrato; texto, URL e SMTP ficam no adapter (infrastructure/mailers).
export interface AccessLinkMailer {
  sendFirstAccessLink(params: {
    to: string;
    customerName: string | null;
    token: string;
  }): Promise<void>;
  sendPasswordResetLink(params: { to: string; token: string }): Promise<void>;
}
