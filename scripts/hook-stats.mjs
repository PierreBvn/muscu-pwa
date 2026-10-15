import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const logFilePath = path.join(projectRoot, '.agents', 'logs', 'hooks.log');

if (!fs.existsSync(logFilePath)) {
  console.log('Aucun journal trouvé dans .agents/logs/hooks.log (0 déclenchement).');
  process.exit(0);
}

const lines = fs
  .readFileSync(logFilePath, 'utf-8')
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0);

let totalTriggers = 0;
let totalRetries = 0;
const retriesByStep = {
  typecheck: 0,
  lint: 0,
  test: 0,
};

for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    totalTriggers++;
    if (entry.decision === 'continue') {
      totalRetries++;
      if (entry.failedStep && retriesByStep[entry.failedStep] !== undefined) {
        retriesByStep[entry.failedStep]++;
      }
    }
  } catch {
    // Ignorer les lignes corrompues
  }
}

console.log('Statistiques du hook Stop :');
console.log('----------------------------');
console.log(`Nombre total de déclenchements : ${totalTriggers}`);
console.log(`Nombre de relances             : ${totalRetries}`);
console.log('Relances par étape :');
console.log(`  - typecheck : ${retriesByStep.typecheck}`);
console.log(`  - lint      : ${retriesByStep.lint}`);
console.log(`  - test      : ${retriesByStep.test}`);
