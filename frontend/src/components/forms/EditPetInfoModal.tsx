import React, { useState, useEffect } from 'react';
import { PawPrint, X, Upload, Camera } from 'lucide-react';
import { usePet } from '../../hooks';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { PetInfo } from '../../types';

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

  // Use file upload hook - REPLACES 50+ lines of code!
  const {
    selectedFile,
    previewUrl,
    error: fileError,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile
  } = useFileUpload({
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Form states
  const [name, setName] = useState(pet.name);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(pet.name);
      handleRemoveFile();
      setErrors({});
    }
  }, [isOpen, pet, handleRemoveFile]);

  // Sync file upload error with form errors
  useEffect(() => {
    if (fileError) {
      setErrors(prev => ({ ...prev, photo: fileError }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  }, [fileError]);

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
    handleRemoveFile();
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-accent-pink" />
            <h2 className="text-xl font-bold text-text-primary">Edit Pet Info</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Pet Photo Section */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Pet Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="w-24 h-24 rounded-full bg-surface-1 border border-border-subtle flex-shrink-0 overflow-hidden shadow-card relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : pet.photo_url ? (
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent-pink/15 flex items-center justify-center text-accent-pink font-semibold text-3xl">
                    {pet.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {selectedFile && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-text-primary" />
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
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedFile ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                    className="btn-secondary w-full text-sm disabled:opacity-50"
                  >
                    Remove Selected
                  </button>
                )}
                {selectedFile && (
                  <p className="text-xs text-text-tertiary text-center">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            {errors.photo && <p className="text-danger text-xs mt-2">{errors.photo}</p>}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
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
              className={`input-field ${errors.name ? 'border-danger' : ''}`}
              placeholder="Enter pet name"
              disabled={isLoading}
              maxLength={50}
            />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Pet Type (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Pet Type
            </label>
            <input
              type="text"
              value={pet.pet_type}
              disabled
              className="input-field capitalize"
            />
            <p className="text-xs text-text-tertiary mt-1">Pet type cannot be changed</p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="btn-secondary flex-1 py-3 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
