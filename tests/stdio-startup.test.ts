import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LIVE_TRANSPORT_GUARD } from '../src/smtp/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.resolve(__dirname, '../src/index.js');

describe('stdio startup without secrets', () => {
  it('initialize + listTools 不需要 SMTP 凭据且不联网', async () => {
    LIVE_TRANSPORT_GUARD.allowLive = false;

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      env: {
        PATH: process.env.PATH ?? '/usr/bin',
        HOME: process.env.HOME ?? '',
        // 故意不提供 SMTP_USER / SMTP_PASSWORD
        NODE_ENV: 'development',
      },
      stderr: 'pipe',
    });

    const client = new Client({ name: 'test-startup', version: '1.0.0' });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      const names = tools.tools.map((t) => t.name).sort();
      assert.deepEqual(names, ['send_email', 'verify_smtp_connection']);
      const send = tools.tools.find((t) => t.name === 'send_email');
      assert.ok(send?.description?.includes('明确批准') || send?.description?.includes('人类'));
      assert.ok(send?.description?.includes('外') || send?.description?.includes('发送'));
    } finally {
      await client.close();
    }
  });
});
