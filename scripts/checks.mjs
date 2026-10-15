import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const steps = [
  { name: 'typecheck', cmd: 'npm run typecheck --silent' },
  { name: 'lint', cmd: 'npm run lint --silent' },
  { name: 'test', cmd: 'npm test --silent' }
];

export function runChecks(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  for (const step of steps) {
    try {
      execSync(step.cmd, {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: true,
        stdio: 'pipe',
        timeout: 45000
      });
    } catch (err) {
      const isTimeout = err.code === 'ETIMEDOUT' || err.killed || (err.message && err.message.includes('ETIMEDOUT'));
      if (isTimeout) {
        return {
          failure: {
            step: step.name,
            details: `timeout sur ${step.name} (> 45s)`
          }
        };
      }
      const stdout = err.stdout ? err.stdout.toString() : '';
      const stderr = err.stderr ? err.stderr.toString() : '';
      const fullOutput = (stdout + '\n' + stderr).trim();
      const lines = fullOutput.split(/\r?\n/).filter(Boolean);
      const last30Lines = lines.slice(-30).join('\n');
      return {
        failure: {
          step: step.name,
          details: last30Lines || err.message
        }
      };
    }
  }
  return { failure: null };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { failure } = runChecks();
  if (failure) {
    console.error(`[checks] Echec lors de la verification "${failure.step}" :\n${failure.details}`);
    process.exit(1);
  }
  console.log('[checks] Toutes les verifications ont reussi (typecheck, lint, test).');
  process.exit(0);
}
