import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactElement;
  iconBgColor?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
  showCloseButton?: boolean;
  disableClose?: boolean;
  className?: string;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

/**
 * Unified Modal component for consistent dialog UI across the application
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Create New Pet"
 *   icon={<PawPrint className="w-5 h-5" />}
 *   iconBgColor="bg-orange/20"
 *   maxWidth="lg"
 * >
 *   <form>...</form>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  iconBgColor = 'bg-gray-100',
  children,
  maxWidth = 'md',
  maxHeight = '90vh',
  showCloseButton = true,
  disableClose = false,
  className = ''
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disableClose) {
      onClose();
    }
  };

  // Check if children includes ModalHeader - if not, auto-render one with title/icon if provided
  const hasHeader = React.Children.toArray(children).some(
    child => React.isValidElement(child) && child.type === ModalHeader
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-lg shadow-3d ${MAX_WIDTH_CLASSES[maxWidth]} w-full ${className}`}
        style={{ maxHeight }}
      >
        {!hasHeader && (title || icon) && (
          <ModalHeader
            title={title}
            icon={icon}
            iconBgColor={iconBgColor}
            onClose={showCloseButton ? onClose : undefined}
            disableClose={disableClose}
          />
        )}
        {children}
      </div>
    </div>
  );
};

export interface ModalHeaderProps {
  title?: string;
  icon?: React.ReactElement;
  iconBgColor?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  disableClose?: boolean;
  className?: string;
}

/**
 * Unified Modal Header component
 *
 * @example
 * ```tsx
 * <ModalHeader
 *   title="Edit Profile"
 *   icon={<User className="w-5 h-5" />}
 *   iconBgColor="bg-mint/20"
 *   onClose={handleClose}
 * />
 * ```
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  icon,
  iconBgColor = 'bg-gray-100',
  onClose,
  showCloseButton = true,
  disableClose = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${className}`}>
      <div className="flex items-center">
        {icon && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${iconBgColor}`}>
            {icon}
          </div>
        )}
        {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
      </div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={disableClose}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

/**
 * Modal Body component with optional scrolling
 */
export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  scrollable = true
}) => {
  return (
    <div className={`p-6 ${scrollable ? 'overflow-y-auto' : ''} ${className}`}>
      {children}
    </div>
  );
};

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Modal Footer component for action buttons
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`flex gap-3 p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
};
