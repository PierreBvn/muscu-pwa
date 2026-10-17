import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Confirmation test"
        titleId="test-dialog-title"
        message="Êtes-vous sûr ?"
        confirmLabel="Confirmer"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('renders correctly with title, message and buttons when isOpen is true', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Supprimer la donnée ?"
        titleId="delete-dialog-title"
        message="Cette action est irréversible."
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        confirmVariant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title');

    expect(screen.getByText('Supprimer la donnée ?')).toBeInTheDocument();
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    const confirmButton = screen.getByRole('button', { name: 'Supprimer' });

    expect(cancelButton).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
