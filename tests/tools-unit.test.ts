import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { loadConfig } from '../src/config.js';
import { handleSendEmail } from '../src/tools/send_email.js';
import { handleVerifySmtpConnection } from '../src/tools/verify_smtp_connection.js';
import { LIVE_TRANSPORT_GUARD } from '../src/smtp/types.js';
import {
  createLiveTransportFactory,
} from '../src/smtp/transport.js';
import {
  assertNoLiveTransport,
  createMockTransportFactory,
} from './helpers/mock-transport.js';

describe('tools with mock transport', () => {
  beforeEach(() => {
    LIVE_TRANSPORT_GUARD.allowLive = false;
  });

  it('verify 成功（mock）', async () => {
    assertNoLiveTransport();
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
      SMTP_CONNECTION_TIMEOUT_MS: '2000',
    });
    const factory = createMockTransportFactory({ mode: 'success' });
    const res = await handleVerifySmtpConnection(cfg, factory);
    assert.equal(res.isError, undefined);
    assert.equal(res.structuredContent.ok, true);
  });

  it('send 成功返回 messageId 与 accepted，且非投递承诺', async () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com,b@example.com',
      NODE_ENV: 'development',
    });
    const tracker: {
      verifyCalls: number;
      sendCalls: number;
      lastMail?: Record<string, unknown>;
    } = { verifyCalls: 0, sendCalls: 0 };
    const factory = createMockTransportFactory(
      {
        mode: 'success',
        info: {
          messageId: '<id@test>',
          accepted: ['a@example.com'],
          rejected: ['b@example.com'],
        },
      },
      tracker,
    );
    const res = await handleSendEmail(cfg, factory, {
      to: ['a@example.com'],
      cc: ['b@example.com'],
      subject: '主题',
      text: '正文',
    });
    assert.equal(tracker.sendCalls, 1);
    assert.equal(res.structuredContent.ok, true);
    assert.equal(res.structuredContent.messageId, '<id@test>');
    assert.deepEqual(res.structuredContent.accepted, ['a@example.com']);
    assert.deepEqual(res.structuredContent.rejected, ['b@example.com']);
    assert.equal(res.structuredContent.acceptedMeansDelivery, false);
    assert.equal(res.structuredContent.savedToSentFolder, false);
    assert.equal(tracker.lastMail?.from, 'u@example.com');
  });

  it('配置的签名会附在 text 与 html 末尾，且同一图片不重复', async () => {
    const signatureHtml =
      "<p><img src='https://example.com/logo.png' alt='BennyMall' width='280'></p>";
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
      MAIL_SIGNATURE_HTML: signatureHtml,
      MAIL_SIGNATURE_TEXT: 'Best Regards\nBennyMall',
    });
    const tracker: {
      verifyCalls: number;
      sendCalls: number;
      lastMail?: Record<string, unknown>;
    } = { verifyCalls: 0, sendCalls: 0 };
    const factory = createMockTransportFactory({ mode: 'success' }, tracker);
    const res = await handleSendEmail(cfg, factory, {
      to: ['a@example.com'],
      subject: '主题',
      text: '正文',
      html: '<p>正文</p>',
    });
    assert.equal(res.isError, undefined);
    assert.equal(tracker.lastMail?.text, '正文\n\nBest Regards\nBennyMall');
    assert.equal(tracker.lastMail?.html, `<p>正文</p>\n${signatureHtml}`);

    const again = createMockTransportFactory({ mode: 'success' }, tracker);
    await handleSendEmail(cfg, again, {
      to: ['a@example.com'],
      subject: '主题',
      html: `<p>正文</p>\n${signatureHtml}`,
    });
    assert.equal(tracker.lastMail?.html, `<p>正文</p>\n${signatureHtml}`);
  });

  it('拒绝覆盖 From / 白名单外收件人', async () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
    });
    const factory = createMockTransportFactory({ mode: 'success' });
    const res = await handleSendEmail(cfg, factory, {
      to: ['evil@example.com'],
      subject: 's',
      text: 't',
    });
    assert.equal(res.isError, true);
    assert.match(String(res.structuredContent.error), /ALLOWLIST|白名单|不在/i);
  });

  it('超时标记 uncertain 且建议勿自动重试', async () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
      SMTP_SEND_TIMEOUT_MS: '50',
    });
    const factory = createMockTransportFactory({ mode: 'timeout', ms: 5_000 });
    const res = await handleSendEmail(cfg, factory, {
      to: ['a@example.com'],
      subject: 's',
      text: 't',
    });
    assert.equal(res.isError, true);
    assert.equal(res.structuredContent.uncertain, true);
    assert.equal(res.structuredContent.doNotAutoRetry, true);
  });

  it('网络类错误标记 uncertain', async () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
    });
    const err = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const factory = createMockTransportFactory({ mode: 'send-fail', error: err });
    const res = await handleSendEmail(cfg, factory, {
      to: ['a@example.com'],
      subject: 's',
      text: 't',
    });
    assert.equal(res.structuredContent.uncertain, true);
    assert.ok(!JSON.stringify(res).includes('pw'));
  });

  it('创建真实传输在测试护栏下失败', () => {
    LIVE_TRANSPORT_GUARD.allowLive = false;
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'pw',
    });
    const factory = createLiveTransportFactory(cfg);
    assert.throws(() => factory(), /禁止实连接|FATAL/);
  });
});
