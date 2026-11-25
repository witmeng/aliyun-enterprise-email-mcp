import type { AppConfig } from '../config.js';
import type { SmtpTransportFactory } from '../smtp/types.js';
export declare const VERIFY_SMTP_DESCRIPTION = "\u9A8C\u8BC1\u4E0E\u963F\u91CC\u4E91\u4F01\u4E1A\u90AE SMTP \u7684\u8BA4\u8BC1\u4E0E TLS \u63E1\u624B\uFF08\u4E0D\u53D1\u9001\u90AE\u4EF6\uFF09\u3002\n\n\u91CD\u8981\uFF1A\n- \u6210\u529F\u4EC5\u8868\u793A\u5F53\u524D\u51ED\u636E\u4E0E TLS \u53EF\u7528\uFF0C\u4E0D\u4EE3\u8868\u4EFB\u4F55\u90AE\u4EF6\u5DF2\u6295\u9012\u3002\n- \u9700\u8981\u73AF\u5883\u53D8\u91CF SMTP_USER / SMTP_PASSWORD\uFF08\u542F\u52A8\u4E0E listTools \u4E0D\u9700\u8981\u51ED\u636E\uFF09\u3002\n- \u6C38\u8FDC\u6821\u9A8C\u8BC1\u4E66\uFF0C\u4E0D\u4F1A\u5173\u95ED TLS\u3002\n- \u672C\u5DE5\u5177\u4E0D\u8BBF\u95EE IMAP\uFF0C\u4E0D\u68C0\u67E5\u53D1\u4EF6\u7BB1\u3002";
export declare function handleVerifySmtpConnection(config: AppConfig, transportFactory: SmtpTransportFactory): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    structuredContent: Record<string, unknown>;
    isError?: boolean;
}>;
//# sourceMappingURL=verify_smtp_connection.d.ts.map