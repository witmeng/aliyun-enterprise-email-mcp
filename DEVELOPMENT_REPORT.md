# DEVELOPMENT_REPORT

## 状态

**实现：源码与测试文件已写入本空仓库。**  
**验证：未执行。** 本会话中 Shell（含 `node` / `npm install` / `build` / `test`）均返回 `Rejected`，子代理同样无法执行命令。因此 **不能声称** build / typecheck / tests / pack:smoke 已通过。

## 权限阻塞（请协调方批准后执行）

在本机使用 Node 24 后运行：

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
cd /Users/witmeng/Documents/github/mailsendermcp
node -v    # 期望 v24.19.0
npm install
npm run typecheck
npm test
npm run pack:smoke
```

未读取任何 `.env` / 凭据；未连接 SMTP；未 git commit/push；未改 shell 配置。

## 依赖选择

| 包 | 锁定版本 | 说明 |
|----|----------|------|
| `@modelcontextprotocol/sdk` | `1.32.2` | 用户指定；全程 v1 `McpServer.registerTool` + stdio |
| `nodemailer` | `10.6.1` | 用户指定 |
| `zod` | `4.6.7` | 用户指定；与 SDK peer `^3.25 \|\| ^4.0` 兼容 |
| `typescript` | `5.9.3` | 稳定 `tsc`；未用实验性 TS7/`tsgo`（用户 registry 提及 7.0.2，但本环境无法联网验证；脚本为 `tsc`） |
| `@types/node` | `24.10.1` | 配合 Node 24 |
| `@types/nodemailer` | `7.0.4` | 安装时若不适配可再调；`skipLibCheck` 已开 |
| `engines.node` | `>=24` | 按需求 |

无 dotenv；凭据仅 `SMTP_USER` / `SMTP_PASSWORD` 环境注入。

## 已实现要点

- 工具：`verify_smtp_connection`、`send_email`（中文说明强调完整草稿 + 人类明确批准；无假 confirm）
- 启动 / listTools 无凭据、不联网
- From = SMTP_USER；白名单失败关闭；生产需 `MAIL_PRODUCTION_SEND_OPT_IN=true`
- TLS 默认 465 隐式 + 校验证书；可选 STARTTLS；禁止关 TLS/证书校验
- 附件：`MAIL_ATTACHMENT_ROOT` + realpath/包含/禁 symlink；Buffer 交给 nodemailer；`disableFileAccess/UrlAccess`
- 错误脱敏；超时/网络 → uncertain + 勿自动重试；accepted ≠ 投递；无 IMAP 发件箱承诺
- DI mock 传输；测试护栏禁止 live SMTP；独立 `tests/fixtures/mock-stdio-server.ts`
- `files` 白名单可 `npm pack`；`.gitignore` 排除 `.env*`（保留 `.env.example`）

## 文件清单

```
.env.example
.gitignore
DEVELOPMENT_REPORT.md
README.md
package.json
tsconfig.json
scripts/package-smoke.mjs
src/index.ts
src/server.ts
src/constants.ts
src/config.ts
src/validation.ts
src/allowlist.ts
src/attachments.ts
src/errors.ts
src/types.ts
src/schemas/email.ts
src/smtp/types.ts
src/smtp/transport.ts
src/tools/verify_smtp_connection.ts
src/tools/send_email.ts
tests/validation.test.ts
tests/config.test.ts
tests/allowlist.test.ts
tests/attachments.test.ts
tests/limits.test.ts
tests/tools-unit.test.ts
tests/stdio-startup.test.ts
tests/stdio-mock-tools.test.ts
tests/helpers/mock-transport.ts
tests/fixtures/mock-stdio-server.ts
```

（`package-lock.json` / `node_modules` / `dist`：因未成功 `npm install` 尚不存在。）
