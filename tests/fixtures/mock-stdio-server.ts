#!/usr/bin/env node
/**
 * 仅用于自动化测试的 stdio MCP 入口：注入 mock 传输，绝不使用真实 SMTP。
 * 不通过生产 bin 暴露；生产包 files 白名单不含 tests。
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from '../../src/config.js';
import { createEmailMcpServer } from '../../src/server.js';
import { LIVE_TRANSPORT_GUARD } from '../../src/smtp/types.js';
import { createMockTransportFactory } from '../helpers/mock-transport.js';

function behaviorFromEnv(): Parameters<typeof createMockTransportFactory>[0] {
  const mode = process.env.MAIL_MCP_TEST_BEHAVIOR ?? 'success';
  if (mode === 'reject') {
    return {
      mode: 'success',
      info: {
        messageId: '<partial@test>',
        accepted: ['ok@example.com'],
        rejected: ['bad@example.com'],
      },
    };
  }
  if (mode === 'timeout') {
    return { mode: 'timeout', ms: 30_000 };
  }
  if (mode === 'verify-fail') {
    return {
      mode: 'verify-fail',
      error: Object.assign(new Error('Invalid login'), { code: 'EAUTH' }),
    };
  }
  if (mode === 'send-fail-network') {
    return {
      mode: 'send-fail',
      error: Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }),
    };
  }
  return { mode: 'success' };
}

async function main(): Promise<void> {
  LIVE_TRANSPORT_GUARD.allowLive = false;
  const config = loadConfig(process.env);
  const factory = createMockTransportFactory(behaviorFromEnv());
  const { server } = createEmailMcpServer({
    config,
    transportFactory: factory,
    allowLiveTransport: false,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : 'mock server failed';
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
