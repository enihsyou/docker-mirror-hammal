# hammal

Hammal 是运行于 cloudflare workers 上的 Docker 镜像加速工具，用于解决获取 Docker 官方镜像无法正常访问的问题。

文档： https://singee.atlassian.net/wiki/spaces/MAIN/pages/5079084/Cloudflare+Workers+Docker 

# Changes in this fork

- [x] Replace npm with bun.
- [x] Added and commented `wrangler.toml` for easier deployment.
- [ ] Removed `token.ts` to reduce dependencies on KV binding, as I only use the public registry.
