import React from 'react';
import { Portal } from './Portal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  titleId: string;
  message: React.ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  titleId,
  message,
  cancelLabel = 'Annuler',
  confirmLabel,
  confirmVariant = 'danger',
  isLoading = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const confirmBtnClass =
    confirmVariant === 'danger'
      ? 'bg-danger text-text hover:opacity-95'
      : 'bg-gold text-gold-ink hover:opacity-95';

  return (
    <Portal>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-confirm flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      >
        <div className="w-full max-w-sm rounded-xl bg-surface border border-line p-5 shadow-2xl">
          <h3
            id={titleId}
            className="text-lg font-semibold text-text tracking-tight mb-2"
          >
            {title}
          </h3>
          <div className="text-sm text-muted mb-5">
            {message}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 min-h-[48px] items-center justify-center rounded-xl text-sm font-semibold active:opacity-90 transition disabled:opacity-50 ${confirmBtnClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
