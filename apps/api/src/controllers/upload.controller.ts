import { Response } from 'express';
import { uploadImage, uploadVideo as uploadVideoFile } from '../config/storage.js';
import { AuthRequest } from '../middleware/auth.js';

export async function uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
      return;
    }

    const result = await uploadImage(req.file.buffer, 'deliveries/photos');

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ success: false, error: 'Error al subir la imagen' });
  }
}

export async function uploadSignature(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se proporcionó ninguna firma' });
      return;
    }

    const result = await uploadImage(req.file.buffer, 'deliveries/signatures');

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ success: false, error: 'Error al subir la firma' });
  }
}

export async function uploadVideo(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se proporcionó ningún video' });
      return;
    }

    const result = await uploadVideoFile(req.file.buffer, 'deliveries/videos');

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ success: false, error: 'Error al subir el video' });
  }
}
