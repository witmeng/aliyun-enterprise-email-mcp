import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, before, after } from 'node:test';
import { loadAttachmentsUnderRoot } from '../src/attachments.js';
import { AppError } from '../src/errors.js';

describe('attachments', () => {
  let root: string;
  let outside: string;

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'mail-mcp-att-'));
    outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mail-mcp-out-'));
    await fs.writeFile(path.join(root, 'ok.txt'), 'hello-att');
    await fs.writeFile(path.join(outside, 'secret.txt'), 'secret');
    await fs.symlink(
      path.join(outside, 'secret.txt'),
      path.join(root, 'escape.txt'),
    );
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });

  it('读取根目录下常规文件为 Buffer', async () => {
    const loaded = await loadAttachmentsUnderRoot(root, [
      { relativePath: 'ok.txt', filename: 'ok.txt' },
    ]);
    assert.equal(loaded.length, 1);
    assert.ok(Buffer.isBuffer(loaded[0]!.content));
    assert.equal(loaded[0]!.content.toString('utf8'), 'hello-att');
  });

  it('拒绝符号链接逃逸', async () => {
    await assert.rejects(
      () =>
        loadAttachmentsUnderRoot(root, [
          { relativePath: 'escape.txt', filename: 'escape.txt' },
        ]),
      AppError,
    );
  });

  it('拒绝绝对路径与 URL 及未配置根', async () => {
    await assert.rejects(
      () =>
        loadAttachmentsUnderRoot(root, [
          { relativePath: '/etc/passwd', filename: 'x.txt' },
        ]),
      AppError,
    );
    await assert.rejects(
      () =>
        loadAttachmentsUnderRoot(root, [
          { relativePath: 'https://example.com/a', filename: 'x.txt' },
        ]),
      AppError,
    );
    await assert.rejects(
      () =>
        loadAttachmentsUnderRoot(undefined, [
          { relativePath: 'ok.txt', filename: 'ok.txt' },
        ]),
      AppError,
    );
  });

  it('拒绝父目录穿越', async () => {
    await assert.rejects(
      () =>
        loadAttachmentsUnderRoot(root, [
          { relativePath: '../secret.txt', filename: 'x.txt' },
        ]),
      AppError,
    );
  });
});
