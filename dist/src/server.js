import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { loadConfig } from './config.js';
import { SendEmailInputSchema, VerifySmtpInputSchema } from './schemas/email.js';
import { createLiveTransportFactory, enableLiveTransportForProduction, } from './smtp/transport.js';
import { handleSendEmail, SEND_EMAIL_DESCRIPTION, } from './tools/send_email.js';
import { handleVerifySmtpConnection, VERIFY_SMTP_DESCRIPTION, } from './tools/verify_smtp_connection.js';
export function createEmailMcpServer(options = {}) {
    const config = options.config ?? loadConfig(process.env);
    let transportFactory = options.transportFactory;
    if (options.allowLiveTransport) {
        enableLiveTransportForProduction();
    }
    const getFactory = () => {
        if (!transportFactory) {
            if (!options.allowLiveTransport) {
                throw new Error('未注入 transportFactory 且未允许 live SMTP；拒绝创建真实连接。');
            }
            transportFactory = createLiveTransportFactory(config);
        }
        return transportFactory;
    };
    const server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    });
    server.registerTool('verify_smtp_connection', {
        title: '验证 SMTP 连接',
        description: VERIFY_SMTP_DESCRIPTION,
        inputSchema: VerifySmtpInputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async () => handleVerifySmtpConnection(config, getFactory()));
    server.registerTool('send_email', {
        title: '发送电子邮件',
        description: SEND_EMAIL_DESCRIPTION,
        inputSchema: SendEmailInputSchema,
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (args) => handleSendEmail(config, getFactory(), args));
    return {
        server,
        getConfig: () => config,
    };
}
//# sourceMappingURL=server.js.map