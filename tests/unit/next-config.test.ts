import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('next config', () => {
  it('stops next dev from rewriting CLAUDE.md with its agent-rules block', () => {
    expect(nextConfig.agentRules).toBe(false);
  });
});
