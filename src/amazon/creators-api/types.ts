export type CreatorsApiTestStatus =
  | 'ACCESS_OK'
  | 'ASSOCIATE_NOT_ELIGIBLE'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_PARTNER_TAG'
  | 'INVALID_ASSOCIATE'
  | 'RATE_LIMITED'
  | 'API_ERROR';

export interface CreatorsProductSummary {
  asin: string;
  title?: string;
  price?: number;
  currency?: string;
}

export interface CreatorsApiTestResult {
  status: CreatorsApiTestStatus;
  authenticationOk: boolean;
  products?: CreatorsProductSummary[];
  detail?: string;
}

export interface FetchLike {
  (input: string | URL, init?: RequestInit): Promise<Response>;
}
