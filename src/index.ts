import { handleRequest as handleDockerRegistryHttpV2Api } from './handler'

// 自定义异常类
export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/v2/")) {
      return new Response('Site is up and running, Docker Registry HTTP v2 API is located at /v2/', { status: 200 })
    }

    try {
      return handleDockerRegistryHttpV2Api(request, env, ctx)
    } catch (error) {
      if (error instanceof AppError) {
        return new Response(error.message, { status: error.statusCode })
      }
      return new Response('Internal Server Error', { status: 500 })
    }
  }
} satisfies ExportedHandler;
