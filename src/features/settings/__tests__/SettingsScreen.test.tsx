import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SettingsScreen } from '../SettingsScreen';
import * as backupModule from '../../../db/backup';
import { getSettings } from '../../../settings';

vi.mock('../../../db/backup', async () => {
  const actual = await vi.importActual<typeof backupModule>('../../../db/backup');
  return {
    ...actual,
    exportBackup: vi.fn().mockResolvedValue({
      app: 'muscu-pwa',
      dbVersion: 4,
      exportedAt: '2026-10-19T08:00:00.000Z',
      tables: { exercises: [], sessions: [], sets: [] },
    }),
    parseBackup: vi.fn().mockImplementation((text: string) => {
      const parsed = JSON.parse(text);
      if (parsed.invalid) throw new Error('Format de sauvegarde invalide.');
      return parsed;
    }),
    importBackup: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
  };
});

describe('SettingsScreen component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('affiche le titre et permet de revenir en arrière via le bouton Retour', () => {
    const handleBack = vi.fn();
    render(<SettingsScreen onBack={handleBack} />);

    expect(screen.getByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: 'Retour' });
    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('affiche le temps de repos par défaut (120s) et permet de changer via le contrôle segmenté', () => {
    render(<SettingsScreen onBack={() => {}} />);

    const button120 = screen.getByRole('button', { name: '120s' });
    expect(button120).toHaveAttribute('aria-pressed', 'true');

    const button60 = screen.getByRole('button', { name: '60s' });
    expect(button60).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button60);
    expect(button60).toHaveAttribute('aria-pressed', 'true');
    expect(button120).toHaveAttribute('aria-pressed', 'false');

    // Vérifie la persistance dans localStorage
    expect(getSettings().restSeconds).toBe(60);
  });

  it('permet d’activer et désactiver les options booléennes', () => {
    render(<SettingsScreen onBack={() => {}} />);

    const soundSwitch = screen.getByRole('switch', {
      name: 'Signal sonore à la fin',
    });
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(soundSwitch);
    expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
    expect(getSettings().restSound).toBe(false);

    const keepAwakeSwitch = screen.getByRole('switch', {
      name: 'Garder l’écran allumé',
    });
    expect(keepAwakeSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(keepAwakeSwitch);
    expect(keepAwakeSwitch).toHaveAttribute('aria-checked', 'false');
    expect(getSettings().keepAwake).toBe(false);
  });

  it('permet d’exporter les données en déclenchant exportBackup', async () => {
    render(<SettingsScreen onBack={() => {}} />);

    const exportButton = screen.getByRole('button', {
      name: /exporter les données/i,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(backupModule.exportBackup).toHaveBeenCalledTimes(1);
    });
  });

  it('demande confirmation avant d’importer et appelle importBackup lors de la confirmation', async () => {
    render(<SettingsScreen onBack={() => {}} />);

    const validJson = JSON.stringify({
      app: 'muscu-pwa',
      dbVersion: 4,
      exportedAt: '2026-10-19T08:00:00.000Z',
      tables: {},
    });
    const file = new File([validJson], 'backup.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByLabelText('Fichier de sauvegarde JSON');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // La boîte de dialogue de confirmation doit s'ouvrir
    await waitFor(() => {
      expect(
        screen.getByRole('alertdialog', {
          name: 'Remplacer toutes les données ?',
        })
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', {
      name: 'Remplacer les données',
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(backupModule.importBackup).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Données restaurées avec succès.')
      ).toBeInTheDocument();
    });
  });

  it('demande confirmation avant de tout effacer puis appelle clearAllData', async () => {
    // Espion sur window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    render(<SettingsScreen onBack={() => {}} />);

    const clearButton = screen.getByRole('button', { name: 'Tout effacer' });
    fireEvent.click(clearButton);

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Tout effacer ?',
    });
    expect(dialog).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole('button', {
      name: 'Tout effacer',
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(backupModule.clearAllData).toHaveBeenCalledTimes(1);
    });
  });

  it('affiche la section À propos', () => {
    render(<SettingsScreen onBack={() => {}} />);

    expect(screen.getByText('À propos')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });
});
