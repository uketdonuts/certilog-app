import path from 'path';

// Centralized filesystem paths so uploads work consistently across Docker/workdir setups.
// In Docker our container mounts `/app/uploads`, but the runtime WORKDIR is `/app/apps/api`.
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');
