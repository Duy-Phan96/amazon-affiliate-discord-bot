import type { FetchLike } from './types.js';

const TOKEN_ENDPOINTS: Record<string, string> = {
  '3.1': 'https://api.amazon.com/auth/o2/token',
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  '3.3': 'https://api.amazon.co.jp/auth/o2/token',
};

export class CreatorsApiAuthenticationError extends Error {}

export class CreatorsApiAuthClient {
  private token?: { value: string; expiresAt: number };

  constructor(
    private clientId: string,
    private clientSecret: string,
    private credentialVersion = '3.2',
    private fetcher: FetchLike = fetch,
    private now = () => Date.now(),
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt - 30_000 > this.now()) return this.token.value;
    const endpoint = TOKEN_ENDPOINTS[this.credentialVersion];
    if (!endpoint) throw new CreatorsApiAuthenticationError('Unsupported Creators API credential version.');
    if (!this.clientId || !this.clientSecret) throw new CreatorsApiAuthenticationError('Creators API credentials are not configured.');

    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'creatorsapi::default',
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new CreatorsApiAuthenticationError('Creators API authentication request failed.');
    }
    if (!response.ok) throw new CreatorsApiAuthenticationError('Creators API authentication was rejected.');

    let body: any;
    try { body = await response.json(); } catch { throw new CreatorsApiAuthenticationError('Creators API authentication returned an invalid response.'); }
    if (typeof body?.access_token !== 'string' || !body.access_token) throw new CreatorsApiAuthenticationError('Creators API authentication returned no token.');
    const expiresIn = Number(body.expires_in) > 0 ? Number(body.expires_in) : 3600;
    this.token = { value: body.access_token, expiresAt: this.now() + expiresIn * 1000 };
    return this.token.value;
  }
}
