import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertBodyContent,
  assertDnsHostname,
  assertNoHeaderInjection,
  assertPlainEmail,
  assertSafeFilename,
  assertSafeSubject,
} from '../src/validation.js';
import { parseSendEmailInput } from '../src/schemas/email.js';
import { AppError } from '../src/errors.js';
import { sanitizeMessage } from '../src/errors.js';

describe('validation', () => {
  it('接受合法明文邮箱', () => {
    assert.equal(assertPlainEmail('a.b+c@example.com', 'to'), 'a.b+c@example.com');
  });

  it('拒绝头注入与显示名', () => {
    assert.throws(() => assertPlainEmail('a@b.com\nBcc:x@y.com', 'to'), AppError);
    assert.throws(() => assertPlainEmail('Name <a@b.com>', 'to'), AppError);
    assert.throws(() => assertNoHeaderInjection('sub\rject', 'subject'), AppError);
  });

  it('限制 subject/body 字节并要求 text 或 html', () => {
    assert.throws(() => assertSafeSubject(''), AppError);
    assert.equal(assertSafeSubject('你好'), '你好');
    assert.throws(() => assertBodyContent(undefined, undefined), AppError);
    assert.doesNotThrow(() => assertBodyContent('hi', undefined));
    assert.throws(() => assertBodyContent('x'.repeat(600_000), undefined), AppError);
  });

  it('拒绝危险附件文件名', () => {
    assert.throws(() => assertSafeFilename('../x.txt'), AppError);
    assert.throws(() => assertSafeFilename('a\nb.txt'), AppError);
    assert.equal(assertSafeFilename('report.pdf'), 'report.pdf');
  });

  it('校验 DNS 主机名，拒绝 URL', () => {
    assert.equal(assertDnsHostname('smtp.qiye.aliyun.com'), 'smtp.qiye.aliyun.com');
    assert.throws(() => assertDnsHostname('smtp://evil'), AppError);
    assert.throws(() => assertDnsHostname('host/path'), AppError);
  });

  it('Zod schema 拒绝未知属性', () => {
    assert.throws(
      () =>
        parseSendEmailInput({
          to: ['a@b.com'],
          subject: 's',
          text: 't',
          confirm: true,
        }),
      AppError,
    );
  });

  it('脱敏错误信息不回显 password', () => {
    const s = sanitizeMessage('auth failed password=supersecret SMTP_PASSWORD=x');
    assert.ok(!s.includes('supersecret'));
    assert.ok(s.includes('[REDACTED]') || !s.toLowerCase().includes('password=s'));
  });
});
