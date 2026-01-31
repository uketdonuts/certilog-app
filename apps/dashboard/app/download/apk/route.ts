import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export const runtime = 'nodejs';

type VersionInfo = {
  version: string;
  buildDate?: string;
  buildNumber?: number;
};

function noCacheHeaders(filename: string) {
  return {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  } as Record<string, string>;
}

function resolveApkPath(versionInfo: VersionInfo | null) {
  const publicDir = path.join(process.cwd(), 'public');
  const downloadsDir = path.join(publicDir, 'downloads');

  // First try versioned APK from version info
  if (versionInfo?.version) {
    const versionedPath = path.join(downloadsDir, `certilog-v${versionInfo.version}.apk`);
    if (fs.existsSync(versionedPath)) {
      return { filePath: versionedPath, downloadName: `CertiLog-v${versionInfo.version}.apk` };
    }
  }

  // Fallback: find any APK in the downloads directory (should only be one after build)
  const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.apk') && !f.includes('history'));
  if (files.length > 0) {
    const apkFile = files[0];
    const filePath = path.join(downloadsDir, apkFile);
    const downloadName = versionInfo?.version
      ? `CertiLog-v${versionInfo.version}.apk`
      : apkFile.replace('certilog-', 'CertiLog-');
    return { filePath, downloadName };
  }

  return null;
}

function readVersionInfo(): VersionInfo | null {
  try {
    const versionFile = path.join(process.cwd(), 'public', 'app-version.json');
    if (!fs.existsSync(versionFile)) return null;
    let raw = fs.readFileSync(versionFile, 'utf8');
    // Remove BOM (Byte Order Mark) if present - common with Windows-generated files
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    return JSON.parse(raw) as VersionInfo;
  } catch {
    return null;
  }
}

export async function GET() {
  const versionInfo = readVersionInfo();
  const resolved = resolveApkPath(versionInfo);
  if (!resolved) {
    return new Response('APK not available', { status: 404 });
  }

  // Serve the file directly from filesystem - no redirects to avoid static cache issues
  const stat = fs.statSync(resolved.filePath);
  const nodeStream = fs.createReadStream(resolved.filePath);
  const stream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(stream as any, {
    status: 200,
    headers: {
      ...noCacheHeaders(resolved.downloadName),
      'Content-Length': String(stat.size),
      'Last-Modified': stat.mtime.toUTCString(),
    },
  });
}

export async function HEAD() {
  const versionInfo = readVersionInfo();
  const resolved = resolveApkPath(versionInfo);
  if (!resolved) {
    return new Response(null, { status: 404 });
  }

  const stat = fs.statSync(resolved.filePath);
  return new Response(null, {
    status: 200,
    headers: {
      ...noCacheHeaders(resolved.downloadName),
      'Content-Length': String(stat.size),
      'Last-Modified': stat.mtime.toUTCString(),
    },
  });
}
