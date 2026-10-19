export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message = 'Não foi possível acessar o serviço local. Verifique o DemoHost e tente novamente.') {
    super(message)
    this.status = status
  }
}

/** Only 401/404 are absence; transport/server failures must reach the UI. */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, { ...init, credentials: 'include', signal: init.signal ?? AbortSignal.timeout(10000) })
  } catch { throw new ApiError(0) }
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    throw new ApiError(response.status, response.status === 400 ? 'Confira os dados informados e tente novamente.' : undefined)
  }
  return response
}
