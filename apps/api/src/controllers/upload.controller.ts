import { Response } from 'express';
import { uploadImage } from '../config/cloudinary.js';
import { AuthRequest } from '../middleware/auth.js';

export async function uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
      return;
    }

    const result = await uploadImage(req.file.buffer, 'deliveries/photos', {
      transformation: [
        { width: 1280, height: 1280, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

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

    const result = await uploadImage(req.file.buffer, 'deliveries/signatures', {
      transformation: [
        { width: 400, height: 200, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });

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
