/** 默认阿里云企业邮 SMTP 主机 */
export const DEFAULT_SMTP_HOST = 'smtp.qiye.aliyun.com';
export const DEFAULT_SMTP_PORT = 465;
export const DEFAULT_TLS_MODE = 'implicit' as const;

export const DEFAULT_CONNECTION_TIMEOUT_MS = 15_000;
export const DEFAULT_GREETING_TIMEOUT_MS = 15_000;
export const DEFAULT_SOCKET_TIMEOUT_MS = 60_000;
export const DEFAULT_SEND_TIMEOUT_MS = 60_000;

export const MAX_TO_RECIPIENTS = 50;
export const MAX_CC_RECIPIENTS = 50;
export const MAX_BCC_RECIPIENTS = 50;
export const MAX_TOTAL_RECIPIENTS = 100;

/** 主题最大字节数（UTF-8） */
export const MAX_SUBJECT_BYTES = 998;
/** 正文 text 最大字节 */
export const MAX_TEXT_BYTES = 512_000;
/** 正文 html 最大字节 */
export const MAX_HTML_BYTES = 512_000;
/** text+html 合计最大字节 */
export const MAX_BODY_TOTAL_BYTES = 768_000;

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_TOTAL_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_FILENAME_BYTES = 200;

export const SERVER_NAME = 'aliyun-enterprise-email-mcp';
export const SERVER_VERSION = '1.0.0';

/** 生产外发选择加入的规范值 */
export const PRODUCTION_OPT_IN_VALUE = 'true';
