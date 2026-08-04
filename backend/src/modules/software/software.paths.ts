import { resolve } from 'path';

/** Single upload directory shared by multer and SoftwareService. */
export const SOFTWARE_UPLOAD_DIR = resolve(__dirname, '..', '..', '..', '..', 'uploads', 'software');
