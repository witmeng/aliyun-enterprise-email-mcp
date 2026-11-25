/**
 * 安全错误处理：绝不回显密钥或可能含有凭据的原始 SMTP 报文。
 */

const SECRET_PATTERNS: RegExp[] = [
  /pass(word|wd)?[=:\s][^\s,;]+/gi,
  /auth\s+[^\r\n]+/gi,
  /smtp_password/gi,
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
];

export function sanitizeMessage(message: string): string {
  let out = message;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, '[REDACTED]');
  }
  // 截断过长错误，避免意外回显大段服务器响应
  if (out.length > 400) {
    out = `${out.slice(0, 400)}…`;
  }
  return out;
}

export type ErrorKind =
  | 'validation'
  | 'config'
  | 'allowlist'
  | 'attachment'
  | 'timeout'
  | 'network'
  | 'auth'
  | 'smtp'
  | 'uncertain'
  | 'internal';

export class AppError extends Error {
  readonly kind: ErrorKind;
  readonly retrySafe: boolean;
  readonly uncertain: boolean;

  constructor(
    kind: ErrorKind,
    message: string,
    options?: { retrySafe?: boolean; uncertain?: boolean; cause?: unknown },
  ) {
    super(sanitizeMessage(message));
    this.name = 'AppError';
    this.kind = kind;
    this.retrySafe = options?.retrySafe ?? false;
    this.uncertain = options?.uncertain ?? false;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function toSafeErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }
  if (err instanceof Error) {
    return sanitizeMessage(err.message || err.name || '未知错误');
  }
  return '未知错误';
}

export function classifySendFailure(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const lower = `${code} ${msg}`.toLowerCase();

  if (
    lower.includes('timeout') ||
    lower.includes('etimedout') ||
    lower.includes('esockettimedout') ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT'
  ) {
    return new AppError(
      'uncertain',
      'SMTP 操作超时：发送结果不确定。请勿自动重试；请人工确认是否已投递后再决定。',
      { uncertain: true, retrySafe: false, cause: err },
    );
  }

  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'EPIPE' ||
    code === 'ECONNABORTED' ||
    lower.includes('socket') ||
    lower.includes('network')
  ) {
    return new AppError(
      'uncertain',
      '网络/连接错误：发送结果不确定。请勿自动重试；请人工确认后再决定。',
      { uncertain: true, retrySafe: false, cause: err },
    );
  }

  if (
    lower.includes('invalid login') ||
    lower.includes('authentication') ||
    lower.includes('auth') ||
    code === 'EAUTH'
  ) {
    return new AppError('auth', 'SMTP 认证失败（细节已脱敏）。请检查凭据注入方式，勿重试轰炸。', {
      retrySafe: false,
      cause: err,
    });
  }

  return new AppError(
    'uncertain',
    'SMTP 发送出现未知错误：结果不确定。请勿自动重试；请人工确认。',
    { uncertain: true, retrySafe: false, cause: err },
  );
}

export function logDiagnostic(message: string): void {
  // stdout 仅用于 JSON-RPC；诊断走 stderr，并脱敏
  process.stderr.write(`${sanitizeMessage(message)}\n`);
}
