import type { AppConfig } from '../config.js';
import { AppError, toSafeErrorMessage } from '../errors.js';
import { verifySmtp } from '../smtp/transport.js';
import type { SmtpTransportFactory } from '../smtp/types.js';

export const VERIFY_SMTP_DESCRIPTION = `验证与阿里云企业邮 SMTP 的认证与 TLS 握手（不发送邮件）。

重要：
- 成功仅表示当前凭据与 TLS 可用，不代表任何邮件已投递。
- 需要环境变量 SMTP_USER / SMTP_PASSWORD（启动与 listTools 不需要凭据）。
- 永远校验证书，不会关闭 TLS。
- 本工具不访问 IMAP，不检查发件箱。`;

export async function handleVerifySmtpConnection(
  config: AppConfig,
  transportFactory: SmtpTransportFactory,
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}> {
  try {
    const result = await verifySmtp(transportFactory, config);
    const payload = {
      ...result,
      note: 'SMTP verify 成功≠投递成功；未发送任何邮件。',
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  } catch (err) {
    const message = toSafeErrorMessage(err);
    const payload = {
      ok: false as const,
      error: message,
      kind: err instanceof AppError ? err.kind : 'smtp',
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
      isError: true,
    };
  }
}
