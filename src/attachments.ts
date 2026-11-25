import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_TOTAL_BYTES,
} from './constants.js';
import { AppError } from './errors.js';
import { assertSafeFilename } from './validation.js';

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

function assertRelativeSafe(relativePath: string): void {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new AppError('attachment', '附件 relativePath 无效。');
  }
  if (
    relativePath.includes('\0') ||
    relativePath.includes('\r') ||
    relativePath.includes('\n')
  ) {
    throw new AppError('attachment', '附件路径含非法控制字符。');
  }
  if (
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(relativePath) ||
    relativePath.startsWith('/') ||
    relativePath.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(relativePath)
  ) {
    throw new AppError(
      'attachment',
      '附件路径必须是相对路径，禁止 URL、绝对路径或盘符路径。',
    );
  }
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));
  if (
    normalized.startsWith('../') ||
    normalized === '..' ||
    normalized.includes('/../')
  ) {
    throw new AppError('attachment', '附件路径不得包含父目录穿越。');
  }
}

/**
 * 在配置的根目录下安全读取附件为 Buffer。
 * 使用 realpath 校验包含关系；拒绝符号链接逃逸与非常规文件。
 */
export async function loadAttachmentsUnderRoot(
  rootConfigured: string | undefined,
  items: readonly AttachmentInput[] | undefined,
): Promise<LoadedAttachment[]> {
  if (!items || items.length === 0) {
    return [];
  }
  if (items.length > MAX_ATTACHMENTS) {
    throw new AppError(
      'attachment',
      `附件数量超过上限 ${MAX_ATTACHMENTS}。`,
    );
  }
  if (!rootConfigured) {
    throw new AppError(
      'attachment',
      '未配置 MAIL_ATTACHMENT_ROOT，拒绝读取任何本地文件。',
    );
  }

  let rootReal: string;
  try {
    rootReal = await fs.realpath(rootConfigured);
  } catch {
    throw new AppError('attachment', 'MAIL_ATTACHMENT_ROOT 不可用或不存在。');
  }

  const rootStat = await fs.stat(rootReal);
  if (!rootStat.isDirectory()) {
    throw new AppError('attachment', 'MAIL_ATTACHMENT_ROOT 必须是目录。');
  }

  const loaded: LoadedAttachment[] = [];
  let total = 0;

  for (const item of items) {
    assertRelativeSafe(item.relativePath);
    const safeName = assertSafeFilename(item.filename);

    const joined = path.resolve(rootReal, item.relativePath);
    // 打开前先用 realpath；若文件是 symlink，realpath 会解析到目标
    let fileReal: string;
    try {
      fileReal = await fs.realpath(joined);
    } catch {
      throw new AppError('attachment', `附件不可读：${safeName}`);
    }

    const rel = path.relative(rootReal, fileReal);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new AppError(
        'attachment',
        '附件路径逃逸出 MAIL_ATTACHMENT_ROOT（可能由符号链接引起），已拒绝。',
      );
    }

    // 使用 O_NOFOLLOW 语义：先 lstat 拒绝 symlink 作为“打开目标”的入口逃逸
    // （realpath 已解析，但我们额外要求最终路径仍在根内，且为常规文件）
    const lst = await fs.lstat(joined);
    if (lst.isSymbolicLink()) {
      // 即使目标在根内，也禁止通过 symlink 引用，降低逃逸与意外读取风险
      throw new AppError(
        'attachment',
        '禁止通过符号链接读取附件。',
      );
    }

    const st = await fs.stat(fileReal);
    if (!st.isFile()) {
      throw new AppError('attachment', '附件必须是常规文件。');
    }
    if (st.size > MAX_ATTACHMENT_BYTES) {
      throw new AppError(
        'attachment',
        `单个附件超过 ${MAX_ATTACHMENT_BYTES} 字节上限。`,
      );
    }
    total += st.size;
    if (total > MAX_ATTACHMENTS_TOTAL_BYTES) {
      throw new AppError(
        'attachment',
        `附件合计超过 ${MAX_ATTACHMENTS_TOTAL_BYTES} 字节上限。`,
      );
    }

    const fh = await fs.open(fileReal, 'r');
    try {
      const buf = Buffer.alloc(st.size);
      const { bytesRead } = await fh.read(buf, 0, st.size, 0);
      if (bytesRead !== st.size) {
        throw new AppError('attachment', '附件读取不完整。');
      }
      loaded.push({ filename: safeName, content: buf });
    } finally {
      await fh.close();
    }
  }

  return loaded;
}
