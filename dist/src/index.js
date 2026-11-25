#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createEmailMcpServer } from './server.js';
import { logDiagnostic } from './errors.js';
/**
 * 生产入口：stdio MCP。
 * 启动与 listTools 不要求凭据、不发起网络连接。
 * stdout 仅 JSON-RPC；诊断输出到 stderr。
 */
async function main() {
    const { server } = createEmailMcpServer({
        allowLiveTransport: true,
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logDiagnostic('aliyun-enterprise-email-mcp 已在 stdio 上就绪（尚未连接 SMTP）。');
}
main().catch((err) => {
    const msg = err instanceof Error ? err.message : '启动失败';
    logDiagnostic(`致命错误：${msg}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map