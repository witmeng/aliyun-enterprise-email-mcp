export interface MailAddressFields {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
    }>;
}
export interface NodemailerSendInfo {
    messageId?: string;
    accepted?: unknown;
    rejected?: unknown;
    response?: string;
}
export interface SendResult {
    messageId?: string;
    accepted: string[];
    rejected: string[];
    /** SMTP 已接受不等于最终投递成功 */
    acceptedMeansDelivery: false;
    /** SMTP-only 不保证已写入发件箱（无 IMAP） */
    savedToSentFolder: false;
    uncertain?: boolean;
    doNotAutoRetry?: boolean;
    note?: string;
}
export interface SmtpTransportLike {
    verify(): Promise<true>;
    sendMail(mailOptions: Record<string, unknown>): Promise<NodemailerSendInfo>;
    close(): void;
}
export type SmtpTransportFactory = () => SmtpTransportLike;
/** 测试用：若真实工厂被调用则失败 */
export declare const LIVE_TRANSPORT_GUARD: {
    allowLive: boolean;
    assertLiveAllowed(): void;
};
//# sourceMappingURL=types.d.ts.map