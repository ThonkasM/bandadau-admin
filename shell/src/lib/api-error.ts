import { isProblem } from '@bandada/contracts-ts/problem';

/** Error de la capa REST: Problem Details (RFC 9457) normalizado. El texto se traduce por `code`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly traceId?: string;

  constructor(init: { status: number; code: string; title?: string; detail?: string; traceId?: string }) {
    super(init.title ?? init.code);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.traceId = init.traceId;
  }
}

export async function parseProblem(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (isProblem(body)) {
    return new ApiError({ status: res.status, code: body.code, title: body.title, detail: body.detail, traceId: body.traceId });
  }
  return new ApiError({ status: res.status, code: res.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR' });
}

export function networkError(): ApiError {
  return new ApiError({ status: 0, code: 'NETWORK_ERROR' });
}
