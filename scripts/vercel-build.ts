import { spawnSync } from 'node:child_process';

export type BuildStep = { label: string; command: string; args: readonly string[]; environment?: Readonly<Record<string, string>> };

type BuildEnvironment = Readonly<Record<string, string | undefined>>;

// Migrations run over the direct (unpooled) Neon URL because DDL does not belong behind the pooler.
export function planVercelBuild(environment: BuildEnvironment): BuildStep[] {
  const migrationUrl = environment.DATABASE_URL_UNPOOLED || environment.DATABASE_URL;
  if (!migrationUrl) throw new Error('DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set: the deployment cannot migrate the database.');
  const steps: BuildStep[] = [{ label: 'Migrate the database', command: 'npm', args: ['run', 'db:migrate'], environment: { DATABASE_URL: migrationUrl } }];
  if (environment.SEED_ASH_PASSWORD) steps.push({ label: 'Seed the ash account', command: 'npm', args: ['run', 'db:seed'], environment: { DATABASE_URL: migrationUrl } });
  steps.push({ label: 'Build the app', command: 'npm', args: ['run', 'build'] });
  return steps;
}

function runStep(step: BuildStep): void {
  console.log(`vercel-build: ${step.label}`);
  const result = spawnSync(step.command, step.args, { stdio: 'inherit', env: { ...process.env, ...step.environment } });
  if (result.status !== 0) throw new Error(`vercel-build failed at: ${step.label}`);
}

if (process.argv[1]?.endsWith('vercel-build.ts')) {
  try {
    planVercelBuild(process.env).forEach(runStep);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
