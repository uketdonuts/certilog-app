'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AppInfo {
  version: string;
  size: string;
  lastUpdated: string;
  buildDate: string;
  available: boolean;
}

export default function DownloadPage() {
  const [appInfo, setAppInfo] = useState<AppInfo>({
    version: '-',
    size: '-',
    lastUpdated: '-',
    buildDate: '-',
    available: false,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkApkAvailability();
  }, []);

  const checkApkAvailability = async () => {
    try {
      // Use the dynamic API route which reads directly from filesystem at runtime.
      // This bypasses Next.js static file caching issues that occur when new APKs
      // are added to the mounted volume without rebuilding the container.
      // Cache-busting with unique timestamp to prevent browser/CDN caching.
      const cacheBuster = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const response = await fetch(`/download/apk?_cb=${cacheBuster}`, {
        method: 'HEAD',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const size = response.headers.get('content-length');
        const lastModified = response.headers.get('last-modified');
        // Extract version from Content-Disposition header (e.g., 'CertiLog-v1.0.21.apk')
        const disposition = response.headers.get('content-disposition') || '';
        const versionMatch = disposition.match(/v(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : '-';

        setAppInfo({
          version,
          size: size ? `${(parseInt(size) / 1024 / 1024).toFixed(1)} MB` : '-',
          lastUpdated: lastModified ? new Date(lastModified).toLocaleDateString('es-ES') : '-',
          buildDate: '-',
          available: true,
        });
      }
      // If 404, appInfo stays at default (available: false)
    } catch {
      // APK not available yet
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CertiLog</h1>
          <p className="text-gray-500 mt-1">App para Mensajeros</p>
        </div>

        {/* App Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Versión</span>
            <span className="font-semibold text-gray-900">{appInfo.version}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Tamaño</span>
            <span className="font-semibold text-gray-900">{appInfo.size}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Actualizado</span>
            <span className="font-semibold text-gray-900">{appInfo.lastUpdated}</span>
          </div>
        </div>

        {/* Download Button */}
        {checking ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Verificando disponibilidad...</span>
          </div>
        ) : appInfo.available ? (
          <a
            href="/download/apk"
            download={`CertiLog-v${appInfo.version}.apk`}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors"
          >
            <div className="flex items-center justify-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Descargar APK para Android
            </div>
          </a>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <svg
              className="w-12 h-12 text-yellow-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-yellow-800 font-medium">APK no disponible aún</p>
            <p className="text-yellow-600 text-sm mt-1">
              El administrador debe generar el APK primero
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">Instrucciones de instalación:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Descarga el archivo APK</li>
            <li>Abre el archivo descargado</li>
            <li>Si aparece un aviso, permite la instalación de fuentes desconocidas</li>
            <li>Sigue los pasos del instalador</li>
          </ol>
        </div>

        {/* Back to dashboard */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
