import { AppError } from './errors.js';
export function assertRecipientsAllowed(config, recipients) {
    if (config.recipientAllowlist.size === 0) {
        return;
    }
    const denied = [];
    for (const r of recipients) {
        if (!config.recipientAllowlist.has(r.toLowerCase())) {
            denied.push(r);
        }
    }
    if (denied.length > 0) {
        throw new AppError('allowlist', `以下收件人不在 MAIL_RECIPIENT_ALLOWLIST 中，已拒绝：${denied.join(', ')}`);
    }
}
//# sourceMappingURL=allowlist.js.map