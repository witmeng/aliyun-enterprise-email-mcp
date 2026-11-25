import type { AppConfig } from './config.js';
import { AppError } from './errors.js';

export function assertRecipientsAllowed(
  config: AppConfig,
  recipients: readonly string[],
): void {
  if (config.recipientAllowlist.size === 0) {
    throw new AppError(
      'allowlist',
      '默认失败关闭：未配置 MAIL_RECIPIENT_ALLOWLIST，拒绝发送。',
    );
  }
  const denied: string[] = [];
  for (const r of recipients) {
    if (!config.recipientAllowlist.has(r.toLowerCase())) {
      denied.push(r);
    }
  }
  if (denied.length > 0) {
    throw new AppError(
      'allowlist',
      `以下收件人不在 MAIL_RECIPIENT_ALLOWLIST 中，已拒绝：${denied.join(', ')}`,
    );
  }
}
