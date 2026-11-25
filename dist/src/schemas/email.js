import { z } from 'zod';
import { MAX_BCC_RECIPIENTS, MAX_CC_RECIPIENTS, MAX_TO_RECIPIENTS, MAX_TOTAL_RECIPIENTS, MAX_ATTACHMENTS, } from '../constants.js';
import { assertBodyContent, assertPlainEmail, assertSafeFilename, assertSafeSubject, } from '../validation.js';
import { AppError } from '../errors.js';
const emailField = (label) => z.string().superRefine((val, ctx) => {
    try {
        assertPlainEmail(val, label);
    }
    catch (e) {
        ctx.addIssue({
            code: 'custom',
            message: e instanceof Error ? e.message : '邮箱非法',
        });
    }
});
const recipientArray = (label, max) => z
    .array(emailField(label))
    .max(max, `${label} 最多 ${max} 个地址`)
    .optional();
const attachmentSchema = z
    .object({
    relativePath: z
        .string()
        .min(1)
        .max(512)
        .describe('相对于 MAIL_ATTACHMENT_ROOT 的相对路径，不能覆盖根目录'),
    filename: z
        .string()
        .min(1)
        .max(200)
        .describe('邮件中显示的安全文件名（非路径）'),
})
    .strict()
    .superRefine((val, ctx) => {
    try {
        assertSafeFilename(val.filename);
    }
    catch (e) {
        ctx.addIssue({
            code: 'custom',
            message: e instanceof Error ? e.message : '文件名非法',
            path: ['filename'],
        });
    }
});
export const SendEmailInputSchema = z
    .object({
    to: z
        .array(emailField('to'))
        .min(1, 'to 至少需要一个收件人')
        .max(MAX_TO_RECIPIENTS),
    cc: recipientArray('cc', MAX_CC_RECIPIENTS),
    bcc: recipientArray('bcc', MAX_BCC_RECIPIENTS),
    subject: z.string().min(1).max(998),
    text: z.string().max(600_000).optional(),
    html: z.string().max(600_000).optional(),
    attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional(),
})
    .strict()
    .superRefine((val, ctx) => {
    try {
        assertSafeSubject(val.subject);
    }
    catch (e) {
        ctx.addIssue({
            code: 'custom',
            message: e instanceof Error ? e.message : 'subject 非法',
            path: ['subject'],
        });
    }
    try {
        assertBodyContent(val.text, val.html);
    }
    catch (e) {
        ctx.addIssue({
            code: 'custom',
            message: e instanceof Error ? e.message : '正文非法',
        });
    }
    const total = val.to.length + (val.cc?.length ?? 0) + (val.bcc?.length ?? 0);
    if (total > MAX_TOTAL_RECIPIENTS) {
        ctx.addIssue({
            code: 'custom',
            message: `to/cc/bcc 合计不得超过 ${MAX_TOTAL_RECIPIENTS}`,
        });
    }
});
export const VerifySmtpInputSchema = z.object({}).strict();
export function parseSendEmailInput(raw) {
    const parsed = SendEmailInputSchema.safeParse(raw);
    if (!parsed.success) {
        const err = parsed.error;
        const msg = Array.isArray(err.issues) && err.issues.length > 0
            ? err.issues.map((i) => i.message ?? 'invalid').join('; ')
            : (err.message ?? 'invalid');
        throw new AppError('validation', `参数校验失败：${msg}`);
    }
    return parsed.data;
}
//# sourceMappingURL=email.js.map