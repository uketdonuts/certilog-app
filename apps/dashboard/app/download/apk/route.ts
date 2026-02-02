import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  };
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

  // Fallback: find any APK in the downloads directory
  if (!fs.existsSync(downloadsDir)) {
    return null;
  }
  
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
    // Remove BOM (Byte Order Mark) if present
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    return JSON.parse(raw) as VersionInfo;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const versionInfo = readVersionInfo();
  const resolved = resolveApkPath(versionInfo);
  
  if (!resolved) {
    return new Response('APK not available', { status: 404 });
  }

  try {
    // Use Blob API (Node.js 20+) - more reliable than streams
    const blob = await fs.openAsBlob(resolved.filePath);
    
    return new Response(blob, {
      status: 200,
      headers: {
        ...noCacheHeaders(resolved.downloadName),
        'Content-Length': String(blob.size),
        'Last-Modified': fs.statSync(resolved.filePath).mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error('Error serving APK:', error);
    return new Response('Error reading APK file', { status: 500 });
  }
}

export async function HEAD(request: Request) {
  const versionInfo = readVersionInfo();
  const resolved = resolveApkPath(versionInfo);
  
  if (!resolved) {
    return new Response(null, { status: 404 });
  }

  try {
    const stat = fs.statSync(resolved.filePath);
    return new Response(null, {
      status: 200,
      headers: {
        ...noCacheHeaders(resolved.downloadName),
        'Content-Length': String(stat.size),
        'Last-Modified': stat.mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error('Error stating APK:', error);
    return new Response(null, { status: 500 });
  }
}
