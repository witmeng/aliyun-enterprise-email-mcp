#!/usr/bin/env node
/**
 * 将 npm pack 产物安装到临时本地目录，启动 bin 做 initialize/listTools，
 * 不注入 SMTP 机密，不连接真实 SMTP。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? root,
      env: opts.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function rpcLine(obj) {
  return `${JSON.stringify(obj)}\n`;
}

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mail-mcp-smoke-'));
  let tgzPath;
  try {
    const pack = await run('npm', ['pack', '--json'], { cwd: root });
    if (pack.code !== 0) {
      throw new Error(`npm pack failed: ${pack.stderr}`);
    }
    const packed = JSON.parse(pack.stdout);
    const tgzName = packed[0]?.filename;
    if (!tgzName) {
      throw new Error('npm pack 未返回文件名');
    }
    tgzPath = path.join(root, tgzName);
    const installDir = path.join(tmp, 'app');
    await fs.mkdir(installDir);
    await fs.writeFile(
      path.join(installDir, 'package.json'),
      JSON.stringify({ name: 'smoke-consumer', private: true, type: 'module' }),
    );
    const install = await run('npm', ['install', tgzPath], {
      cwd: installDir,
      env: process.env,
    });
    if (install.code !== 0) {
      throw new Error(`npm install tgz failed: ${install.stderr}`);
    }

    const binJs = path.join(
      installDir,
      'node_modules',
      'aliyun-enterprise-email-mcp',
      'dist',
      'src',
      'index.js',
    );

    const child = spawn(process.execPath, [binJs], {
      cwd: installDir,
      env: {
        PATH: process.env.PATH ?? '/usr/bin',
        HOME: process.env.HOME ?? '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.stdin.write(
      rpcLine({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'smoke', version: '1.0.0' },
        },
      }),
    );
    child.stdin.write(
      rpcLine({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    );
    child.stdin.write(
      rpcLine({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    );

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (
        stdout.includes('verify_smtp_connection') &&
        stdout.includes('send_email')
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('close', resolve));

    if (
      !stdout.includes('verify_smtp_connection') ||
      !stdout.includes('send_email')
    ) {
      throw new Error(
        `smoke listTools 失败。stdout=${stdout.slice(0, 800)} stderr=${stderr.slice(0, 800)}`,
      );
    }
    // 工具说明会写明环境变量名；只把说明之外的出现视为泄露。
    const documentedName =
      '需要环境变量 SMTP_USER / SMTP_PASSWORD（启动与 listTools 不需要凭据）。';
    const stdoutRest = stdout.split(documentedName).join('');
    if (stdoutRest.includes('SMTP_PASSWORD') || stderr.includes('SMTP_PASSWORD')) {
      throw new Error('smoke 输出疑似泄露 SMTP_PASSWORD');
    }

    console.log('package-smoke OK:', tgzName);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
    if (tgzPath) {
      await fs.unlink(tgzPath).catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
