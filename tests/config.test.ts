import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSendPolicy,
  loadConfig,
  requireSmtpCredentials,
} from '../src/config.js';
import { AppError } from '../src/errors.js';
import { buildTransportOptions } from '../src/smtp/transport.js';

describe('config / TLS', () => {
  it('无凭据亦可加载配置（启动友好）', () => {
    const cfg = loadConfig({
      PATH: '/usr/bin',
    });
    assert.equal(cfg.smtpHost, 'smtp.qiye.aliyun.com');
    assert.equal(cfg.smtpPort, 465);
    assert.equal(cfg.tlsMode, 'implicit');
    assert.equal(cfg.rejectUnauthorized, true);
    assert.equal(cfg.smtpUser, undefined);
    assert.equal(cfg.smtpPassword, undefined);
    assert.equal(cfg.signatureHtml, undefined);
    assert.equal(cfg.signatureText, undefined);
  });

  it('STARTTLS 模式仍强制校验证书且 requireTLS', () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'secret-value-not-logged',
      SMTP_HOST: 'smtp.qiye.aliyun.com',
      SMTP_PORT: '587',
      SMTP_TLS_MODE: 'starttls',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
    });
    assert.equal(cfg.tlsMode, 'starttls');
    const opts = buildTransportOptions(cfg) as {
      secure: boolean;
      requireTLS: boolean;
      tls: { rejectUnauthorized: boolean };
      disableFileAccess: boolean;
      disableUrlAccess: boolean;
    };
    assert.equal(opts.secure, false);
    assert.equal(opts.requireTLS, true);
    assert.equal(opts.tls.rejectUnauthorized, true);
    assert.equal(opts.disableFileAccess, true);
    assert.equal(opts.disableUrlAccess, true);
  });

  it('隐式 TLS 465 secure=true', () => {
    const cfg = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'x',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
    });
    const opts = buildTransportOptions(cfg) as { secure: boolean; requireTLS: boolean };
    assert.equal(opts.secure, true);
    assert.equal(opts.requireTLS, false);
  });

  it('缺少凭据时 requireSmtpCredentials 失败', () => {
    const cfg = loadConfig({});
    assert.throws(() => requireSmtpCredentials(cfg), AppError);
  });

  it('未配置白名单仍可发送；生产无 opt-in 拒绝', () => {
    const dev = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'x',
      NODE_ENV: 'development',
    });
    assert.doesNotThrow(() => assertSendPolicy(dev));

    const prod = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'x',
      NODE_ENV: 'production',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
      MAIL_PRODUCTION_SEND_OPT_IN: 'false',
    });
    assert.throws(() => assertSendPolicy(prod), AppError);

    const prodOk = loadConfig({
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'x',
      NODE_ENV: 'production',
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
      MAIL_PRODUCTION_SEND_OPT_IN: 'true',
    });
    assert.doesNotThrow(() => assertSendPolicy(prodOk));
  });
});
