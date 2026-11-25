import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type AppConfig } from './config.js';
import type { SmtpTransportFactory } from './smtp/types.js';
export interface CreateServerOptions {
    /** 预解析配置；默认从 process.env 惰性读取（仍不联网） */
    config?: AppConfig;
    /** 依赖注入：测试用 mock 传输工厂；未提供则在首次需要时创建 live 工厂 */
    transportFactory?: SmtpTransportFactory;
    /** 生产进程设为 true，允许真实 SMTP；测试必须为 false */
    allowLiveTransport?: boolean;
}
export declare function createEmailMcpServer(options?: CreateServerOptions): {
    server: McpServer;
    getConfig: () => AppConfig;
};
//# sourceMappingURL=server.d.ts.map