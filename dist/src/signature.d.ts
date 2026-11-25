import type { AppConfig } from './config.js';
/**
 * 把环境变量中的签名附到正文末尾。
 * 未配置签名时原样返回。正文里已经包含同一段签名或同一张图片地址时不重复追加。
 */
export declare function appendConfiguredSignature(config: AppConfig, text: string | undefined, html: string | undefined): {
    text?: string;
    html?: string;
};
//# sourceMappingURL=signature.d.ts.map