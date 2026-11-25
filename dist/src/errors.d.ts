/**
 * 安全错误处理：绝不回显密钥或可能含有凭据的原始 SMTP 报文。
 */
export declare function sanitizeMessage(message: string): string;
export type ErrorKind = 'validation' | 'config' | 'allowlist' | 'attachment' | 'timeout' | 'network' | 'auth' | 'smtp' | 'uncertain' | 'internal';
export declare class AppError extends Error {
    readonly kind: ErrorKind;
    readonly retrySafe: boolean;
    readonly uncertain: boolean;
    constructor(kind: ErrorKind, message: string, options?: {
        retrySafe?: boolean;
        uncertain?: boolean;
        cause?: unknown;
    });
}
export declare function toSafeErrorMessage(err: unknown): string;
export declare function classifySendFailure(err: unknown): AppError;
export declare function logDiagnostic(message: string): void;
//# sourceMappingURL=errors.d.ts.map