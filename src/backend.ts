import { TokenProvider, Token } from './token'

class Backend {

  constructor(private readonly tokenProvider: TokenProvider) { }

  async proxy(upstreamReq: Request): Promise<Response> {
    const urlpath = new URL(upstreamReq.url).pathname

    let response = await fetch(upstreamReq, { redirect: 'follow' })
    if (response.status !== 401) {
      return response
    }

    const authenticateStr = response.headers.get('Www-Authenticate')
    if (authenticateStr === null) {
      return response
    }

    const bearerToken = await this.tokenProvider.token(authenticateStr, urlpath)
    const withAuthReq = new Request(upstreamReq)
    withAuthReq.headers.set('Authorization', `Bearer ${bearerToken.token}`)
    return fetch(withAuthReq, { redirect: 'manual' })
  }
}

export { Backend }
