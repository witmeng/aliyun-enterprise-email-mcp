import type { AppConfig } from '../config.js';
import { type MailAddressFields, type SendResult, type SmtpTransportFactory } from './types.js';
export declare function buildTransportOptions(config: AppConfig): Record<string, unknown>;
export declare function createLiveTransportFactory(config: AppConfig): SmtpTransportFactory;
export declare function verifySmtp(factory: SmtpTransportFactory, config: AppConfig): Promise<{
    ok: true;
    host: string;
    port: number;
    tlsMode: string;
}>;
export declare function sendSmtp(factory: SmtpTransportFactory, config: AppConfig, mail: MailAddressFields): Promise<SendResult>;
/** 生产入口使用：允许创建真实传输 */
export declare function enableLiveTransportForProduction(): void;
export declare function createTestFailClosedFactory(): SmtpTransportFactory;
//# sourceMappingURL=transport.d.ts.map