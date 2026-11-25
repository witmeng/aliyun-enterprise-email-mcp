import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { loadConfig, type AppConfig } from './config.js';
import { SendEmailInputSchema, VerifySmtpInputSchema } from './schemas/email.js';
import {
  createLiveTransportFactory,
  enableLiveTransportForProduction,
} from './smtp/transport.js';
import type { SmtpTransportFactory } from './smtp/types.js';
import {
  handleSendEmail,
  SEND_EMAIL_DESCRIPTION,
} from './tools/send_email.js';
import {
  handleVerifySmtpConnection,
  VERIFY_SMTP_DESCRIPTION,
} from './tools/verify_smtp_connection.js';

export interface CreateServerOptions {
  /** 预解析配置；默认从 process.env 惰性读取（仍不联网） */
  config?: AppConfig;
  /** 依赖注入：测试用 mock 传输工厂；未提供则在首次需要时创建 live 工厂 */
  transportFactory?: SmtpTransportFactory;
  /** 生产进程设为 true，允许真实 SMTP；测试必须为 false */
  allowLiveTransport?: boolean;
}

export function createEmailMcpServer(options: CreateServerOptions = {}): {
  server: McpServer;
  getConfig: () => AppConfig;
} {
  const config = options.config ?? loadConfig(process.env);
  let transportFactory = options.transportFactory;

  if (options.allowLiveTransport) {
    enableLiveTransportForProduction();
  }

  const getFactory = (): SmtpTransportFactory => {
    if (!transportFactory) {
      if (!options.allowLiveTransport) {
        throw new Error(
          '未注入 transportFactory 且未允许 live SMTP；拒绝创建真实连接。',
        );
      }
      transportFactory = createLiveTransportFactory(config);
    }
    return transportFactory;
  };

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    'verify_smtp_connection',
    {
      title: '验证 SMTP 连接',
      description: VERIFY_SMTP_DESCRIPTION,
      inputSchema: VerifySmtpInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => handleVerifySmtpConnection(config, getFactory()),
  );

  server.registerTool(
    'send_email',
    {
      title: '发送电子邮件',
      description: SEND_EMAIL_DESCRIPTION,
      inputSchema: SendEmailInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => handleSendEmail(config, getFactory(), args),
  );

  return {
    server,
    getConfig: () => config,
  };
}
