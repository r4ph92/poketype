import { describe, expect, it } from 'vitest';
import { planVercelBuild } from '../../scripts/vercel-build';

const labels = (environment: Record<string, string>) => planVercelBuild(environment).map((step) => step.label);

describe('vercel build plan', () => {
  it('migrates, seeds ash, then builds', () => {
    expect(labels({ DATABASE_URL: 'postgres://pooled', SEED_ASH_PASSWORD: 'secret-password' })).toEqual(['Migrate the database', 'Seed the ash account', 'Build the app']);
  });

  it('skips the seed without an ash password', () => {
    expect(labels({ DATABASE_URL: 'postgres://pooled' })).toEqual(['Migrate the database', 'Build the app']);
  });

  it('prefers the unpooled URL for migrations and seed but not for the build', () => {
    const steps = planVercelBuild({ DATABASE_URL: 'postgres://pooled', DATABASE_URL_UNPOOLED: 'postgres://direct', SEED_ASH_PASSWORD: 'secret-password' });
    expect(steps.map((step) => step.environment?.DATABASE_URL)).toEqual(['postgres://direct', 'postgres://direct', undefined]);
  });

  it('falls back to the pooled URL', () => {
    expect(planVercelBuild({ DATABASE_URL: 'postgres://pooled' })[0]!.environment).toEqual({ DATABASE_URL: 'postgres://pooled' });
  });

  it('fails before building when no database URL exists', () => {
    expect(() => planVercelBuild({})).toThrow('DATABASE_URL');
  });
});
