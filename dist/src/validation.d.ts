export declare function utf8ByteLength(value: string): number;
export declare function assertNoHeaderInjection(value: string, field: string): void;
export declare function assertPlainEmail(address: string, field: string): string;
export declare function assertSafeSubject(subject: string): string;
export declare function assertBodyContent(text: string | undefined, html: string | undefined): void;
export declare function assertSafeFilename(filename: string): string;
/** 校验可解析的 DNS 主机名（禁止 URL、路径、空格） */
export declare function assertDnsHostname(host: string): string;
//# sourceMappingURL=validation.d.ts.map