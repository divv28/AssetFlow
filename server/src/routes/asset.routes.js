import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  duplicateAsset,
  updateAssetStatus,
  deleteAsset,
  uploadAssetDocument,
  getAssetQrCode,
  searchAssets,
  allocateAsset,
} from '../controllers/asset.controller.js';

// Multer Storage Configuration (stores locally in server/uploads/assets)
// Note: In production environments, this storage mechanism should be swapped with an S3-compatible cloud storage solution.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/assets/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Cap size at 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Upload failed: Only JPEG, JPG, PNG, WEBP and PDF files up to 5MB are allowed!'));
  },
});

const router = Router();

// Require authentication for all endpoints
router.use(authenticateToken);

// Read-only routes (scoped by role inside the Service layer)
router.get('/', getAssets);
router.get('/search', searchAssets);
router.get('/:id', getAssetById);
router.get('/:id/qr', getAssetQrCode);

// Write routes (Restricted to ADMIN, ASSET_MANAGER, and DEPARTMENT_HEAD roles)
router.post('/', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), createAsset);
router.put('/:id', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), updateAsset);
router.patch('/:id/status', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), updateAssetStatus);
router.patch('/:id/allocate', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), allocateAsset);
router.post('/:id/duplicate', authorizeRoles('ADMIN', 'ASSET_MANAGER'), duplicateAsset);
router.delete('/:id', authorizeRoles('ADMIN', 'ASSET_MANAGER'), deleteAsset);
router.post('/:id/documents', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), upload.single('file'), uploadAssetDocument);

export default router;
