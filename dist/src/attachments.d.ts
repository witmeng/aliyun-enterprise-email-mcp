export interface AttachmentInput {
    /** 相对于 MAIL_ATTACHMENT_ROOT 的相对路径，禁止覆盖根目录 */
    relativePath: string;
    /** 邮件中显示的安全文件名 */
    filename: string;
}
export interface LoadedAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}
/**
 * 在配置的根目录下安全读取附件为 Buffer。
 * 使用 realpath 校验包含关系；拒绝符号链接逃逸与非常规文件。
 */
export declare function loadAttachmentsUnderRoot(rootConfigured: string | undefined, items: readonly AttachmentInput[] | undefined): Promise<LoadedAttachment[]>;
//# sourceMappingURL=attachments.d.ts.map