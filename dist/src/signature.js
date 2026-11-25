import { assertBodyContent } from './validation.js';
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function signatureAlreadyPresent(body, signature) {
    if (body.includes(signature)) {
        return true;
    }
    const src = signature.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    return src !== undefined && src !== '' && body.includes(src);
}
/**
 * 把环境变量中的签名附到正文末尾。
 * 未配置签名时原样返回。正文里已经包含同一段签名或同一张图片地址时不重复追加。
 */
export function appendConfiguredSignature(config, text, html) {
    let nextText = text;
    let nextHtml = html;
    const sigText = config.signatureText;
    const sigHtml = config.signatureHtml;
    if (nextText !== undefined && sigText && !signatureAlreadyPresent(nextText, sigText)) {
        nextText = `${nextText.replace(/\s+$/, '')}\n\n${sigText}`;
    }
    if (sigHtml && (nextHtml === undefined || !signatureAlreadyPresent(nextHtml, sigHtml))) {
        if (nextHtml === undefined && nextText !== undefined) {
            const visible = escapeHtml(text ?? '').replace(/\n/g, '<br>\n');
            nextHtml = `<div style="white-space:pre-wrap">${visible}</div>\n${sigHtml}`;
        }
        else if (nextHtml !== undefined) {
            nextHtml = `${nextHtml}\n${sigHtml}`;
        }
    }
    assertBodyContent(nextText, nextHtml);
    return {
        ...(nextText !== undefined ? { text: nextText } : {}),
        ...(nextHtml !== undefined ? { html: nextHtml } : {}),
    };
}
//# sourceMappingURL=signature.js.map