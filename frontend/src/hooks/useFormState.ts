import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';

export interface UseFormStateReturn<T> {
  /** Form data state */
  formData: T;

  /** Set form data directly */
  setFormData: Dispatch<SetStateAction<T>>;

  /** Validation errors */
  errors: Record<string, string>;

  /** Set errors directly */
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;

  /** Handle field change and auto-clear errors */
  handleChange: (field: keyof T, value: unknown) => void;

  /** Set a single field error */
  setError: (field: keyof T, message: string) => void;

  /** Clear all errors */
  clearErrors: () => void;

  /** Reset form to initial values */
  resetForm: () => void;
}

/**
 * Hook for managing form state with automatic error handling
 *
 * @param initialValues - Initial form data
 * @returns Form state and handlers
 *
 * @example
 * ```tsx
 * interface FormData {
 *   name: string;
 *   email: string;
 * }
 *
 * const {
 *   formData,
 *   errors,
 *   handleChange,
 *   setError,
 *   resetForm
 * } = useFormState<FormData>({
 *   name: '',
 *   email: ''
 * });
 *
 * const handleSubmit = (e) => {
 *   e.preventDefault();
 *   if (!formData.name) {
 *     setError('name', 'Name is required');
 *     return;
 *   }
 *   // Submit logic...
 * };
 *
 * <input
 *   value={formData.name}
 *   onChange={(e) => handleChange('name', e.target.value)}
 * />
 * {errors.name && <span>{errors.name}</span>}
 * ```
 */
export function useFormState<T extends Record<string, unknown>>(
  initialValues: T
): UseFormStateReturn<T> {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handle field value change and automatically clear the field's error
   */
  const handleChange = useCallback((field: keyof T, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-clear error when user starts typing
    setErrors(prev => {
      if (prev[field as string]) {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      }
      return prev;
    });
  }, []);

  /**
   * Set a single field error
   */
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field as string]: message
    }));
  }, []);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Reset form to initial values and clear errors
   */
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    handleChange,
    setError,
    clearErrors,
    resetForm
  };
}
