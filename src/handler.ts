import { TokenProvider } from './token'
import { Backend } from './backend'
import { AppError } from '.'

const DOCKERHUB_HOST: string = "https://registry-1.docker.io"

// Docker Registry HTTP v2 API
// urlpath starts with /v2/
export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method! in ['GET', 'HEAD', 'OPTIONS']) {
    throw new AppError(`Only read method is allowed`, 405)
  }

  const upstreamUrl = new URL(request.url)
  const upstreamVal = upstreamUrl.searchParams.get("upstream") || DOCKERHUB_HOST;
  upstreamUrl.searchParams.delete("upstream")
  if (upstreamVal.includes("://")) {
    const providedUrl = new URL(upstreamVal)
    upstreamUrl.protocol = providedUrl.protocol
    upstreamUrl.host = providedUrl.host
    upstreamUrl.port = providedUrl.port
  } else if (upstreamVal.match(/^[^/]+$/)) {
    upstreamUrl.protocol = "https:"
    upstreamUrl.host = upstreamVal
    upstreamUrl.port = "443"
  } else {
    throw new AppError(`Invalid upstream ${upstreamVal}, expect a domain`, 400)
  }
  
  const upstreamReq = new Request(upstreamUrl.toString(), request)
  upstreamReq.headers.set('Host', upstreamVal)

  console.log(upstreamReq.url)
  const tokenProvider = new TokenProvider(env, ctx)
  const backend = new Backend(tokenProvider)
  return backend.proxy(upstreamReq)
}
