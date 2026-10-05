import { describe, expect, it, vi } from 'vitest';
import { CreatorsApiAuthClient } from '../src/amazon/creators-api/CreatorsApiAuthClient.js';
import { CreatorsApiClient, classifyCreatorsApiResponse } from '../src/amazon/creators-api/CreatorsApiClient.js';

function response(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Creators API classification', () => {
  it('classifies AssociateNotEligible as eligibility, not a bot failure', () => {
    expect(classifyCreatorsApiResponse(403,{reason:'AssociateNotEligible'}).status).toBe('ASSOCIATE_NOT_ELIGIBLE');
  });
  it('classifies partner tag, associate, auth and rate-limit errors', () => {
    expect(classifyCreatorsApiResponse(400,{reason:'InvalidPartnerTag'}).status).toBe('INVALID_PARTNER_TAG');
    expect(classifyCreatorsApiResponse(400,{reason:'InvalidAssociate'}).status).toBe('INVALID_ASSOCIATE');
    expect(classifyCreatorsApiResponse(401,{}).status).toBe('AUTHENTICATION_FAILED');
    expect(classifyCreatorsApiResponse(429,{}).status).toBe('RATE_LIMITED');
  });
});

describe('Creators API safe diagnostic', () => {
  it('uses EU v3.2 OAuth and SearchItems without exposing credentials', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(200,{access_token:'secret-token',expires_in:3600}))
      .mockResolvedValueOnce(response(200,{searchResult:{items:[{asin:'B0ABCDEF12',itemInfo:{title:{displayValue:'Mouse'}}}]}}));
    const auth = new CreatorsApiAuthClient('client-id','client-secret','3.2',fetcher as any);
    const result = await new CreatorsApiClient(auth,fetcher as any).testSearchItems('example-21');
    expect(result.status).toBe('ACCESS_OK');
    expect(result.products?.[0]?.title).toBe('Mouse');
    expect(String(fetcher.mock.calls[0][0])).toContain('api.amazon.co.uk/auth/o2/token');
    expect(String(fetcher.mock.calls[1][0])).toBe('https://creatorsapi.amazon/catalog/v1/searchItems');
    const productRequest = fetcher.mock.calls[1][1];
    expect(productRequest.headers['x-marketplace']).toBe('www.amazon.de');
    const body = JSON.parse(productRequest.body);
    expect(body.partnerTag).toBe('example-21');
    expect(body.marketplace).toBe('www.amazon.de');
  });
  it('returns authentication failed when OAuth rejects credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(401,{error:'invalid_client'}));
    const result = await new CreatorsApiClient(new CreatorsApiAuthClient('x','y','3.2',fetcher as any),fetcher as any).testSearchItems('example-21');
    expect(result.status).toBe('AUTHENTICATION_FAILED');
  });
});
