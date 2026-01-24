import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

import { UPLOADS_DIR } from './paths.js';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

// Ensure upload directories exist
async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  _options?: { transformation?: object }
): Promise<UploadResult> {
  // Ensure the folder exists
  const uploadPath = path.join(UPLOADS_DIR, folder);
  await ensureDir(uploadPath);

  // Generate unique filename
  const uniqueId = crypto.randomUUID();
  const filename = `${uniqueId}.jpg`;
  const filePath = path.join(uploadPath, filename);

  // Write file to disk
  await writeFile(filePath, buffer);

  // Generate public URL (relative to /uploads)
  const publicId = `${folder}/${uniqueId}`;
  const url = `/uploads/${folder}/${filename}`;

  return {
    url,
    publicId,
    width: 0, // We don't process dimensions locally
    height: 0,
    format: 'jpg',
    bytes: buffer.length,
  };
}

export async function deleteImage(publicId: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, `${publicId}.jpg`);
  try {
    await unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

export async function uploadVideo(
  buffer: Buffer,
  folder: string
): Promise<UploadResult> {
  // Ensure the folder exists
  const uploadPath = path.join(UPLOADS_DIR, folder);
  await ensureDir(uploadPath);

  // Generate unique filename
  const uniqueId = crypto.randomUUID();
  const filename = `${uniqueId}.mp4`;
  const filePath = path.join(uploadPath, filename);

  // Write file to disk
  await writeFile(filePath, buffer);

  // Generate public URL (relative to /uploads)
  const publicId = `${folder}/${uniqueId}`;
  const url = `/uploads/${folder}/${filename}`;

  return {
    url,
    publicId,
    width: 0,
    height: 0,
    format: 'mp4',
    bytes: buffer.length,
  };
}
