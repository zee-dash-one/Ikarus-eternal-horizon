export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message = 'Não foi possível conectar ao serviço. Verifique a conexão e tente novamente.') {
    super(message)
    this.status = status
  }
}

let apiBase = ''
let accessToken: (() => Promise<string | null>) | null = null
export function configureApi(base: string, token: () => Promise<string | null>): void {
  const url = new URL(base)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('A API de produção deve usar uma URL HTTPS.')
  apiBase = base.replace(/\/$/, '')
  accessToken = token
}
/** Only 401/404 are absence; transport/server failures must reach the UI. */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    const headers = new Headers(init.headers)
    if (accessToken) { const token = await accessToken(); if (token) headers.set('Authorization', `Bearer ${token}`) }
    response = await fetch(apiBase + path, { ...init, headers, credentials: accessToken ? 'omit' : 'include', signal: init.signal ?? AbortSignal.timeout(10000) })
  } catch { throw new ApiError(0) }
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    const body = await response.clone().json().catch(() => null) as { error?: string } | null
    const message = body?.error === 'expired_ticket' ? 'O prazo desta partida expirou. O resultado foi preservado, mas não pode mais entrar nos recordes.'
      : body?.error === 'account_changed' ? 'A conta mudou. Entre novamente para recuperar o resultado correto.'
      : body?.error === 'conflicting_submission' ? 'Este resultado diverge do já registrado. A cópia pendente foi preservada.'
      : response.status === 400 ? 'Confira os dados informados e tente novamente.' : undefined
    throw new ApiError(response.status, message)
  }
  return response
}
