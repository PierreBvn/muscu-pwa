import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProgramList } from '../ProgramList';
import { db } from '../../../db/schema';
import { createProgram } from '../../../db/programs';

describe('ProgramList UI', () => {
  beforeEach(async () => {
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();
  });

  it('renders header, empty state, and opens creation modal', async () => {
    render(<ProgramList />);

    expect(
      screen.getByRole('heading', { name: /séances types/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/aucune séance type/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    expect(
      screen.getByRole('heading', { name: /nouvelle séance type/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nom de la séance type/i).hasAttribute('autofocus')).toBe(false);
  });

  it('validates program name and weekdays before creating', async () => {
    render(<ProgramList />);

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });

    // Nom vide
    fireEvent.click(saveBtn);
    expect(
      screen.getByText(/le nom de la séance type ne peut pas être vide/i)
    ).toBeInTheDocument();

    // Remplir le nom mais aucun jour
    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    fireEvent.change(nameInput, { target: { value: 'Full Body' } });

    // Désélectionner les jours si cochés par défaut, ou vérifier l'erreur si aucun jour
    const lundiCheckbox = screen.getByRole('checkbox', { name: /lundi/i });
    if (lundiCheckbox.getAttribute('aria-checked') === 'true') {
      fireEvent.click(lundiCheckbox);
    }
    // Tous décochés
    const allDays = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    for (const d of allDays) {
      const cb = screen.getByRole('checkbox', { name: new RegExp(d, 'i') });
      if (cb.getAttribute('aria-checked') === 'true') {
        fireEvent.click(cb);
      }
    }

    fireEvent.click(saveBtn);
    expect(
      screen.getByText(/sélectionnez au moins un jour/i)
    ).toBeInTheDocument();
  });

  it('creates a new program with chosen weekdays', async () => {
    render(<ProgramList />);

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    fireEvent.change(nameInput, { target: { value: 'Upper Body' } });

    // Cocher Lundi et Jeudi
    const lundiCheckbox = screen.getByRole('checkbox', { name: /lundi/i });
    const jeudiCheckbox = screen.getByRole('checkbox', { name: /jeudi/i });

    if (lundiCheckbox.getAttribute('aria-checked') !== 'true') {
      fireEvent.click(lundiCheckbox);
    }
    if (jeudiCheckbox.getAttribute('aria-checked') !== 'true') {
      fireEvent.click(jeudiCheckbox);
    }

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Upper Body')).toBeInTheDocument();
      // Doit afficher les jours (ex: Lun, Jeu)
      expect(screen.getByText(/lun/i)).toBeInTheDocument();
      expect(screen.getByText(/jeu/i)).toBeInTheDocument();
    });
  });

  it('edits an existing program (renaming and changing days)', async () => {
    await createProgram({ name: 'Legs', weekdays: [2] }); // Mardi

    render(<ProgramList />);

    await waitFor(() => {
      expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /modifier legs/i });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole('heading', { name: /modifier la séance type/i })
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    expect(nameInput).toHaveValue('Legs');

    fireEvent.change(nameInput, { target: { value: 'Legs & Core' } });

    // Ajouter Samedi (6)
    const samediCheckbox = screen.getByRole('checkbox', { name: /samedi/i });
    fireEvent.click(samediCheckbox);

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Legs & Core')).toBeInTheDocument();
      expect(screen.getByText(/sam/i)).toBeInTheDocument();
    });
  });

  it('deletes a program after confirmation with notice "Les séances passées sont conservées"', async () => {
    await createProgram({ name: 'Cardio', weekdays: [7] });

    render(<ProgramList />);

    await waitFor(() => {
      expect(screen.getByText('Cardio')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /supprimer cardio/i });
    fireEvent.click(deleteBtn);

    // Dialogue d'alerte
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/les séances passées sont conservées/i)
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^supprimer$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cardio')).not.toBeInTheDocument();
    });
  });

  describe('Sauvegarde (Export & Import)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('affiche les boutons Exporter et Importer', async () => {
      render(<ProgramList />);

      expect(
        screen.getByRole('button', { name: /^exporter$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^importer$/i })
      ).toBeInTheDocument();
    });

    it('exporte les données via navigator.share si canShare est vrai (uniquement { files })', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'canShare', {
        value: canShareMock,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
        writable: true,
      });

      render(<ProgramList />);

      const exportBtn = screen.getByRole('button', { name: /^exporter$/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(canShareMock).toHaveBeenCalled();
        expect(shareMock).toHaveBeenCalledWith({
          files: [expect.any(File)],
        });
      });

      // Vérifie qu'aucun message d'erreur n'est affiché
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('ignore silencieusement AbortError lors du partage', async () => {
      const abortError = new Error('User cancelled share');
      abortError.name = 'AbortError';

      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(abortError),
        configurable: true,
        writable: true,
      });

      render(<ProgramList />);

      const exportBtn = screen.getByRole('button', { name: /^exporter$/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('affiche "Export impossible" si navigator.share lève NotAllowedError', async () => {
      const notAllowed = new Error('Permission denied');
      notAllowed.name = 'NotAllowedError';

      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(notAllowed),
        configurable: true,
        writable: true,
      });

      render(<ProgramList />);

      const exportBtn = screen.getByRole('button', { name: /^exporter$/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Export impossible');
      });
    });

    it('utilise le repli <a download> avec URL Blob si canShare est faux', async () => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => false,
        configurable: true,
        writable: true,
      });

      const createObjectUrlMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
      const revokeObjectUrlMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectUrlMock;
      globalThis.URL.revokeObjectURL = revokeObjectUrlMock;

      render(<ProgramList />);

      const exportBtn = screen.getByRole('button', { name: /^exporter$/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(createObjectUrlMock).toHaveBeenCalled();
      });

      // Vérifie la révocation différée dans le setTimeout
      await waitFor(() => {
        expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
      }, { timeout: 2000 });
    });

    it('gère un fichier invalide à l’import : affiche l’erreur dans role="status" sans ouvrir ConfirmDialog', async () => {
      render(<ProgramList />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.hasAttribute('accept')).toBe(false);

      const invalidFile = new File(['{"app":"inconnue"}'], 'bad.json', {
        type: 'application/json',
      });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent(/application non reconnue/i);
      });

      // Aucun alertdialog n'est ouvert
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('gère un fichier valide à l’import : ouvre ConfirmDialog et annule sans modifier la base', async () => {
      await createProgram({ name: 'Programme Existant', weekdays: [1] });

      // Prépare un backup valide
      const backupTables: Record<string, unknown[]> = {};
      for (const t of db.tables) {
        backupTables[t.name] = await t.toArray();
      }
      backupTables.programs = [{ id: 99, name: 'Programme Importé', weekdays: [5] }];

      const validBackup = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: backupTables,
      };

      render(<ProgramList />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File([JSON.stringify(validBackup)], 'valid.json', {
        type: 'application/json',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Le ConfirmDialog s'ouvre avec le titre attendu
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /remplacer toutes les données \?/i })
        ).toBeInTheDocument();
      });

      // Clic sur Annuler
      const cancelBtn = screen.getByRole('button', { name: /annuler/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /remplacer toutes les données \?/i })
        ).not.toBeInTheDocument();
      });

      // Les données initiales sont intactes
      expect(screen.getByText('Programme Existant')).toBeInTheDocument();
      expect(screen.queryByText('Programme Importé')).not.toBeInTheDocument();
    });

    it('gère un fichier valide à l’import : confirme le remplacement et affiche "Import terminé"', async () => {
      await createProgram({ name: 'Ancien Programme', weekdays: [1] });

      const backupTables: Record<string, unknown[]> = {};
      for (const t of db.tables) {
        backupTables[t.name] = await t.toArray();
      }
      backupTables.programs = [{ id: 42, name: 'Nouveau Programme Restoré', weekdays: [3] }];

      const validBackup = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: backupTables,
      };

      render(<ProgramList />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File([JSON.stringify(validBackup)], 'valid.json', {
        type: 'application/json',
      });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /remplacer toutes les données \?/i })
        ).toBeInTheDocument();
      });

      // Clic sur Remplacer
      const replaceBtn = screen.getByRole('button', { name: /^remplacer$/i });
      fireEvent.click(replaceBtn);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Import terminé');
      });

      // La liste reflète la nouvelle base
      await waitFor(() => {
        expect(screen.getByText('Nouveau Programme Restoré')).toBeInTheDocument();
        expect(screen.queryByText('Ancien Programme')).not.toBeInTheDocument();
      });
    });
  });
});
