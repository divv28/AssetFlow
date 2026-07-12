import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import { z } from 'zod';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FileUp, Info, ShieldCheck, DollarSign, Calendar, Paperclip } from 'lucide-react';

const createAssetSchema = z.object({
  name: z.string().trim().min(2, 'Asset name must be at least 2 characters long').max(100, 'Asset name cannot exceed 100 characters'),
  categoryId: z.string().uuid('Invalid category ID selection'),
  departmentId: z.string().optional().or(z.literal('')),
  serialNumber: z.string().trim().max(100).optional().or(z.literal('')),
  acquisitionDate: z.string().optional().or(z.literal('')),
  acquisitionCost: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  }, z.number().nonnegative('Acquisition cost must be positive').nullable().optional()),
  manufacturer: z.string().trim().max(100).optional().or(z.literal('')),
  vendor: z.string().trim().max(100).optional().or(z.literal('')),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).default('NEW'),
  location: z.string().trim().max(100).optional().or(z.literal('')),
  isBookable: z.boolean().default(false),
  warrantyExpiry: z.string().optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const RegisterAssetDrawer = ({ isOpen, onClose, assetId = null, onSuccess }) => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode = !!assetId;

  // Local state for file attachments during creation
  const [selectedFile, setSelectedFile] = useState(null);
  const [serverError, setServerError] = useState(null);

  // Fetch Categories for selection
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/api/categories', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Fetch Departments for selection
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/departments', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Form Setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      departmentId: '',
      serialNumber: '',
      acquisitionDate: '',
      acquisitionCost: '',
      manufacturer: '',
      vendor: '',
      condition: 'NEW',
      location: '',
      isBookable: false,
      warrantyExpiry: '',
      remarks: '',
    },
  });

  // Fetch Asset details if in edit mode
  useQuery({
    queryKey: ['asset-edit-details', assetId],
    queryFn: async () => {
      const res = await api.get(`/api/assets/${assetId}`);
      const data = res.data.data;
      
      // Load details into form
      setValue('name', data.name);
      setValue('categoryId', data.categoryId);
      setValue('departmentId', data.departmentId || '');
      setValue('serialNumber', data.serialNumber || '');
      setValue('acquisitionDate', data.acquisitionDate ? data.acquisitionDate.split('T')[0] : '');
      setValue('acquisitionCost', data.acquisitionCost || '');
      setValue('manufacturer', data.manufacturer || '');
      setValue('vendor', data.vendor || '');
      setValue('condition', data.condition);
      setValue('location', data.location || '');
      setValue('isBookable', data.isBookable);
      setValue('warrantyExpiry', data.warrantyExpiry ? data.warrantyExpiry.split('T')[0] : '');
      setValue('remarks', data.remarks || '');
      return data;
    },
    enabled: isOpen && isEditMode,
  });

  // Reset form state on open/close
  useEffect(() => {
    if (!isOpen) {
      reset({
        name: '',
        categoryId: '',
        departmentId: '',
        serialNumber: '',
        acquisitionDate: '',
        acquisitionCost: '',
        manufacturer: '',
        vendor: '',
        condition: 'NEW',
        location: '',
        isBookable: false,
        warrantyExpiry: '',
        remarks: '',
      });
      setSelectedFile(null);
      setServerError(null);
    } else if (user?.role === 'DEPARTMENT_HEAD' && user?.departmentId) {
      setValue('departmentId', user.departmentId);
    }
  }, [isOpen, reset, user, setValue]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      setServerError(null);
      const res = await api.post('/api/assets', formData);
      const newAsset = res.data.data;

      // Handle file attachment if present
      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('file', selectedFile);
        await api.post(`/api/assets/${newAsset.id}/documents`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return newAsset;
    },
    onSuccess: (data) => {
      addToast('success', `Asset ${data.assetTag} registered successfully!`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onSuccess(data);
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to register asset';
      const errors = err.response?.data?.errors;
      setServerError({ message: msg, errors });
      addToast('error', msg);
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (formData) => {
      setServerError(null);
      const res = await api.put(`/api/assets/${assetId}`, formData);
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', `Asset ${data.assetTag} successfully updated!`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-details', assetId] });
      onSuccess(data);
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update asset';
      const errors = err.response?.data?.errors;
      setServerError({ message: msg, errors });
      addToast('error', msg);
    },
  });

  const onSubmit = (data) => {
    setServerError(null);
    // Sanitize empty strings to null
    const sanitized = {
      ...data,
      departmentId: data.departmentId || null,
      serialNumber: data.serialNumber || null,
      acquisitionDate: data.acquisitionDate || null,
      acquisitionCost: data.acquisitionCost || null,
      manufacturer: data.manufacturer || null,
      vendor: data.vendor || null,
      location: data.location || null,
      warrantyExpiry: data.warrantyExpiry || null,
      remarks: data.remarks || null,
    };

    if (isEditMode) {
      editMutation.mutate(sanitized);
    } else {
      createMutation.mutate(sanitized);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'File size exceeds the 5MB limit');
      return;
    }

    setSelectedFile(file);
  };

  const isSubmitting = createMutation.isPending || editMutation.isPending;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Asset Details' : 'Register New Asset'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
        
        {/* Card 1: General Information */}
        <div className="bg-white p-5 rounded-card border border-odoo-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-odoo-border pb-2">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-odoo-textPrimary">General Information</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Asset Name *</label>
              <input
                type="text"
                placeholder='MacBook Pro 16"'
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all-custom focus-ring ${
                  errors.name ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                }`}
                {...register('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Category *</label>
                <select
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus-ring ${
                    errors.categoryId ? 'border-red-400' : 'border-odoo-border'
                  }`}
                  {...register('categoryId')}
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.categoryId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Department</label>
                {user?.role === 'DEPARTMENT_HEAD' ? (
                  <>
                    <div className="w-full px-3 py-2 bg-odoo-bg border border-odoo-border rounded-lg text-sm text-odoo-textPrimary font-bold">
                      {departments?.find(d => d.id === user.departmentId)?.name || 'Your Department (auto-assigned)'}
                    </div>
                    {/* Hidden input ensures departmentId is always submitted */}
                    <input type="hidden" {...register('departmentId')} value={user.departmentId || ''} />
                  </>
                ) : (
                  <select
                    className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                    {...register('departmentId')}
                  >
                    <option value="">None (Global)</option>
                    {departments?.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Condition</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  {...register('condition')}
                >
                  <option value="NEW">New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Location</label>
                <input
                  type="text"
                  placeholder="HQ - Room 402"
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  {...register('location')}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="isBookable"
                type="checkbox"
                className="w-4 h-4 rounded border-odoo-border text-primary focus:ring-primary"
                {...register('isBookable')}
              />
              <label htmlFor="isBookable" className="text-xs font-bold text-odoo-textPrimary cursor-pointer select-none">
                Make Bookable (Shared Resource)
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Purchase Details */}
        <div className="bg-white p-5 rounded-card border border-odoo-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-odoo-border pb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-odoo-textPrimary">Purchase Details</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Serial / Tag Number</label>
              <input
                type="text"
                placeholder="S/N: C02DF2..."
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                {...register('serialNumber')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Acquisition Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2499.00"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus-ring ${
                    errors.acquisitionCost ? 'border-red-400' : 'border-odoo-border'
                  }`}
                  {...register('acquisitionCost')}
                />
                {errors.acquisitionCost && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.acquisitionCost.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Purchase Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  {...register('acquisitionDate')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Manufacturer</label>
                <input
                  type="text"
                  placeholder="Apple Inc."
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  {...register('manufacturer')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Vendor</label>
                <input
                  type="text"
                  placeholder="Best Buy Business"
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  {...register('vendor')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Warranty Details */}
        <div className="bg-white p-5 rounded-card border border-odoo-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-odoo-border pb-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-odoo-textPrimary">Warranty Details</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-odoo-textSecondary mb-1 uppercase">Warranty Expiration Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              {...register('warrantyExpiry')}
            />
          </div>
        </div>

        {/* Card 4: Upload Media / Docs (Creation Mode Only) */}
        {!isEditMode && (
          <div className="bg-white p-5 rounded-card border border-odoo-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-odoo-border pb-2">
              <Paperclip className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-odoo-textPrimary">Media Attachments</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-odoo-textSecondary uppercase">Attach Primary File (Photo / Manual / Invoice)</label>
              <div className="border-2 border-dashed border-odoo-border rounded-xl p-4 flex flex-col items-center justify-center bg-odoo-bg hover:bg-primary-light/10 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileUp className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold text-odoo-textPrimary mt-2">
                  {selectedFile ? selectedFile.name : 'Upload File (PDF / Images up to 5MB)'}
                </span>
                {selectedFile && (
                  <span className="text-[10px] text-green-600 font-semibold mt-1">
                    Ready to attach ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remarks Section */}
        <div className="bg-white p-5 rounded-card border border-odoo-border shadow-sm space-y-3">
          <label className="block text-xs font-bold text-odoo-textSecondary uppercase">Remarks / Notes</label>
          <textarea
            rows="3"
            placeholder="Asset details or configuration notes..."
            className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            {...register('remarks')}
          ></textarea>
        </div>

        {/* Server Error Panel */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 shrink-0 text-red-600">⚠</div>
              <div>
                <p className="text-xs font-bold text-red-700">{serverError.message}</p>
                {serverError.errors && serverError.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {serverError.errors.map((e, i) => (
                      <li key={i} className="text-[11px] text-red-600">
                        {typeof e === 'string' ? e : e.message || JSON.stringify(e)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fixed Footer Buttons */}
        <div className="fixed bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-all-custom disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {isEditMode ? 'Save Changes' : 'Register Asset'}
          </button>
        </div>

      </form>
    </Drawer>
  );
};

export default RegisterAssetDrawer;
