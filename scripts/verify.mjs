import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runChecks } from './checks.mjs';

// 1. Début du chronométrage et lecture de stdin (Input Contract)
const startTime = Date.now();
let hookInput = {};
try {
  const stdinBuffer = fs.readFileSync(0, 'utf-8');
  if (stdinBuffer.trim()) {
    hookInput = JSON.parse(stdinBuffer);
  }
} catch {
  // Stdin vide ou non-JSON (exécution manuelle directe)
}

// 2. Détermination de la racine du workspace et métadonnées
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = (hookInput.workspacePaths && hookInput.workspacePaths[0])
  ? hookInput.workspacePaths[0]
  : path.resolve(scriptDir, '..');

const convId = hookInput.conversationId || 'default';
const termReason = hookInput.terminationReason || null;

// Fonction de journalisation sécurisée (n'échoue jamais)
function writeLog(entry) {
  try {
    const logsDir = path.join(projectRoot, '.agents', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const logFilePath = path.join(logsDir, 'hooks.log');
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Ne jamais bloquer ou faire échouer le hook en cas d'erreur de journalisation
  }
}

// 3. Filtrage terminationReason : n'exécuter que si model_stop
// Si un terminationReason est spécifié et différent de 'model_stop', autoriser immédiatement l'arrêt.
if (hookInput.terminationReason && hookInput.terminationReason !== 'model_stop') {
  writeLog({
    date: new Date().toISOString(),
    conversationId: convId,
    terminationReason: termReason,
    decision: 'allow',
    failedStep: null,
    attempt: 0,
    durationMs: Date.now() - startTime,
  });
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

// 4. Gestion du fichier d'état du garde-fou
const stateFilePath = path.join(os.tmpdir(), `agy-verify-retry-${convId}.json`);

function getRetryCount() {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));
      return typeof data.count === 'number' ? data.count : 0;
    }
  } catch {}
  return 0;
}

function setRetryCount(count) {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify({ count }), 'utf-8');
  } catch {}
}

function clearRetryCount() {
  try {
    if (fs.existsSync(stateFilePath)) {
      fs.unlinkSync(stateFilePath);
    }
  } catch {}
}

// 5. Exécution des vérifications déléguée à checks.mjs
const { failure } = runChecks(projectRoot, ['typecheck', 'lint', 'test']);

// 6. Décision selon le résultat et le garde-fou
if (!failure) {
  const prevRetries = getRetryCount();
  clearRetryCount();
  writeLog({
    date: new Date().toISOString(),
    conversationId: convId,
    terminationReason: termReason,
    decision: 'allow',
    failedStep: null,
    attempt: prevRetries + 1,
    durationMs: Date.now() - startTime,
  });
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

const currentRetries = getRetryCount() + 1;

if (currentRetries <= 3) {
  setRetryCount(currentRetries);
  writeLog({
    date: new Date().toISOString(),
    conversationId: convId,
    terminationReason: termReason,
    decision: 'continue',
    failedStep: failure.step,
    attempt: currentRetries,
    durationMs: Date.now() - startTime,
  });
  const reason = `[Verification failed on step: ${failure.step}] (Tentative ${currentRetries}/3)\n` +
    `Dernières lignes d'erreur :\n${failure.details}\n\n` +
    `Veuillez corriger cette erreur avant de terminer.`;
  console.log(JSON.stringify({ decision: 'continue', reason }));
  process.exit(0);
} else {
  clearRetryCount();
  writeLog({
    date: new Date().toISOString(),
    conversationId: convId,
    terminationReason: termReason,
    decision: 'allow',
    failedStep: failure.step,
    attempt: currentRetries,
    durationMs: Date.now() - startTime,
  });
  console.error(`[Verification Hook] Garde-fou atteint : 3 relances consécutives ont échoué sur ${failure.step}. Arrêt autorisé.`);
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}
