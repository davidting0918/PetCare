import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';

export interface FileValidationConfig {
  /**
   * Maximum file size in bytes
   * @default 10 * 1024 * 1024 (10MB)
   */
  maxSize?: number;

  /**
   * Allowed file MIME types
   * @default ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   */
  allowedTypes?: string[];
}

export interface UseFileUploadReturn {
  /** Selected file */
  selectedFile: File | null;

  /** Preview URL for the selected file */
  previewUrl: string | null;

  /** Validation error message */
  error: string | null;

  /** Ref for the file input element */
  fileInputRef: React.RefObject<HTMLInputElement>;

  /** Handle file selection from input */
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;

  /** Remove the selected file and clear preview */
  handleRemoveFile: () => void;

  /** Clear the error message */
  clearError: () => void;
}

const DEFAULT_CONFIG: Required<FileValidationConfig> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Hook for handling file upload with validation and preview
 *
 * @param config - File validation configuration
 * @returns File upload state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   selectedFile,
 *   previewUrl,
 *   error,
 *   fileInputRef,
 *   handleFileSelect,
 *   handleRemoveFile
 * } = useFileUpload({
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   allowedTypes: ['image/jpeg', 'image/png']
 * });
 *
 * <input
 *   ref={fileInputRef}
 *   type="file"
 *   accept="image/*"
 *   onChange={handleFileSelect}
 *   className="hidden"
 * />
 *
 * {previewUrl && (
 *   <img src={previewUrl} alt="Preview" />
 * )}
 * ```
 */
export const useFileUpload = (config?: FileValidationConfig): UseFileUploadReturn => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize the resolved validation config so the ``handleFileSelect``
  // useCallback below stays referentially stable across renders even when
  // callers pass an inline ``{ maxSize: ... }`` object literal.
  const validationConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config?.maxSize, config?.allowedTypes]
  );

  // Clean up preview URL on unmount or when preview URL changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!validationConfig.allowedTypes.includes(file.type)) {
        const allowedTypesStr = validationConfig.allowedTypes
          .map(type => type.split('/')[1].toUpperCase())
          .join(', ');
        setError(`Please upload a ${allowedTypesStr} image`);
        return;
      }

      // Validate file size
      if (file.size > validationConfig.maxSize) {
        const maxSizeMB = (validationConfig.maxSize / (1024 * 1024)).toFixed(0);
        setError(`File is too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }

      // Clear previous error
      setError(null);

      // Set file and create preview. Use functional setPreviewUrl so this
      // callback does not need to close over previewUrl — that keeps its
      // dep array stable and avoids triggering re-renders in consumers
      // that put handleFileSelect in their effect deps.
      setSelectedFile(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [validationConfig]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    selectedFile,
    previewUrl,
    error,
    fileInputRef: fileInputRef as React.RefObject<HTMLInputElement>,
    handleFileSelect,
    handleRemoveFile,
    clearError
  };
};
