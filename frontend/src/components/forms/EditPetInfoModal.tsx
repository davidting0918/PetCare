import React, { useState, useEffect, useRef } from 'react';
import { PawPrint, X, Upload, Camera } from 'lucide-react';
import { usePet } from '../../hooks';
import type { PetInfo } from '../../types';
import { getPhotoUrl } from '../../api';

interface EditPetInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  pet: PetInfo;
}

export const EditPetInfoModal: React.FC<EditPetInfoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pet
}) => {
  const { updatePetInfo, uploadPetPhoto, isLoading } = usePet();

  // Form states
  const [name, setName] = useState(pet.name);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(pet.name);
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrors({});
    }
  }, [isOpen, pet]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, photo: 'Please upload a JPEG, PNG, GIF, or WebP image' });
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors({ ...errors, photo: 'File is too large. Maximum size is 10MB' });
      return;
    }

    // Clear previous errors
    const newErrors = { ...errors };
    delete newErrors.photo;
    setErrors(newErrors);

    // Set file and create preview
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      let photoUploaded = false;
      let infoUpdated = false;

      // Upload photo if selected
      if (selectedFile) {
        await uploadPetPhoto(pet.id, selectedFile);
        photoUploaded = true;
      }

      // Update name if changed
      if (name.trim() !== pet.name) {
        await updatePetInfo(pet.id, { name: name.trim() });
        infoUpdated = true;
      }

      // Build success message
      const updates = [];
      if (photoUploaded) updates.push('photo');
      if (infoUpdated) updates.push('name');

      const message = updates.length > 0
        ? `Successfully updated ${updates.join(' and ')}`
        : 'Pet profile updated';

      onSuccess?.(message);
      handleClose();
    } catch (error) {
      console.error('Failed to update pet info:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update pet profile' });
    }
  };

  const handleClose = () => {
    setName(pet.name);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const petPhotoUrl = pet.photo_url ? getPhotoUrl(pet.photo_url) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-3d max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-orange" />
            <h2 className="text-xl font-bold text-earth">Edit Pet Info</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Pet Photo Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pet Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : petPhotoUrl ? (
                  <img
                    src={petPhotoUrl}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-3xl">
                    {pet.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {selectedFile && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#F4C2A1' }}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedFile ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
                  >
                    Remove Selected
                  </button>
                )}
                {selectedFile && (
                  <p className="text-xs text-gray-500 text-center">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            {errors.photo && <p className="text-red-600 text-xs mt-2">{errors.photo}</p>}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pet Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  const newErrors = { ...errors };
                  delete newErrors.name;
                  setErrors(newErrors);
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter pet name"
              disabled={isLoading}
              maxLength={50}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Pet Type (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pet Type
            </label>
            <input
              type="text"
              value={pet.pet_type}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
            />
            <p className="text-xs text-gray-500 mt-1">Pet type cannot be changed</p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-white rounded-lg hover:bg-orange/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#F4C2A1' }}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
