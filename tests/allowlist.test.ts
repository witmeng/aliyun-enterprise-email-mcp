import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertRecipientsAllowed } from '../src/allowlist.js';
import { loadConfig } from '../src/config.js';
import { AppError } from '../src/errors.js';

describe('allowlist', () => {
  it('允许名单内地址（大小写不敏感）', () => {
    const cfg = loadConfig({
      MAIL_RECIPIENT_ALLOWLIST: 'Allowed@Example.com,b@example.com',
    });
    assert.doesNotThrow(() =>
      assertRecipientsAllowed(cfg, ['allowed@example.com', 'b@example.com']),
    );
  });

  it('拒绝名单外地址', () => {
    const cfg = loadConfig({
      MAIL_RECIPIENT_ALLOWLIST: 'a@example.com',
    });
    assert.throws(
      () => assertRecipientsAllowed(cfg, ['a@example.com', 'evil@example.com']),
      AppError,
    );
  });
});
