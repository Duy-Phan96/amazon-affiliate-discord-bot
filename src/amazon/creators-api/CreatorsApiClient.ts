import { CreatorsApiAuthenticationError, CreatorsApiAuthClient } from './CreatorsApiAuthClient.js';
import type { CreatorsApiTestResult, CreatorsProductSummary, FetchLike } from './types.js';

function safeReason(body: any): string | undefined {
  return typeof body?.reason === 'string' ? body.reason : undefined;
}

function classify(status: number, body: any, authenticationOk = true): CreatorsApiTestResult {
  const reason = safeReason(body);
  if (status === 403 && reason === 'AssociateNotEligible') return {
    status: 'ASSOCIATE_NOT_ELIGIBLE', authenticationOk,
    detail: 'Credentials authenticated, but the Associates account is not currently eligible for Creators API product access.',
  };
  if (status === 401) return { status: 'AUTHENTICATION_FAILED', authenticationOk: false };
  if (status === 400 && reason === 'InvalidPartnerTag') return { status: 'INVALID_PARTNER_TAG', authenticationOk };
  if (status === 400 && reason === 'InvalidAssociate') return { status: 'INVALID_ASSOCIATE', authenticationOk };
  if (status === 429) return { status: 'RATE_LIMITED', authenticationOk };
  return { status: 'API_ERROR', authenticationOk, detail: reason ? `Amazon reason: ${reason}` : undefined };
}

export class CreatorsApiClient {
  constructor(
    private auth: CreatorsApiAuthClient,
    private fetcher: FetchLike = fetch,
    private baseUrl = 'https://creatorsapi.amazon',
  ) {}

  async testSearchItems(partnerTag: string): Promise<CreatorsApiTestResult> {
    let token: string;
    try { token = await this.auth.getAccessToken(); }
    catch (error) {
      if (error instanceof CreatorsApiAuthenticationError) return { status: 'AUTHENTICATION_FAILED', authenticationOk: false, detail: error.message };
      return { status: 'AUTHENTICATION_FAILED', authenticationOk: false };
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/catalog/v1/searchItems`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-marketplace': 'www.amazon.de',
        },
        body: JSON.stringify({
          marketplace: 'www.amazon.de',
          partnerTag,
          searchIndex: 'All',
          keywords: 'gaming mouse',
          itemCount: 3,
          resources: ['images.primary.medium', 'itemInfo.title', 'offersV2.listings.price'],
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { status: 'API_ERROR', authenticationOk: true, detail: 'Product request failed before a response was received.' };
    }

    let body: any = {};
    try { body = await response.json(); } catch { /* classification can still use HTTP status */ }
    if (!response.ok) return classify(response.status, body, true);

    const items = Array.isArray(body?.searchResult?.items) ? body.searchResult.items : [];
    const products: CreatorsProductSummary[] = items.slice(0, 3).map((item: any) => {
      const price = item?.offersV2?.listings?.[0]?.price;
      return {
        asin: String(item?.asin ?? ''),
        title: typeof item?.itemInfo?.title?.displayValue === 'string' ? item.itemInfo.title.displayValue : undefined,
        price: typeof price?.amount === 'number' ? price.amount : undefined,
        currency: typeof price?.currency === 'string' ? price.currency : undefined,
      };
    }).filter((item: CreatorsProductSummary) => item.asin);

    return { status: 'ACCESS_OK', authenticationOk: true, products };
  }
}

export { classify as classifyCreatorsApiResponse };
