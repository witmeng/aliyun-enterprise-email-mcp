import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockServer = path.resolve(__dirname, 'fixtures/mock-stdio-server.js');

async function withMockClient(
  envExtra: Record<string, string>,
  fn: (client: Client) => Promise<void>,
): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mockServer],
    env: {
      PATH: process.env.PATH ?? '/usr/bin',
      HOME: process.env.HOME ?? '',
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'test-password-not-real',
      MAIL_RECIPIENT_ALLOWLIST: 'ok@example.com,bad@example.com,a@example.com',
      NODE_ENV: 'development',
      SMTP_SEND_TIMEOUT_MS: '200',
      SMTP_CONNECTION_TIMEOUT_MS: '200',
      ...envExtra,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'test-mock', version: '1.0.0' });
  await client.connect(transport);
  try {
    await fn(client);
  } finally {
    await client.close();
  }
}

describe('stdio mock server tools', () => {
  it('verify_smtp_connection 成功（mock，无实 SMTP）', async () => {
    await withMockClient({ MAIL_MCP_TEST_BEHAVIOR: 'success' }, async (client) => {
      const result = await client.callTool({
        name: 'verify_smtp_connection',
        arguments: {},
      });
      assert.equal(result.isError, undefined);
      const text = JSON.stringify(result);
      assert.ok(text.includes('"ok":true') || text.includes('"ok": true'));
      assert.ok(!text.includes('test-password-not-real'));
    });
  });

  it('send_email 成功与部分拒绝', async () => {
    await withMockClient({ MAIL_MCP_TEST_BEHAVIOR: 'reject' }, async (client) => {
      const result = await client.callTool({
        name: 'send_email',
        arguments: {
          to: ['ok@example.com'],
          cc: ['bad@example.com'],
          subject: '测试主题',
          text: '测试正文',
        },
      });
      const structured = result.structuredContent as Record<string, unknown> | undefined;
      const raw = structured ?? JSON.parse(
        (result.content as Array<{ type: string; text?: string }>)
          .map((c) => c.text ?? '')
          .join(''),
      );
      assert.equal(raw.ok, true);
      assert.deepEqual(raw.accepted, ['ok@example.com']);
      assert.deepEqual(raw.rejected, ['bad@example.com']);
      assert.equal(raw.acceptedMeansDelivery, false);
    });
  });

  it('超时结果 uncertain', async () => {
    await withMockClient({ MAIL_MCP_TEST_BEHAVIOR: 'timeout' }, async (client) => {
      const result = await client.callTool({
        name: 'send_email',
        arguments: {
          to: ['a@example.com'],
          subject: 't',
          text: 'b',
        },
      });
      assert.equal(result.isError, true);
      const text = JSON.stringify(result.structuredContent ?? result.content);
      assert.ok(text.includes('uncertain') || text.includes('超时'));
      assert.ok(!text.includes('test-password-not-real'));
    });
  });
});
