import { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import Button from './Button';
import { useI18n } from '../Context/I18nContext';

export interface ConfirmationModalProps {
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { t } = useI18n();
  const effectiveConfirmText = confirmText ?? t('common.confirm');
  const effectiveCancelText = cancelText ?? t('common.cancel');
  return (
    <>
      {/* Header */}
      <div className="modal-header pb-4 border-b border-gray-700">
        <div className="flex items-center">
          <span className="text-3xl mr-3 flex items-center">
            <TriangleAlert className="text-warning" size={32} />
          </span>
          <h2 className="font-bold text-3xl mb-0 text-warning">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon
          className="absolute right-4 top-4 z-10"
          onClick={onCancel}
        >
          ✕
        </Button>
      </div>

      <div className="modal-body py-2 mt-4">
        <div className="text-gray-300 text-lg whitespace-pre-line">{description}</div>
      </div>

      {/* Footer with buttons */}
      <div className="modal-action mt-6 flex justify-end gap-3">
        <Button variant="primary" onClick={onCancel}>
          {effectiveCancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {effectiveConfirmText}
        </Button>
      </div>
    </>
  );
}
