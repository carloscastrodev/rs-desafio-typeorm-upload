import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const tmpFolderPath = path.resolve(__dirname, '..', '..', 'tmp');
export default {
  directory: tmpFolderPath,
  storage: multer.diskStorage({
    destination: tmpFolderPath,
    filename(request, file, next) {
      const fileHash = crypto.randomBytes(10).toString('hex');
      const fileName = `${fileHash}-${file.originalname}`;

      return next(null, fileName);
    },
  }),
};
