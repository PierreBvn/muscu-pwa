import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Smartphone,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  getSettings,
  updateSettings,
  REST_SECONDS_OPTIONS,
  type AppSettings,
  type RestSeconds,
} from '../../settings';
import {
  exportBackup,
  parseBackup,
  importBackup,
  clearAllData,
  type BackupData,
} from '../../db/backup';
import { formatLocalDate } from '../../db/sessions';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  const [dataFeedback, setDataFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // États pour l'export
  const [isExporting, setIsExporting] = useState(false);

  // États pour l'import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(
    null
  );
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // États pour tout effacer
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleRestSecondsChange = (val: RestSeconds) => {
    const updated = updateSettings({ restSeconds: val });
    setSettings(updated);
  };

  const handleToggleSound = () => {
    const updated = updateSettings({ restSound: !settings.restSound });
    setSettings(updated);
  };

  const handleToggleKeepAwake = () => {
    const updated = updateSettings({ keepAwake: !settings.keepAwake });
    setSettings(updated);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setDataFeedback(null);

      const backupData = await exportBackup();
      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `muscu-${formatLocalDate(new Date())}.json`;
      const blob = new Blob([jsonString], { type: 'application/json' });
      const file = new File([blob], fileName, { type: 'application/json' });

      if (
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'Sauvegarde Muscu',
          });
          setDataFeedback({
            type: 'success',
            message: 'Sauvegarde partagée avec succès.',
          });
          return;
        } catch (err: unknown) {
          if ((err as Error)?.name === 'AbortError') {
            return;
          }
        }
      }

      // Téléchargement via un lien de Blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDataFeedback({
        type: 'success',
        message: `Sauvegarde téléchargée (${fileName}).`,
      });
    } catch (err: unknown) {
      setDataFeedback({
        type: 'error',
        message:
          (err as Error)?.message || 'Erreur lors de l’export des données.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDataFeedback(null);
      const text = await file.text();
      const parsed = parseBackup(text);
      setPendingImportData(parsed);
      setIsImportConfirmOpen(true);
    } catch (err: unknown) {
      setDataFeedback({
        type: 'error',
        message:
          (err as Error)?.message || 'Fichier de sauvegarde non valide.',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    try {
      setIsImporting(true);
      await importBackup(pendingImportData);
      setIsImportConfirmOpen(false);
      setPendingImportData(null);
      setDataFeedback({
        type: 'success',
        message: 'Données restaurées avec succès.',
      });
    } catch (err: unknown) {
      setIsImportConfirmOpen(false);
      setDataFeedback({
        type: 'error',
        message:
          (err as Error)?.message || 'Erreur lors de l’import de la sauvegarde.',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmClear = async () => {
    try {
      setIsClearing(true);
      await clearAllData();
      setIsClearConfirmOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      setIsClearing(false);
      setIsClearConfirmOpen(false);
      setDataFeedback({
        type: 'error',
        message:
          (err as Error)?.message || 'Erreur lors de la suppression des données.',
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+2rem)]">
      {/* En-tête fixed */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              className="flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-muted hover:text-text active:opacity-80 transition-colors"
            >
              <span className="text-base mr-1">‹</span>
              <span>Retour</span>
            </button>
            <h1 className="text-xl font-semibold text-text tracking-tight">
              Paramètres
            </h1>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Message de statut (succès ou erreur) */}
        {dataFeedback && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-sm ${
              dataFeedback.type === 'success'
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-danger/10 border-danger/30 text-danger'
            }`}
          >
            {dataFeedback.type === 'success' ? (
              <CheckCircle
                size={18}
                className="shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                size={18}
                className="shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <span className="flex-1 leading-snug font-medium">
              {dataFeedback.message}
            </span>
          </div>
        )}

        {/* Section 1 : Minuteur de repos */}
        <section aria-labelledby="section-timer-title" className="space-y-3">
          <h2
            id="section-timer-title"
            className="text-xs uppercase tracking-widest text-muted font-semibold px-1"
          >
            Minuteur de repos
          </h2>

          <div className="rounded-xl bg-surface border border-line p-4 space-y-4">
            <div>
              <span className="text-sm font-medium text-text block mb-2">
                Temps de repos par défaut
              </span>
              <div
                role="group"
                aria-label="Temps de repos par défaut"
                className="grid grid-cols-4 gap-1.5 p-1 bg-surface-2 rounded-xl border border-line"
              >
                {REST_SECONDS_OPTIONS.map((seconds) => {
                  const isSelected = settings.restSeconds === seconds;
                  return (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => handleRestSecondsChange(seconds)}
                      aria-pressed={isSelected}
                      className={`min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-gold text-gold-ink font-semibold shadow-xs'
                          : 'text-muted hover:text-text active:bg-surface'
                      }`}
                    >
                      {seconds}s
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-line/60 space-y-3">
              {/* Option Signal Sonore */}
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  {settings.restSound ? (
                    <Volume2 size={20} className="text-gold" aria-hidden="true" />
                  ) : (
                    <VolumeX size={20} className="text-muted" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium text-text">
                    Signal sonore à la fin
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.restSound}
                  aria-label="Signal sonore à la fin"
                  onClick={handleToggleSound}
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center min-h-[44px] ${
                    settings.restSound ? 'bg-gold justify-end' : 'bg-surface-2 justify-start border border-line'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full transition-transform ${
                      settings.restSound ? 'bg-gold-ink' : 'bg-muted'
                    }`}
                  />
                </button>
              </div>

              {/* Option Garder l'écran allumé */}
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <Smartphone
                    size={20}
                    className={settings.keepAwake ? 'text-gold' : 'text-muted'}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-text">
                    Garder l’écran allumé
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.keepAwake}
                  aria-label="Garder l’écran allumé"
                  onClick={handleToggleKeepAwake}
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center min-h-[44px] ${
                    settings.keepAwake ? 'bg-gold justify-end' : 'bg-surface-2 justify-start border border-line'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full transition-transform ${
                      settings.keepAwake ? 'bg-gold-ink' : 'bg-muted'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 : Données */}
        <section aria-labelledby="section-data-title" className="space-y-3">
          <h2
            id="section-data-title"
            className="text-xs uppercase tracking-widest text-muted font-semibold px-1"
          >
            Données
          </h2>

          <div className="rounded-xl bg-surface border border-line p-4 space-y-3">
            {/* Input file caché */}
            <input
              type="file"
              ref={fileInputRef}
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Fichier de sauvegarde JSON"
            />

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full min-h-[48px] px-4 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-sm font-medium text-text transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} className="text-gold" aria-hidden="true" />
              <span>Exporter les données (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full min-h-[48px] px-4 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-sm font-medium text-text transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={18} className="text-gold" aria-hidden="true" />
              <span>Importer une sauvegarde</span>
            </button>

            <div className="pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                disabled={isClearing}
                className="w-full min-h-[48px] px-4 rounded-xl bg-danger/10 border border-danger/30 hover:bg-danger/20 active:opacity-90 text-sm font-semibold text-danger transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={18} aria-hidden="true" />
                <span>Tout effacer</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 3 : À propos */}
        <section aria-labelledby="section-about-title" className="space-y-3">
          <h2
            id="section-about-title"
            className="text-xs uppercase tracking-widest text-muted font-semibold px-1"
          >
            À propos
          </h2>

          <div className="rounded-xl bg-surface border border-line p-4 flex items-center justify-between min-h-[52px]">
            <div className="flex items-center gap-2.5">
              <Info size={18} className="text-gold" aria-hidden="true" />
              <span className="text-sm font-medium text-text">Version</span>
            </div>
            <span className="text-sm text-muted font-mono tabular-nums">
              v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
            </span>
          </div>
        </section>
      </main>

      {/* Confirmation d'import */}
      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        title="Remplacer toutes les données ?"
        titleId="confirm-import-title"
        message="Cette action remplacera l’intégralité de vos séances, exercices et séances types par le contenu de cette sauvegarde. Vos données actuelles seront écrasées."
        cancelLabel="Annuler"
        confirmLabel="Remplacer les données"
        confirmVariant="danger"
        isLoading={isImporting}
        onCancel={() => {
          setIsImportConfirmOpen(false);
          setPendingImportData(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onConfirm={handleConfirmImport}
      />

      {/* Confirmation de suppression intégrale */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Tout effacer ?"
        titleId="confirm-clear-title"
        message="Toutes les séances, tous les exercices et toutes les séances types seront définitivement supprimés. Cette action est irréversible."
        cancelLabel="Annuler"
        confirmLabel="Tout effacer"
        confirmVariant="danger"
        isLoading={isClearing}
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </div>
  );
};
