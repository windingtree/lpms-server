import os from 'os';
import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middlewares/AuthMiddleware';
import storageController from '../controllers/StorageController';

export const upload = multer({ dest: os.tmpdir() });

export default (router: Router): void => {
  router.post(
    '/storage/file',
    authMiddleware,
    upload.single('file'),
    storageController.uploadFile
  );
};
