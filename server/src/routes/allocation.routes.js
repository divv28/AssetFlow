import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
  getAllocations, 
  getAllocationById, 
  allocateAsset, 
  updateAllocation, 
  requestTransfer, 
  approveTransfer, 
  rejectTransfer, 
  requestReturn, 
  approveReturn, 
  rejectReturn,
  getAllocationHistory,
  getTransferRequests,
  getReturnRequests
} from '../controllers/allocation.controller.js';

// Multer Storage Configuration (stores locally in server/uploads/assets)
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
    cb(null, `return-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// 1. Allocations List & Details
router.get('/', getAllocations);
router.get('/history', getAllocationHistory);
router.get('/:id', getAllocationById);

// 2. Direct Allocate (DEPARTMENT_HEAD scoped to their own dept via service layer)
router.post('/', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), allocateAsset);
router.patch('/:id', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), updateAllocation);

// 3. Transfers (Requested, Approved, Rejected)
router.get('/transfers', getTransferRequests);
router.post('/transfers', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'), requestTransfer);
router.patch('/transfers/:id/approve', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), approveTransfer);
router.patch('/transfers/:id/reject', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), rejectTransfer);

// 4. Returns (Requested, Approved, Rejected)
router.get('/returns', getReturnRequests);
router.post('/returns', authorizeRoles('ADMIN', 'ASSET_MANAGER', 'EMPLOYEE'), upload.single('file'), requestReturn);
router.patch('/returns/:id/approve', authorizeRoles('ADMIN', 'ASSET_MANAGER'), approveReturn);
router.patch('/returns/:id/reject', authorizeRoles('ADMIN', 'ASSET_MANAGER'), rejectReturn);

export default router;
