# docker-mirror-hammal

docker-mirror-hammal 是运行于 cloudflare workers 上的 Docker 镜像加速工具，用于解决获取 Docker 官方镜像无法正常访问的问题。

它同时也允许用户无需提供身份认证信息即可访问 Docker Registry API，代理程序会自动以公共匿名身份获取认证 token。

复刻源文档： <https://singee.atlassian.net/wiki/spaces/MAIN/pages/5079084/Cloudflare+Workers+Docker>

## 使用场景

本工具可用于多种目的

1. **Docker 镜像加速**

    通过将 Docker Registry API 请求代理到本服务，用户可以加速公共镜像获取速度。

    ```json
    {
      "registry-mirrors": [
        "https://docker-registry-skipauth.nilou.workers.dev"
      ]
    }
    ```

2. **公共镜像代理测速**

    [chsrc](https://github.com/RubyMetric/chsrc) 是一个全平台通用换源工具与框架，但目前 v0.2 仅支持静态测速链接，
    而大部分 Docker Registry 需要获取 Bearer Token 才能访问。

    使用本服务作为代理，可绕过动态认证过程，直接跳转到 blob 下载链接，进而实现镜像测速。

    向 Docker Registry HTTP v2 API 请求中添加 `upstream` 参数，指定上游源域名或URL，服务会尝试以公共身份完成认证并转发响应。
    对源端传来的重定向响应（307）会原样返回，实际下载不经过本服务。

    作为示例，这个 URL 会代理访问 `https://docker.m.daocloud.io/v2/library/alpine/manifests/latest`

    ```http
    https://docker-registry-skipauth.nilou.workers.dev/v2/library/alpine/manifests/latest?upstream=docker.m.daocloud.io
    ```

    > 受账户计划和账单限制，作者不保证此链接可用性，可以自行部署 Cloudflare Workers

## 安装和配置

按照以下步骤部署你的 Cloudflare Worker：

1. **克隆仓库**
   将项目克隆到本地，安装依赖：

   ```bash
   git clone https://github.com/enihsyou/docker-mirror-hammal.git
   cd docker-mirror-hammal
   bun install
   ```

2. **部署到 Cloudflare**
   使用 Wrangler 工具发布 Worker：

   ```bash
   bun run wrangler publish
   ```

## 开发和调试

当前版本的 `@cloudflare/vitest-pool-workers` 在 Windows 下无法打断点。
如果使用 Visual Studio Code 进行开发，建议在 Linux / macOS 下进行。

终端运行 `bun run wrangler dev` 在本地启动服务，Visual Studio Code 在端口号 9229 上 Attach to Node Process。

## Changes in this fork

- [x] Replace npm with bun.
- [x] Added and commented `wrangler.toml` for easier deployment.
- [x] Migrate from `@cloudflare/workers-types` to generated runtime types
- [x] Add `upstream` parameter to support `chsrc` speedtest.
