import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ALL_STEPS = [
  { name: 'typecheck', cmd: 'npm run typecheck --silent' },
  { name: 'lint', cmd: 'npm run lint --silent' },
  { name: 'test', cmd: 'npm run test --silent' },
  { name: 'build', cmd: 'npm run build --silent' }
];

export const steps = ALL_STEPS;

export function runChecks(
  projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  stepNames = ['typecheck', 'lint', 'test', 'build']
) {
  const targetSteps = stepNames
    .map((name) => ALL_STEPS.find((s) => s.name === name))
    .filter(Boolean);

  const results = [];
  const overallStart = Date.now();
  let failure = null;

  for (let i = 0; i < targetSteps.length; i++) {
    const step = targetSteps[i];
    const stepStart = Date.now();
    try {
      execSync(step.cmd, {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: true,
        stdio: 'pipe',
        timeout: 45000
      });
      const stepDuration = Date.now() - stepStart;
      results.push({
        name: step.name,
        status: 'OK',
        durationMs: stepDuration
      });
    } catch (err) {
      const stepDuration = Date.now() - stepStart;
      results.push({
        name: step.name,
        status: 'ÉCHEC',
        durationMs: stepDuration
      });

      for (let j = i + 1; j < targetSteps.length; j++) {
        results.push({
          name: targetSteps[j].name,
          status: 'NON EXÉCUTÉ',
          durationMs: 0
        });
      }

      const isTimeout = err.code === 'ETIMEDOUT' || err.killed || (err.message && err.message.includes('ETIMEDOUT'));
      if (isTimeout) {
        failure = {
          step: step.name,
          details: `timeout sur ${step.name} (> 45s)`,
          rawOutput: `timeout sur ${step.name} (> 45s)`
        };
      } else {
        const stdout = err.stdout ? err.stdout.toString() : '';
        const stderr = err.stderr ? err.stderr.toString() : '';
        const fullOutput = (stdout + '\n' + stderr).trim();
        const lines = fullOutput.split(/\r?\n/).filter(Boolean);
        const last30Lines = lines.slice(-30).join('\n');
        failure = {
          step: step.name,
          details: last30Lines || err.message,
          rawOutput: fullOutput || err.message
        };
      }
      break;
    }
  }

  const totalDurationMs = Date.now() - overallStart;
  return { failure, results, totalDurationMs };
}

function formatDuration(ms) {
  return (ms / 1000).toFixed(1) + 's';
}

function printSummary(results, totalDurationMs) {
  console.log('--- Résumé des vérifications ---');
  for (const r of results) {
    const durationStr = r.status === 'NON EXÉCUTÉ' ? '-' : formatDuration(r.durationMs);
    console.log(`- ${r.name} : ${r.status} (${durationStr})`);
  }
  console.log(`Durée totale : ${formatDuration(totalDurationMs)}`);
}

const isDirectRun = Boolean(
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
);

if (isDirectRun) {
  const { failure, results, totalDurationMs } = runChecks();
  printSummary(results, totalDurationMs);
  if (failure) {
    console.error(`\nSortie d'erreur (${failure.step}) :\n${failure.rawOutput}`);
    process.exit(1);
  }
  process.exit(0);
}
