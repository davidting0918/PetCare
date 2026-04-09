import React, { useState, useEffect, useCallback } from 'react';
import { PawPrint, X, Upload, Camera, Loader2 } from 'lucide-react';
import { usePet } from '../../hooks';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { PetInfo, PetDetails, PetGender, UpdatePetRequest } from '../../types';

interface EditPetInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  pet: PetInfo;
}

interface EditPetFormData {
  name: string;
  breed: string;
  gender: string;
  birth_date: string;
  current_weight_kg: number | undefined;
  target_weight_kg: number | undefined;
  height_cm: number | undefined;
  is_spayed: boolean;
  microchip_id: string;
  daily_calorie_target: number | undefined;
  notes: string;
}

const detailsToFormData = (details: PetDetails): EditPetFormData => ({
  name: details.name,
  breed: details.breed || '',
  gender: details.gender,
  birth_date: details.birth_date ? details.birth_date.slice(0, 10) : '',
  current_weight_kg: details.current_weight_kg ?? undefined,
  target_weight_kg: details.target_weight_kg ?? undefined,
  height_cm: details.height_cm ?? undefined,
  is_spayed: details.is_spayed ?? false,
  microchip_id: details.microchip_id || '',
  daily_calorie_target: details.daily_calorie_target ?? undefined,
  notes: details.notes || '',
});

const buildUpdateRequest = (formData: EditPetFormData, original: PetDetails): UpdatePetRequest => {
  const request: UpdatePetRequest = {};

  if (formData.name.trim() !== original.name) {
    request.name = formData.name.trim();
  }
  if (formData.breed !== (original.breed || '')) {
    request.breed = formData.breed.trim() || undefined;
  }
  if (formData.gender !== original.gender) {
    request.gender = formData.gender as PetGender;
  }

  const originalBirthDate = original.birth_date ? original.birth_date.slice(0, 10) : '';
  if (formData.birth_date !== originalBirthDate) {
    request.birth_date = formData.birth_date
      ? Math.floor(new Date(formData.birth_date + 'T00:00:00Z').getTime() / 1000)
      : undefined;
  }

  if (formData.current_weight_kg !== (original.current_weight_kg ?? undefined)) {
    request.current_weight_kg = formData.current_weight_kg;
  }
  if (formData.target_weight_kg !== (original.target_weight_kg ?? undefined)) {
    request.target_weight_kg = formData.target_weight_kg;
  }
  if (formData.height_cm !== (original.height_cm ?? undefined)) {
    request.height_cm = formData.height_cm;
  }
  if (formData.is_spayed !== (original.is_spayed ?? false)) {
    request.is_spayed = formData.is_spayed;
  }
  if (formData.microchip_id !== (original.microchip_id || '')) {
    request.microchip_id = formData.microchip_id.trim() || undefined;
  }
  if (formData.daily_calorie_target !== (original.daily_calorie_target ?? undefined)) {
    request.daily_calorie_target = formData.daily_calorie_target;
  }
  if (formData.notes !== (original.notes || '')) {
    request.notes = formData.notes.trim() || undefined;
  }

  return request;
};

export const EditPetInfoModal: React.FC<EditPetInfoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pet
}) => {
  const { updatePetInfo, uploadPetPhoto, getPetDetails, isLoading } = usePet();

  const {
    selectedFile,
    previewUrl,
    error: fileError,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile
  } = useFileUpload({
    maxSize: 10 * 1024 * 1024
  });

  const [formData, setFormData] = useState<EditPetFormData>({
    name: '', breed: '', gender: 'unknown', birth_date: '',
    current_weight_kg: undefined, target_weight_kg: undefined,
    height_cm: undefined, is_spayed: false, microchip_id: '',
    daily_calorie_target: undefined, notes: '',
  });
  const [originalDetails, setOriginalDetails] = useState<PetDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const details = await getPetDetails(pet.id);
      setOriginalDetails(details);
      setFormData(detailsToFormData(details));
    } catch (error) {
      setErrors({ fetch: error instanceof Error ? error.message : 'Failed to load pet details' });
    } finally {
      setDetailsLoading(false);
    }
  }, [getPetDetails, pet.id]);

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
      handleRemoveFile();
      setErrors({});
    }
  }, [isOpen, fetchDetails, handleRemoveFile]);

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

  const handleInputChange = <K extends keyof EditPetFormData>(field: K, value: EditPetFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (formData.current_weight_kg !== undefined && (formData.current_weight_kg < 0.1 || formData.current_weight_kg > 200)) {
      newErrors.current_weight_kg = 'Must be between 0.1 and 200 kg';
    }
    if (formData.target_weight_kg !== undefined && (formData.target_weight_kg < 0.1 || formData.target_weight_kg > 200)) {
      newErrors.target_weight_kg = 'Must be between 0.1 and 200 kg';
    }
    if (formData.height_cm !== undefined && (formData.height_cm < 1 || formData.height_cm > 200)) {
      newErrors.height_cm = 'Must be between 1 and 200 cm';
    }
    if (formData.daily_calorie_target !== undefined && (formData.daily_calorie_target < 50 || formData.daily_calorie_target > 5000)) {
      newErrors.daily_calorie_target = 'Must be between 50 and 5000';
    }
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes must be 1000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !originalDetails) return;

    try {
      let photoUploaded = false;
      let infoUpdated = false;

      if (selectedFile) {
        await uploadPetPhoto(pet.id, selectedFile);
        photoUploaded = true;
      }

      const request = buildUpdateRequest(formData, originalDetails);
      if (Object.keys(request).length > 0) {
        await updatePetInfo(pet.id, request);
        infoUpdated = true;
      }

      const updates = [];
      if (photoUploaded) updates.push('photo');
      if (infoUpdated) updates.push('profile');

      const message = updates.length > 0
        ? `Successfully updated ${updates.join(' and ')}`
        : 'No changes to save';

      onSuccess?.(message);
      handleClose();
    } catch (error) {
      console.error('Failed to update pet info:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update pet profile' });
    }
  };

  const handleClose = () => {
    handleRemoveFile();
    setErrors({});
    setOriginalDetails(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Loading State */}
        {detailsLoading && (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-accent-pink animate-spin" />
          </div>
        )}

        {/* Fetch Error */}
        {errors.fetch && !detailsLoading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-center">
              <p className="text-danger text-sm">{errors.fetch}</p>
              <button onClick={fetchDetails} className="btn-secondary mt-3 text-sm">
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Form Content - Scrollable */}
        {!detailsLoading && !errors.fetch && originalDetails && (
          <>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  <div className="w-24 h-24 rounded-full bg-surface-1 border border-border-subtle flex-shrink-0 overflow-hidden shadow-card relative">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
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
                      <span className="text-sm">{selectedFile ? 'Change Photo' : 'Upload Photo'}</span>
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

              {/* Pet Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Pet Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input-field ${errors.name ? 'border-danger' : ''}`}
                  placeholder="Enter pet name"
                  disabled={isLoading}
                  maxLength={50}
                />
                {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Pet Type (Read-only) and Gender */}
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-xs text-text-tertiary mt-1">Cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="input-field"
                    disabled={isLoading}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Breed */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Breed
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => handleInputChange('breed', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Golden Retriever, Persian Cat"
                  disabled={isLoading}
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              {/* Weight Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.current_weight_kg ?? ''}
                    onChange={(e) => handleInputChange('current_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className={`input-field ${errors.current_weight_kg ? 'border-danger' : ''}`}
                    placeholder="0.0"
                    disabled={isLoading}
                  />
                  {errors.current_weight_kg && <p className="text-danger text-xs mt-1">{errors.current_weight_kg}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.target_weight_kg ?? ''}
                    onChange={(e) => handleInputChange('target_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className={`input-field ${errors.target_weight_kg ? 'border-danger' : ''}`}
                    placeholder="0.0"
                    disabled={isLoading}
                  />
                  {errors.target_weight_kg && <p className="text-danger text-xs mt-1">{errors.target_weight_kg}</p>}
                </div>
              </div>

              {/* Height and Daily Calorie */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.height_cm ?? ''}
                    onChange={(e) => handleInputChange('height_cm', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className={`input-field ${errors.height_cm ? 'border-danger' : ''}`}
                    placeholder="0"
                    disabled={isLoading}
                  />
                  {errors.height_cm && <p className="text-danger text-xs mt-1">{errors.height_cm}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Daily Calorie Target
                  </label>
                  <input
                    type="number"
                    value={formData.daily_calorie_target ?? ''}
                    onChange={(e) => handleInputChange('daily_calorie_target', e.target.value ? parseInt(e.target.value) : undefined)}
                    className={`input-field ${errors.daily_calorie_target ? 'border-danger' : ''}`}
                    placeholder="0"
                    disabled={isLoading}
                  />
                  {errors.daily_calorie_target && <p className="text-danger text-xs mt-1">{errors.daily_calorie_target}</p>}
                </div>
              </div>

              {/* Microchip ID */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Microchip ID
                </label>
                <input
                  type="text"
                  value={formData.microchip_id}
                  onChange={(e) => handleInputChange('microchip_id', e.target.value)}
                  className="input-field"
                  placeholder="Enter microchip number"
                  disabled={isLoading}
                />
              </div>

              {/* Spayed/Neutered */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_spayed"
                  checked={formData.is_spayed}
                  onChange={(e) => handleInputChange('is_spayed', e.target.checked)}
                  className="rounded border-border-default text-accent-pink focus:ring-accent-pink bg-surface-2"
                  disabled={isLoading}
                />
                <label htmlFor="edit_is_spayed" className="ml-2 text-sm text-text-secondary">
                  Spayed/Neutered
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className={`input-field resize-none ${errors.notes ? 'border-danger' : ''}`}
                  placeholder="Any additional information about your pet..."
                  disabled={isLoading}
                  maxLength={1000}
                />
                {errors.notes && <p className="text-danger text-xs mt-1">{errors.notes}</p>}
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
          </>
        )}
      </div>
    </div>
  );
};
