import { z } from 'zod';
export declare const SendEmailInputSchema: z.ZodObject<{
    to: z.ZodArray<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    html: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        relativePath: z.ZodString;
        filename: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;
export declare const VerifySmtpInputSchema: z.ZodObject<{}, z.core.$strict>;
export type VerifySmtpInput = z.infer<typeof VerifySmtpInputSchema>;
export declare function parseSendEmailInput(raw: unknown): SendEmailInput;
//# sourceMappingURL=email.d.ts.map