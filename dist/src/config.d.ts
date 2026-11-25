export type TlsMode = 'implicit' | 'starttls';
export interface AppConfig {
    smtpUser: string | undefined;
    smtpPassword: string | undefined;
    smtpHost: string;
    smtpPort: number;
    tlsMode: TlsMode;
    /** 校验证书；永远为 true，不可关闭 */
    rejectUnauthorized: true;
    recipientAllowlist: ReadonlySet<string>;
    productionSendOptIn: boolean;
    nodeEnv: string;
    attachmentRoot: string | undefined;
    /** 自动附在 HTML 正文末尾；未配置则不追加 */
    signatureHtml: string | undefined;
    /** 自动附在纯文本正文末尾；未配置则不追加 */
    signatureText: string | undefined;
    connectionTimeoutMs: number;
    greetingTimeoutMs: number;
    socketTimeoutMs: number;
    sendTimeoutMs: number;
}
/**
 * 从环境解析配置。不加载 dotenv；不访问网络。
 * 启动/listTools 可在无凭据时调用。
 */
export declare function loadConfig(env?: NodeJS.ProcessEnv): AppConfig;
/** 发送/校验所需凭据；启动阶段不调用。 */
export declare function requireSmtpCredentials(config: AppConfig): {
    user: string;
    pass: string;
};
/**
 * 发送策略：
 * - 收件人由调用参数 to/cc/bcc 决定。未配置白名单时不限制收件人。
 * - 配置了 MAIL_RECIPIENT_ALLOWLIST 时，收件人必须全部命中。
 * - NODE_ENV=production 时必须显式 MAIL_PRODUCTION_SEND_OPT_IN=true
 */
export declare function assertSendPolicy(config: AppConfig): void;
//# sourceMappingURL=config.d.ts.map