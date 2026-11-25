# aliyun-enterprise-email-mcp

面向阿里云企业邮的 **仅发送（SMTP）** MCP 服务器（TypeScript / Node.js ≥ 24）。通过 stdio 向宿主暴露两个工具：`verify_smtp_connection`、`send_email`。

## 功能概览

| 工具 | 作用 |
|------|------|
| `verify_smtp_connection` | 仅验证 SMTP 认证与 TLS；**不发送邮件** |
| `send_email` | 经 SMTP **真实外发**；From 固定为 `SMTP_USER` |

**明确不承诺：**

- `accepted` ≠ 最终投递成功
- SMTP verify ≠ 投递
- SMTP-only **不会** 通过 IMAP 写入「已发送」文件夹
- 超时 / 网络 / 未知错误时结果可能 **不确定** —— **请勿自动重试**

## 环境要求

- **Node.js ≥ 24**（本机已有示例路径：`~/.nvm/versions/node/v24.19.0`；仅适用于当前 Mac 上的该安装）
- 不自动加载 dotenv；凭据仅通过环境变量注入

### 在本机选用 Node 24（nvm）

```bash
export NVM_DIR="$HOME/.nvm"
# shellcheck 可忽略：由 nvm 提供
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24.19.0
node -v   # 应显示 v24.x
```

## 安装与构建

```bash
cd /path/to/mailsendermcp
npm ci          # 或首次：npm install（会生成/更新 package-lock.json）
npm run build
npm run typecheck
npm test
```

可选打包冒烟（本地临时目录安装 `.tgz`，**无 SMTP 机密、无真实 SMTP**）：

```bash
npm run pack:smoke
```

## 环境变量

见 [`.env.example`](./.env.example)。关键项：

| 变量 | 说明 |
|------|------|
| `SMTP_USER` / `SMTP_PASSWORD` | 调用 verify/send 时必需；**启动与 listTools 不需要** |
| `SMTP_HOST` | 默认 `smtp.qiye.aliyun.com`（须为合法 DNS 主机名） |
| `SMTP_PORT` | 默认 `465` |
| `SMTP_TLS_MODE` | `implicit`（默认，隐式 TLS）或 `starttls`（如 587；`requireTLS`，**仍校验证书**） |
| `MAIL_RECIPIENT_ALLOWLIST` | 逗号分隔允许收件人；**默认失败关闭**，未配置则拒绝发送 |
| `MAIL_PRODUCTION_SEND_OPT_IN` | `NODE_ENV=production` 时必须为 `true` 才允许发送（**不能替代**人类批准） |
| `MAIL_SIGNATURE_HTML` / `MAIL_SIGNATURE_TEXT` | 可选。每次 `send_email` 自动附在正文末尾；图片用公开 https 地址。正文已含同一签名或同一图片地址时不重复追加 |
| `MAIL_ATTACHMENT_ROOT` | 附件可读根目录；未配置则禁止附件 |
| `SMTP_*_TIMEOUT_MS` | 连接 / greeting / socket / 发送超时 |

**安全硬性规则：**

- 永不关闭 TLS，永不设置 `rejectUnauthorized: false`
- 从不打印密钥或可能回显凭据的完整 SMTP 错误
- From **固定** `SMTP_USER`，调用方不可覆盖
- 附件：仅 `MAIL_ATTACHMENT_ROOT` 下常规文件，`realpath` 约束，禁止符号链接逃逸；读入 **Buffer** 交给 nodemailer；传输层 `disableFileAccess` / `disableUrlAccess`
- 无 SMTP 自动重试

## 人类批准（宿主责任）

`send_email` 的中文描述要求：宿主必须先向人类展示 **完整草稿**，并获得 **明确批准** 后才能调用。

- **没有**「confirm: true」之类布尔参数可冒充批准
- `MAIL_PRODUCTION_SEND_OPT_IN` **不是**用户批准的替代品

## 本地 MCP（stdio）配置示例

将下列片段并入 Cursor / Claude Desktop 等 MCP 配置（路径按本机修改）：

```json
{
  "mcpServers": {
    "aliyun-enterprise-email": {
      "command": "/Users/YOU/.nvm/versions/node/v24.19.0/bin/node",
      "args": ["/ABSOLUTE/PATH/mailsendermcp/dist/src/index.js"],
      "env": {
        "SMTP_USER": "you@company.com",
        "SMTP_PASSWORD": "注入而非写入仓库",
        "MAIL_RECIPIENT_ALLOWLIST": "you@company.com",
        "MAIL_ATTACHMENT_ROOT": "/ABSOLUTE/allowed/attachments"
      }
    }
  }
}
```

使用打包产物：

```bash
npm pack
npx --package=./aliyun-enterprise-email-mcp-1.0.0.tgz -c aliyun-enterprise-email-mcp
```

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector \
  /Users/YOU/.nvm/versions/node/v24.19.0/bin/node \
  /ABSOLUTE/PATH/mailsendermcp/dist/src/index.js
```

Inspector 可在无凭据时完成 initialize / listTools；调用 verify/send 前再注入环境变量。

## 测试策略

- **单元测试**：校验、TLS/配置、白名单、附件/符号链接、限流、脱敏、不确定结果；全部使用 **mock 传输**
- **护栏**：创建真实 nodemailer 传输在测试上下文会失败
- **stdio**：子进程启动生产入口，无机密完成 initialize/listTools
- **独立 mock stdio 服务器**（`tests/fixtures/mock-stdio-server.ts`）：验证 verify/send 成功、部分拒绝、超时；**不**走可被生产滥用的环境开关开启实 SMTP

## 用 npx 安装（Grok / 其他 MCP 宿主）

公开仓库：<https://github.com/witmeng/aliyun-enterprise-email-mcp>

目标机器需要 **Node.js ≥ 24**。`npx` 会安装依赖并启动 stdio 服务；仓库已包含编译好的 `dist/src`，目标机器不用再执行 `tsc`。本程序**不读取** `.env` 文件，签名和 SMTP 凭据必须放进启动进程的环境变量。

```json
{
  "mcpServers": {
    "aliyun-enterprise-email": {
      "command": "npx",
      "args": ["-y", "github:witmeng/aliyun-enterprise-email-mcp"],
      "env": {
        "SMTP_HOST": "smtp.qiye.aliyun.com",
        "SMTP_PORT": "465",
        "SMTP_TLS_MODE": "implicit",
        "SMTP_USER": "you@company.com",
        "SMTP_PASSWORD": "注入而非写入仓库",
        "MAIL_RECIPIENT_ALLOWLIST": "recipient@example.com",
        "MAIL_SIGNATURE_HTML": "<p>签名 HTML，图片使用公开 https 地址</p>",
        "MAIL_SIGNATURE_TEXT": "纯文本签名"
      }
    }
  }
}
```

若宿主只接受一条命令，把同样的变量写在命令前面：

```bash
SMTP_HOST=smtp.qiye.aliyun.com SMTP_PORT=465 SMTP_TLS_MODE=implicit \
SMTP_USER='you@company.com' SMTP_PASSWORD='你的授权码' \
MAIL_RECIPIENT_ALLOWLIST='recipient@example.com' \
npx -y github:witmeng/aliyun-enterprise-email-mcp
```

`MAIL_SIGNATURE_HTML` 含空格或引号时，优先放进配置文件的 `env` 字段，不要拼进一行 shell。

## 部署说明（其他机器）

当前 README 中的 Mac / nvm 路径 **仅** 适用于本机。迁移到其他电脑或机器人环境时需要：

1. 使用上面的 `npx github:witmeng/aliyun-enterprise-email-mcp`，或安装 Node ≥ 24 后从源码构建
2. 安全注入环境变量（密钥管理 / 机密存储）。不要把 `.env` 提交进仓库

## 依赖（精确锁定）

| 包 | 版本 |
|----|------|
| `@modelcontextprotocol/sdk` | `1.32.2`（v1 API） |
| `nodemailer` | `10.6.1` |
| `zod` | `4.6.7` |
| `typescript` | 构建使用稳定 `tsc`（见 `package.json`；非实验性 TS7 native 预览） |

以 `package.json` / `package-lock.json` 为准。
