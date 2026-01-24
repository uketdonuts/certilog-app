import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();

// File filter to only accept images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'));
  }
};

// Max file size: 10MB (before compression)
const maxSize = 10 * 1024 * 1024;

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
  },
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
    files: 5,
  },
}).array('files', 5);

// Video file filter
const videoFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten videos (MP4, MOV, AVI)'));
  }
};

// Max video size: 50MB
const maxVideoSize = 50 * 1024 * 1024;

export const uploadVideoSingle = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: maxVideoSize,
  },
}).single('file');

// Excel file filter
const excelFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Excel (XLSX, XLS) o CSV'));
  }
};

// Max Excel size: 5MB
const maxExcelSize = 5 * 1024 * 1024;

export const uploadExcel = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: maxExcelSize,
  },
}).single('file');
