import type {
  AccessLinkPayload,
  AccessLinkTokenService,
} from '../../src/shared/infrastructure/jwt/access-link-token.port.js';

// "Token" = payload em JSON base64, sem assinatura (mesma ideia do FakeTokenService).
// `expired = true` simula o link vencido: verify passa a lançar.
export class FakeAccessLinkTokenService implements AccessLinkTokenService {
  expired = false;

  async sign(payload: AccessLinkPayload): Promise<string> {
    return `link.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  }

  async verify(token: string): Promise<AccessLinkPayload> {
    const [prefix, body] = token.split('.');
    if (prefix !== 'link' || !body || this.expired) {
      throw new Error('invalid access link');
    }
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  }
}
