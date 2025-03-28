import { AppError } from "."

interface WwwAuthenticate {
  realm: string
  service: string
  scope: string
}

export interface Token {
  token: string
  expires_in: number
}

function parseAuthenticateStr(authenticateStr: string): Map<string, string> {
  const bearer = authenticateStr.split(/\s+/, 2)
  if (bearer.length != 2 && bearer[0].toLowerCase() !== 'bearer') {
    throw new AppError(`Invalid Www-Authenticate ${authenticateStr}`, 401)
  }
  const params = bearer[1].split(',')
  const groups = new Map<string, string>()
  for (const param of params) {
    const kvPair = param.split('=', 2)
    if (kvPair.length === 2) {
      groups.set(kvPair[0], kvPair[1].replace(/^"|"$/g, ''))
    }
  }
  return groups
}

// 根据请求路径确定scope
// https://distribution.github.io/distribution/spec/auth/token/
function scopeFromRequestPath(urlpath: string): string {
  if (urlpath === '/v2/') {
    // 任意字符串都行
    return "any";
  }
  
  // 针对不同的API端点确定合适的scope
  // https://docs.docker.com/registry/spec/api/
  const readOnlyEndpoints = [
    new RegExp('^/v2/(?<repo>[^/]+(?:/[^/]+)*)/blobs/'),     // Get blob
    new RegExp('^/v2/(?<repo>[^/]+(?:/[^/]+)*)/manifests/'), // Get image manifest
    new RegExp('^/v2/(?<repo>[^/]+(?:/[^/]+)*)/tags/list$'), // List image tags
  ];

  // Check each pattern and extract repo name if matched
  for (const pattern of readOnlyEndpoints) {
    const match = pattern.exec(urlpath);
    if (match && match.groups?.repo) {
      return `repository:${match.groups.repo}:pull`;
    }
  }

  // 无法匹配到任何已知的API端点，随便给一个触发错误
  return "any";
}

export class TokenProvider {

  constructor(
    private readonly env: Env,
    private readonly ctx: ExecutionContext,
  ) { }

  private async authenticateCacheKey(wwwAuthenticate: WwwAuthenticate): Promise<string> {
    const keyStr = `${wwwAuthenticate.realm}/${wwwAuthenticate.service}/${wwwAuthenticate.scope}`
    const keyStrText = new TextEncoder().encode(keyStr)
    const digestArray = await crypto.subtle.digest({ name: 'SHA-256' }, keyStrText)
    const digestUint8Array = new Uint8Array(digestArray)
    let hexArray = []
    for (const num of digestUint8Array) {
      hexArray.push(num.toString(16))
    }
    const digestHex = hexArray.join('')
    return `token/${digestHex}`
  }

  private async tokenFromCache(cacheKey: string): Promise<Token | null> {
    const value = await this.env.HAMMAL_CACHE.get(cacheKey)
    if (value === null) {
      return null
    }
    return JSON.parse(value)
  }

  private async tokenIntoCache(cacheKey: string, token: Token) {
    const fallbackTTL = 300 // 5 min
    await this.env.HAMMAL_CACHE.put(cacheKey, JSON.stringify(token), {
      expirationTtl: token.expires_in || fallbackTTL,
    })
  }

  private async tokenFromRemote(wwwAuthenticate: WwwAuthenticate): Promise<Token> {
    const url = new URL(wwwAuthenticate.realm)
    if (wwwAuthenticate.service.length) {
      url.searchParams.set('service', wwwAuthenticate.service)
    }
    if (wwwAuthenticate.scope.length) {
      url.searchParams.set('scope', wwwAuthenticate.scope)
    }

    const response = await fetch(url.toString(), { method: 'GET', headers: {} })
    if (response.status !== 200) {
      const text = await response.text()
      throw new AppError(`Failed to fetch token: ${text}`, response.status)
    }
    const body = await response.json<any>()
    return { token: body.token, expires_in: body.expires_in }
  }

  async token(authenticateStr: string, urlpath: string): Promise<Token> {
    const authParams = parseAuthenticateStr(authenticateStr)
    const authObject: WwwAuthenticate = {
      realm: authParams.get('realm') || '',
      service: authParams.get('service') || '',
      scope: authParams.get('scope') || scopeFromRequestPath(urlpath),
    }
    if (Object.values(authObject).some(value => value.length === 0)) {
      throw new AppError('Missing authenticate parameters', 401)
    }

    const cacheKey = await this.authenticateCacheKey(authObject)
    const cachedToken: Token | null = await this.tokenFromCache(cacheKey)
    if (cachedToken !== null) {
      return cachedToken
    }
    const token = await this.tokenFromRemote(authObject)
    this.ctx.waitUntil(this.tokenIntoCache(cacheKey, token))
    return token
  }
}
