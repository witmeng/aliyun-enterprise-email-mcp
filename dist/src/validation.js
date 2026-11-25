import { AppError } from './errors.js';
import { MAX_ATTACHMENT_FILENAME_BYTES, MAX_BODY_TOTAL_BYTES, MAX_HTML_BYTES, MAX_SUBJECT_BYTES, MAX_TEXT_BYTES, } from './constants.js';
const CTRL_OR_NUL = /[\r\n\0\x1b]/;
/** 简化但严格的邮箱：本地部分与域名，禁止控制字符与空白 */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export function utf8ByteLength(value) {
    return Buffer.byteLength(value, 'utf8');
}
export function assertNoHeaderInjection(value, field) {
    if (CTRL_OR_NUL.test(value)) {
        throw new AppError('validation', `${field} 包含非法控制字符（CR/LF/NUL/ESC），已拒绝以防止头注入。`);
    }
}
export function assertPlainEmail(address, field) {
    const trimmed = address.trim();
    if (trimmed !== address) {
        throw new AppError('validation', `${field} 邮箱地址两侧不得含空白。`);
    }
    if (!trimmed || trimmed.length > 254) {
        throw new AppError('validation', `${field} 邮箱地址长度非法。`);
    }
    assertNoHeaderInjection(trimmed, field);
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('<') || trimmed.includes('>')) {
        throw new AppError('validation', `${field} 必须是单一明文邮箱地址，禁止显示名或分隔列表。`);
    }
    if (!EMAIL_RE.test(trimmed)) {
        throw new AppError('validation', `${field} 不是合法的明文邮箱地址。`);
    }
    return trimmed;
}
export function assertSafeSubject(subject) {
    assertNoHeaderInjection(subject, 'subject');
    const bytes = utf8ByteLength(subject);
    if (bytes === 0) {
        throw new AppError('validation', 'subject 不能为空。');
    }
    if (bytes > MAX_SUBJECT_BYTES) {
        throw new AppError('validation', `subject 超过 ${MAX_SUBJECT_BYTES} 字节限制（当前 ${bytes}）。`);
    }
    return subject;
}
export function assertBodyContent(text, html) {
    const hasText = typeof text === 'string' && text.length > 0;
    const hasHtml = typeof html === 'string' && html.length > 0;
    if (!hasText && !hasHtml) {
        throw new AppError('validation', '至少需要提供 text 或 html 正文之一。');
    }
    let total = 0;
    if (hasText) {
        // 正文允许换行；仅拒绝 NUL（头注入检查适用于地址/主题/附件名，不适用于正文）
        if (/\0/.test(text)) {
            throw new AppError('validation', 'text 包含 NUL，已拒绝。');
        }
        const n = utf8ByteLength(text);
        if (n > MAX_TEXT_BYTES) {
            throw new AppError('validation', `text 超过 ${MAX_TEXT_BYTES} 字节限制。`);
        }
        total += n;
    }
    if (hasHtml) {
        if (/\0/.test(html)) {
            throw new AppError('validation', 'html 包含 NUL，已拒绝。');
        }
        const n = utf8ByteLength(html);
        if (n > MAX_HTML_BYTES) {
            throw new AppError('validation', `html 超过 ${MAX_HTML_BYTES} 字节限制。`);
        }
        total += n;
    }
    if (total > MAX_BODY_TOTAL_BYTES) {
        throw new AppError('validation', `text+html 合计超过 ${MAX_BODY_TOTAL_BYTES} 字节限制。`);
    }
}
export function assertSafeFilename(filename) {
    assertNoHeaderInjection(filename, 'attachment.filename');
    if (!filename || filename === '.' || filename === '..') {
        throw new AppError('validation', '附件文件名非法。');
    }
    if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
        throw new AppError('validation', '附件文件名不得包含路径分隔符。');
    }
    if (utf8ByteLength(filename) > MAX_ATTACHMENT_FILENAME_BYTES) {
        throw new AppError('validation', '附件文件名过长。');
    }
    return filename;
}
/** 校验可解析的 DNS 主机名（禁止 URL、路径、空格） */
export function assertDnsHostname(host) {
    const trimmed = host.trim();
    if (trimmed !== host) {
        throw new AppError('config', 'SMTP_HOST 两侧不得含空白。');
    }
    if (!trimmed || trimmed.length > 253) {
        throw new AppError('config', 'SMTP_HOST 长度非法。');
    }
    assertNoHeaderInjection(trimmed, 'SMTP_HOST');
    if (trimmed.includes('://') ||
        trimmed.includes('/') ||
        trimmed.includes('\\') ||
        trimmed.includes('@') ||
        trimmed.includes(' ')) {
        throw new AppError('config', 'SMTP_HOST 必须是 DNS 主机名，不能是 URL 或路径。');
    }
    // IPv4 或主机名
    const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    const hostname = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    if (!ipv4.test(trimmed) && !hostname.test(trimmed)) {
        throw new AppError('config', 'SMTP_HOST 不是合法的 DNS 主机名或 IPv4。');
    }
    return trimmed;
}
//# sourceMappingURL=validation.js.map