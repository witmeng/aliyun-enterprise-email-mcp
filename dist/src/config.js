import { DEFAULT_CONNECTION_TIMEOUT_MS, DEFAULT_GREETING_TIMEOUT_MS, DEFAULT_SEND_TIMEOUT_MS, DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT, DEFAULT_SOCKET_TIMEOUT_MS, PRODUCTION_OPT_IN_VALUE, } from './constants.js';
import { AppError } from './errors.js';
import { assertDnsHostname, assertPlainEmail } from './validation.js';
function readEnv(env, key) {
    const v = env[key];
    if (v === undefined || v === '') {
        return undefined;
    }
    return v;
}
function parsePositiveInt(raw, fallback, name, max = 600_000) {
    if (raw === undefined) {
        return fallback;
    }
    if (!/^\d+$/.test(raw)) {
        throw new AppError('config', `${name} 必须是正整数毫秒值。`);
    }
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) {
        throw new AppError('config', `${name} 超出允许范围。`);
    }
    return n;
}
function parseAllowlist(raw) {
    if (raw === undefined || raw.trim() === '') {
        return new Set();
    }
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const set = new Set();
    for (const p of parts) {
        const email = assertPlainEmail(p, 'MAIL_RECIPIENT_ALLOWLIST');
        set.add(email.toLowerCase());
    }
    return set;
}
function parseTlsMode(raw, port) {
    if (raw === undefined || raw === '') {
        return port === 465 ? 'implicit' : 'starttls';
    }
    const v = raw.toLowerCase();
    if (v === 'implicit' || v === 'starttls') {
        return v;
    }
    throw new AppError('config', 'SMTP_TLS_MODE 仅支持 implicit（隐式 TLS）或 starttls（STARTTLS，仍校验证书）。');
}
/**
 * 从环境解析配置。不加载 dotenv；不访问网络。
 * 启动/listTools 可在无凭据时调用。
 */
export function loadConfig(env = process.env) {
    const smtpHost = assertDnsHostname(readEnv(env, 'SMTP_HOST') ?? DEFAULT_SMTP_HOST);
    const portRaw = readEnv(env, 'SMTP_PORT');
    const smtpPort = parsePositiveInt(portRaw, DEFAULT_SMTP_PORT, 'SMTP_PORT', 65535);
    if (smtpPort < 1 || smtpPort > 65535) {
        throw new AppError('config', 'SMTP_PORT 必须在 1–65535。');
    }
    const tlsMode = parseTlsMode(readEnv(env, 'SMTP_TLS_MODE'), smtpPort);
    const smtpUserRaw = readEnv(env, 'SMTP_USER');
    const smtpUser = smtpUserRaw ? assertPlainEmail(smtpUserRaw, 'SMTP_USER') : undefined;
    const smtpPassword = readEnv(env, 'SMTP_PASSWORD');
    return {
        smtpUser,
        smtpPassword,
        smtpHost,
        smtpPort,
        tlsMode,
        rejectUnauthorized: true,
        recipientAllowlist: parseAllowlist(readEnv(env, 'MAIL_RECIPIENT_ALLOWLIST')),
        productionSendOptIn: (readEnv(env, 'MAIL_PRODUCTION_SEND_OPT_IN') ?? '').toLowerCase() ===
            PRODUCTION_OPT_IN_VALUE,
        nodeEnv: readEnv(env, 'NODE_ENV') ?? 'development',
        attachmentRoot: readEnv(env, 'MAIL_ATTACHMENT_ROOT'),
        signatureHtml: readEnv(env, 'MAIL_SIGNATURE_HTML'),
        signatureText: readEnv(env, 'MAIL_SIGNATURE_TEXT'),
        connectionTimeoutMs: parsePositiveInt(readEnv(env, 'SMTP_CONNECTION_TIMEOUT_MS'), DEFAULT_CONNECTION_TIMEOUT_MS, 'SMTP_CONNECTION_TIMEOUT_MS'),
        greetingTimeoutMs: parsePositiveInt(readEnv(env, 'SMTP_GREETING_TIMEOUT_MS'), DEFAULT_GREETING_TIMEOUT_MS, 'SMTP_GREETING_TIMEOUT_MS'),
        socketTimeoutMs: parsePositiveInt(readEnv(env, 'SMTP_SOCKET_TIMEOUT_MS'), DEFAULT_SOCKET_TIMEOUT_MS, 'SMTP_SOCKET_TIMEOUT_MS'),
        sendTimeoutMs: parsePositiveInt(readEnv(env, 'SMTP_SEND_TIMEOUT_MS'), DEFAULT_SEND_TIMEOUT_MS, 'SMTP_SEND_TIMEOUT_MS'),
    };
}
/** 发送/校验所需凭据；启动阶段不调用。 */
export function requireSmtpCredentials(config) {
    if (!config.smtpUser || !config.smtpPassword) {
        throw new AppError('config', '缺少 SMTP_USER / SMTP_PASSWORD。请仅通过环境注入，勿写入代码或日志。');
    }
    return { user: config.smtpUser, pass: config.smtpPassword };
}
/**
 * 发送策略：
 * - 收件人由调用参数 to/cc/bcc 决定。未配置白名单时不限制收件人。
 * - 配置了 MAIL_RECIPIENT_ALLOWLIST 时，收件人必须全部命中。
 * - NODE_ENV=production 时必须显式 MAIL_PRODUCTION_SEND_OPT_IN=true
 */
export function assertSendPolicy(config) {
    if (config.nodeEnv === 'production' && !config.productionSendOptIn) {
        throw new AppError('config', '生产环境拒绝发送：请将 MAIL_PRODUCTION_SEND_OPT_IN=true 作为有文档记录的显式选择加入。此标志不能替代宿主向人类展示完整草稿并获得明确批准。');
    }
}
//# sourceMappingURL=config.js.map