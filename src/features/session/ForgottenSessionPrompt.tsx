import React, { useState } from 'react';
import type { Session } from '../../db/schema';

interface ForgottenSessionPromptProps {
  session: Session;
  onResume: () => void;
  onCloseSession: () => Promise<void>;
}

export const ForgottenSessionPrompt: React.FC<ForgottenSessionPromptProps> = ({
  session,
  onResume,
  onCloseSession,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    if (isClosing) return;
    try {
      setIsClosing(true);
      await onCloseSession();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[70vh] pt-[env(safe-area-inset-top)]">
      <div className="w-full rounded-xl bg-surface border border-line p-6 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center mx-auto text-gold">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text tracking-tight mb-1">
            Séance non terminée
          </h2>
          <p className="text-sm text-muted">
            Une séance démarrée le <span className="text-text font-medium">{session.date}</span> n’a pas été finalisée.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onResume}
            disabled={isClosing}
            className="flex-1 min-h-[48px] rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition disabled:opacity-50"
          >
            Reprendre
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing}
            className="flex-1 min-h-[48px] rounded-xl bg-surface-2 border border-line px-4 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition disabled:opacity-50"
          >
            {isClosing ? 'Clôture en cours...' : 'Clôturer'}
          </button>
        </div>
      </div>
    </div>
  );
};
