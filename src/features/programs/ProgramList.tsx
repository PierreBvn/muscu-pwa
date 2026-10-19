import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Program } from '../../db/schema';
import {
  getAllProgramsWithSummary,
  createProgram,
  updateProgram,
  deleteProgram,
} from '../../db/programs';
import { ProgramCard } from './ProgramCard';
import { ProgramModal } from './ProgramModal';
import { ProgramDetail } from './ProgramDetail';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const ProgramList: React.FC = () => {
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

  const programsQuery = useLiveQuery(
    async () => ({ list: await getAllProgramsWithSummary() }),
    []
  );
  const programs = programsQuery?.list;

  if (selectedProgramId !== null) {
    return (
      <ProgramDetail
        programId={selectedProgramId}
        onBack={() => setSelectedProgramId(null)}
      />
    );
  }

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleSaveProgram = async (data: { name: string; weekdays: number[] }) => {
    if (editingProgram?.id) {
      await updateProgram(editingProgram.id, data);
    } else {
      await createProgram(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (programToDelete?.id) {
      await deleteProgram(programToDelete.id);
      setProgramToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header">
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <div>
            <h1 className="text-xl font-semibold text-text tracking-tight">
              Séances types
            </h1>
            <p className="text-xs text-muted">
              Gérez vos routines d’entraînement
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
          >
            <span className="text-lg leading-none" aria-hidden="true">+</span>
            <span>Nouvelle</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">
        {programsQuery === undefined || programs === undefined ? null : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-6 rounded-xl bg-surface border border-dashed border-line">
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-muted mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-text mb-1">
              Aucune séance type
            </h3>
            <p className="text-xs text-muted max-w-xs mb-4">
              Créez votre première séance type pour organiser vos séances hebdomadaires.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="min-h-[48px] px-4 rounded-xl bg-surface-2 border border-line hover:bg-surface text-sm font-semibold text-text transition"
            >
              Créer une séance type
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onSelect={(p) => setSelectedProgramId(p.id ?? null)}
                onEdit={handleOpenEdit}
                onDelete={(p) => setProgramToDelete(p)}
              />
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <ProgramModal
          key={editingProgram?.id ?? 'new'}
          isOpen={isModalOpen}
          program={editingProgram}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProgram}
        />
      )}

      <ConfirmDialog
        isOpen={programToDelete !== null}
        title="Supprimer la séance type ?"
        titleId="delete-program-dialog-title"
        message={
          programToDelete ? (
            <>
              <p className="mb-2">
                Êtes-vous sûr de vouloir supprimer{' '}
                <strong className="text-text font-semibold">
                  « {programToDelete.name} »
                </strong>{' '}
                ?
              </p>
              <p className="text-xs text-muted font-medium bg-surface-2 border border-line p-2.5 rounded-xl">
                ✓ Les séances passées sont conservées.
              </p>
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        confirmVariant="danger"
        onCancel={() => setProgramToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
};
