import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSendEmailInput } from '../src/schemas/email.js';
import { AppError } from '../src/errors.js';
import { MAX_TO_RECIPIENTS } from '../src/constants.js';

describe('limits', () => {
  it('拒绝超限收件人数量', () => {
    const to = Array.from({ length: MAX_TO_RECIPIENTS + 1 }, (_, i) => `u${i}@example.com`);
    assert.throws(
      () => parseSendEmailInput({ to, subject: 's', text: 't' }),
      AppError,
    );
  });

  it('拒绝超长 subject', () => {
    assert.throws(
      () =>
        parseSendEmailInput({
          to: ['a@example.com'],
          subject: '字'.repeat(2000),
          text: 't',
        }),
      AppError,
    );
  });
});
