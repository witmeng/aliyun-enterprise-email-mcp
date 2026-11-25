import { assertRecipientsAllowed } from '../allowlist.js';
import { loadAttachmentsUnderRoot } from '../attachments.js';
import { assertSendPolicy, requireSmtpCredentials } from '../config.js';
import { AppError, toSafeErrorMessage } from '../errors.js';
import { parseSendEmailInput } from '../schemas/email.js';
import { appendConfiguredSignature } from '../signature.js';
import { sendSmtp } from '../smtp/transport.js';
export const SEND_EMAIL_DESCRIPTION = `通过阿里云企业邮 SMTP 向外发送一封电子邮件（真实外发）。

【宿主必须遵守的人类审批要求——本工具没有“确认布尔值”可当作批准】
1. 在调用本工具之前，宿主必须向人类用户展示完整草稿（发件人=SMTP_USER、全部 to/cc/bcc、主题、正文、附件名）。
2. 必须获得人类用户的明确批准后才能调用；不得用参数里的假确认字段冒充批准。
3. 本工具会真实连接外部 SMTP 并尝试投递；调用即视为已完成上述流程。

安全与限制：
- From 固定为 SMTP_USER，调用方不可覆盖。
- 所有信封收件人必须命中 MAIL_RECIPIENT_ALLOWLIST（默认失败关闭）。
- 生产环境另需 MAIL_PRODUCTION_SEND_OPT_IN=true（不能替代人类批准）。
- 附件仅允许 MAIL_ATTACHMENT_ROOT 下常规本地文件，以 Buffer 提交，禁止路径逃逸。
- 若环境变量配置了 MAIL_SIGNATURE_HTML / MAIL_SIGNATURE_TEXT，发送时会自动附在正文末尾。宿主展示草稿时必须包含这段签名。正文里已有同一签名或同一图片地址时不会重复追加。
- 超时/网络/未知错误时结果可能不确定：请勿自动重试。
- accepted 仅表示 SMTP 接受，不代表最终投递；SMTP-only 不保证写入发件箱。`;
export async function handleSendEmail(config, transportFactory, rawArgs) {
    try {
        const input = parseSendEmailInput(rawArgs);
        assertSendPolicy(config);
        const { user } = requireSmtpCredentials(config);
        const envelope = [
            ...input.to,
            ...(input.cc ?? []),
            ...(input.bcc ?? []),
        ];
        assertRecipientsAllowed(config, envelope);
        const attachments = await loadAttachmentsUnderRoot(config.attachmentRoot, input.attachments);
        const signed = appendConfiguredSignature(config, input.text, input.html);
        const result = await sendSmtp(transportFactory, config, {
            from: user,
            to: input.to,
            ...(input.cc && input.cc.length > 0 ? { cc: input.cc } : {}),
            ...(input.bcc && input.bcc.length > 0 ? { bcc: input.bcc } : {}),
            subject: input.subject,
            ...(signed.text !== undefined ? { text: signed.text } : {}),
            ...(signed.html !== undefined ? { html: signed.html } : {}),
            ...(attachments.length > 0
                ? {
                    attachments: attachments.map((a) => ({
                        filename: a.filename,
                        content: a.content,
                    })),
                }
                : {}),
        });
        const payload = {
            ok: true,
            ...result,
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            structuredContent: payload,
        };
    }
    catch (err) {
        const uncertain = err instanceof AppError && err.uncertain;
        const payload = {
            ok: false,
            error: toSafeErrorMessage(err),
            kind: err instanceof AppError ? err.kind : 'internal',
            uncertain,
            doNotAutoRetry: uncertain || (err instanceof AppError && !err.retrySafe),
        };
        if (uncertain) {
            payload.advice =
                '结果不确定：请勿自动重试；请人工确认邮件是否已发出后再决定。';
        }
        return {
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            structuredContent: payload,
            isError: true,
        };
    }
}
//# sourceMappingURL=send_email.js.map