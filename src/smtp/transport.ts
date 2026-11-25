import nodemailer from 'nodemailer';
import type { AppConfig } from '../config.js';
import { requireSmtpCredentials } from '../config.js';
import { AppError, classifySendFailure } from '../errors.js';
import {
  LIVE_TRANSPORT_GUARD,
  type MailAddressFields,
  type NodemailerSendInfo,
  type SendResult,
  type SmtpTransportFactory,
  type SmtpTransportLike,
} from './types.js';

function normalizeAddressList(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildTransportOptions(config: AppConfig): Record<string, unknown> {
  const { user, pass } = requireSmtpCredentials(config);
  const secure = config.tlsMode === 'implicit';

  return {
    host: config.smtpHost,
    port: config.smtpPort,
    secure,
    // STARTTLS：强制升级且校验证书；隐式 TLS 同样校验证书
    requireTLS: config.tlsMode === 'starttls',
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    auth: { user, pass },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
    socketTimeout: config.socketTimeoutMs,
    // 禁止 nodemailer 自行读文件/URL
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createLiveTransportFactory(config: AppConfig): SmtpTransportFactory {
  return () => {
    LIVE_TRANSPORT_GUARD.assertLiveAllowed();
    const transport = nodemailer.createTransport(buildTransportOptions(config));
    return {
      verify: () => transport.verify(),
      sendMail: (opts) => transport.sendMail(opts) as Promise<NodemailerSendInfo>,
      close: () => transport.close(),
    };
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new AppError(
              'uncertain',
              `${label} 超时（${ms}ms）：结果不确定。请勿自动重试。`,
              { uncertain: true, retrySafe: false },
            ),
          );
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function verifySmtp(
  factory: SmtpTransportFactory,
  config: AppConfig,
): Promise<{ ok: true; host: string; port: number; tlsMode: string }> {
  requireSmtpCredentials(config);
  const transport = factory();
  try {
    await withTimeout(transport.verify(), config.connectionTimeoutMs, 'SMTP verify');
    return {
      ok: true,
      host: config.smtpHost,
      port: config.smtpPort,
      tlsMode: config.tlsMode,
    };
  } catch (err) {
    throw classifySendFailure(err);
  } finally {
    try {
      transport.close();
    } catch {
      // ignore
    }
  }
}

export async function sendSmtp(
  factory: SmtpTransportFactory,
  config: AppConfig,
  mail: MailAddressFields,
): Promise<SendResult> {
  requireSmtpCredentials(config);
  const transport = factory();
  try {
    const info = await withTimeout(
      transport.sendMail({
        from: mail.from,
        to: mail.to,
        ...(mail.cc && mail.cc.length > 0 ? { cc: mail.cc } : {}),
        ...(mail.bcc && mail.bcc.length > 0 ? { bcc: mail.bcc } : {}),
        subject: mail.subject,
        ...(mail.text !== undefined ? { text: mail.text } : {}),
        ...(mail.html !== undefined ? { html: mail.html } : {}),
        ...(mail.attachments && mail.attachments.length > 0
          ? {
              attachments: mail.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
              })),
            }
          : {}),
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
      config.sendTimeoutMs,
      'SMTP send',
    );

    const accepted = normalizeAddressList(info.accepted);
    const rejected = normalizeAddressList(info.rejected);

    const result: SendResult = {
      ...(info.messageId !== undefined ? { messageId: info.messageId } : {}),
      accepted,
      rejected,
      acceptedMeansDelivery: false,
      savedToSentFolder: false,
      note:
        'accepted 仅表示 SMTP 会话层接受，不代表收件方已投递；本服务为 SMTP-only，不保证写入发件箱（无 IMAP）。若存在 rejected，请勿对整封邮件盲目重试。',
    };

    if (rejected.length > 0 && accepted.length === 0) {
      return {
        ...result,
        doNotAutoRetry: true,
        note: `${result.note} 全部收件人被拒绝。`,
      };
    }
    if (rejected.length > 0) {
      return {
        ...result,
        note: `${result.note} 部分收件人被拒绝（partial acceptance）。`,
      };
    }
    return result;
  } catch (err) {
    const classified = classifySendFailure(err);
    if (classified.uncertain) {
      throw classified;
    }
    throw classified;
  } finally {
    try {
      transport.close();
    } catch {
      // ignore
    }
  }
}

/** 生产入口使用：允许创建真实传输 */
export function enableLiveTransportForProduction(): void {
  LIVE_TRANSPORT_GUARD.allowLive = true;
}

export function createTestFailClosedFactory(): SmtpTransportFactory {
  return () => {
    throw new Error('测试护栏：未注入 mock 传输，禁止创建 SMTP 连接。');
  };
}
