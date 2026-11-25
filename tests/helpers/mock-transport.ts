import type {
  NodemailerSendInfo,
  SmtpTransportFactory,
  SmtpTransportLike,
} from '../../src/smtp/types.js';
import { LIVE_TRANSPORT_GUARD } from '../../src/smtp/types.js';

export type MockBehavior =
  | { mode: 'success'; info?: NodemailerSendInfo }
  | { mode: 'verify-fail'; error: Error }
  | { mode: 'send-fail'; error: Error }
  | { mode: 'timeout'; ms?: number };

/**
 * 创建纯内存 mock 传输。若检测到 live 护栏被意外打开且仍走 mock，测试可另行断言。
 */
export function createMockTransportFactory(
  behavior: MockBehavior,
  tracker?: { verifyCalls: number; sendCalls: number; lastMail?: Record<string, unknown> },
): SmtpTransportFactory {
  return () => {
    if (LIVE_TRANSPORT_GUARD.allowLive) {
      // mock 测试入口绝不应打开 live；若打开则立即失败
      throw new Error('测试失败：mock 场景下 LIVE_TRANSPORT_GUARD.allowLive 为 true');
    }
    const transport: SmtpTransportLike = {
      async verify() {
        if (tracker) tracker.verifyCalls += 1;
        if (behavior.mode === 'verify-fail') {
          throw behavior.error;
        }
        if (behavior.mode === 'timeout') {
          await new Promise((r) => setTimeout(r, behavior.ms ?? 50_000));
        }
        return true;
      },
      async sendMail(mail) {
        if (tracker) {
          tracker.sendCalls += 1;
          tracker.lastMail = mail;
        }
        if (behavior.mode === 'send-fail') {
          throw behavior.error;
        }
        if (behavior.mode === 'timeout') {
          await new Promise((r) => setTimeout(r, behavior.ms ?? 50_000));
        }
        if (behavior.mode !== 'success') {
          throw new Error('unexpected send after non-success config');
        }
        return (
          behavior.info ?? {
            messageId: '<mock@test>',
            accepted: Array.isArray(mail.to) ? mail.to : [String(mail.to)],
            rejected: [],
            response: '250 OK mock',
          }
        );
      },
      close() {
        // no-op
      },
    };
    return transport;
  };
}

export function assertNoLiveTransport(): void {
  if (LIVE_TRANSPORT_GUARD.allowLive) {
    throw new Error('测试护栏失败：检测到允许真实 SMTP');
  }
}
