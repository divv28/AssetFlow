import assetService from '../services/asset.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { createAssetSchema, updateAssetSchema, changeStatusSchema, allocateAssetSchema } from '../validators/asset.validator.js';

/**
 * List Assets (Filterable, Paginated, Sorted)
 */
export const getAssets = asyncHandler(async (req, res) => {
  const result = await assetService.getAssets(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result.data, 'Assets retrieved successfully', result.meta));
});

/**
 * Get Single Asset Details by ID
 */
export const getAssetById = asyncHandler(async (req, res) => {
  const asset = await assetService.getAssetById(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, asset, 'Asset details retrieved successfully'));
});

/**
 * Register a new Asset (Admin/Asset Manager only)
 */
export const createAsset = asyncHandler(async (req, res) => {
  const validated = createAssetSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const asset = await assetService.createAsset(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, asset, 'Asset registered successfully'));
});

/**
 * Edit Asset details (Admin/Asset Manager only)
 */
export const updateAsset = asyncHandler(async (req, res) => {
  const validated = updateAssetSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const asset = await assetService.updateAsset(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, asset, 'Asset details updated successfully'));
});

/**
 * Duplicate an Asset (Admin/Asset Manager only)
 */
export const duplicateAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.duplicateAsset(req.params.id, req.user.uuid);
  return res.status(201).json(new ApiResponse(201, asset, `Asset duplicated successfully under tag ${asset.assetTag}`));
});

/**
 * Manual Status Transition (Admin/Asset Manager only)
 */
export const updateAssetStatus = asyncHandler(async (req, res) => {
  const validated = changeStatusSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const asset = await assetService.updateAssetStatus(
    req.params.id,
    validated.data.toStatus,
    validated.data.reason,
    req.user.uuid
  );
  return res.status(200).json(new ApiResponse(200, asset, `Asset lifecycle status updated to ${validated.data.toStatus}`));
});

/**
 * Soft Delete Asset (Admin/Asset Manager only)
 */
export const deleteAsset = asyncHandler(async (req, res) => {
  await assetService.softDeleteAsset(req.params.id, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, null, 'Asset has been successfully soft-deleted'));
});

/**
 * Upload Document/Photo (Admin/Asset Manager only)
 */
export const uploadAssetDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file was uploaded');
  }

  // Create document entry
  const fileUrl = `/uploads/assets/${req.file.filename}`;
  // Map mime types to simple file types e.g. "photo", "invoice", "manual"
  let fileType = 'document';
  if (req.file.mimetype.startsWith('image/')) {
    fileType = 'photo';
  } else if (req.file.mimetype === 'application/pdf') {
    // Check if filename contains invoice or manual
    const nameLower = req.file.originalname.toLowerCase();
    if (nameLower.includes('invoice') || nameLower.includes('bill')) {
      fileType = 'invoice';
    } else if (nameLower.includes('manual') || nameLower.includes('guide')) {
      fileType = 'manual';
    }
  }

  const document = await assetService.addAssetDocument(
    req.params.id,
    fileUrl,
    fileType,
    req.user.uuid
  );

  return res.status(201).json(new ApiResponse(201, document, 'Document uploaded and attached successfully'));
});

/**
 * Download QR Code PNG Image
 */
export const getAssetQrCode = asyncHandler(async (req, res) => {
  const buffer = await assetService.getQrCodeBuffer(req.params.id, req.user);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="QR-${req.params.id}.png"`);
  return res.status(200).send(buffer);
});

/**
 * Debounced Global Search (Matches query searches)
 */
export const searchAssets = asyncHandler(async (req, res) => {
  const result = await assetService.getAssets({ search: req.query.q, limit: 10 }, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Global search results'));
});

/**
 * Allocate / Distribute Asset to an Employee
 */
export const allocateAsset = asyncHandler(async (req, res) => {
  const validated = allocateAssetSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const asset = await assetService.allocateAsset(
    req.params.id,
    validated.data.allocatedToId,
    validated.data.reason,
    req.user
  );

  const message = validated.data.allocatedToId
    ? 'Asset successfully distributed to employee'
    : 'Asset successfully returned to inventory';

  return res.status(200).json(new ApiResponse(200, asset, message));
});
