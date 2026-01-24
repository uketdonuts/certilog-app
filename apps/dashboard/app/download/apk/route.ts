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

  const latestPath = path.join(downloadsDir, 'certilog-latest.apk');
  if (fs.existsSync(latestPath)) {
    const filename = versionInfo?.version
      ? `CertiLog-v${versionInfo.version}.apk`
      : 'CertiLog.apk';
    return { filePath: latestPath, downloadName: filename };
  }

  if (versionInfo?.version) {
    const versionedPath = path.join(downloadsDir, `certilog-v${versionInfo.version}.apk`);
    if (fs.existsSync(versionedPath)) {
      return { filePath: versionedPath, downloadName: `CertiLog-v${versionInfo.version}.apk` };
    }
  }

  return null;
}

function readVersionInfo(): VersionInfo | null {
  try {
    const versionFile = path.join(process.cwd(), 'public', 'app-version.json');
    if (!fs.existsSync(versionFile)) return null;
    const raw = fs.readFileSync(versionFile, 'utf8');
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

  // If we resolved the "latest" file but we have a version, redirect to the
  // versioned static file path. This avoids stale upstream caches returning an
  // old Content-Disposition header (which caused downloads to be named
  // 'CertiLog.apk'). Static files are served from /downloads and will use the
  // real filename in the URL.
  const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
  const isLatest = path.basename(resolved.filePath).toLowerCase() === 'certilog-latest.apk';
  if (isLatest && versionInfo?.version) {
    const target = `/downloads/certilog-v${versionInfo.version}.apk`;
    return Response.redirect(target, 302);
  }

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
