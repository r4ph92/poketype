import { afterEach, describe, expect, it, vi } from 'vitest';

const pushEnvironment = { PUSHER_APP_ID: 'app-id', PUSHER_KEY: 'app-key', PUSHER_SECRET: 'app-secret', PUSHER_HOST: 'localhost', PUSHER_PORT: '6001', PUSHER_USE_TLS: 'false' };

async function loadConfig(environment: Record<string, string>) {
  vi.resetModules();
  Object.entries(environment).forEach(([name, value]) => vi.stubEnv(name, value));
  return (await import('../../next.config')).default;
}

async function connectSources(environment: Record<string, string>): Promise<string> {
  const rules = await (await loadConfig(environment)).headers!();
  const policy = rules[0]!.headers.find((header) => header.key === 'Content-Security-Policy')!.value;
  return policy.split('; ').find((directive) => directive.startsWith('connect-src'))!;
}

const noPush = Object.fromEntries(Object.keys(pushEnvironment).map((name) => [name, '']));

describe('next config', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('stops next dev from rewriting CLAUDE.md with its agent-rules block', async () => {
    expect((await loadConfig(noPush)).agentRules).toBe(false);
  });

  it('lets the page open a websocket to the configured push server and nowhere else', async () => {
    expect(await connectSources(pushEnvironment)).toBe("connect-src 'self' ws://localhost:6001");
  });

  it('lets the page open a websocket to the Pusher cluster in production', async () => {
    const clusterEnvironment = { ...noPush, PUSHER_APP_ID: 'app-id', PUSHER_KEY: 'app-key', PUSHER_SECRET: 'app-secret', PUSHER_CLUSTER: 'us2' };
    expect(await connectSources(clusterEnvironment)).toBe("connect-src 'self' wss://ws-us2.pusher.com");
  });

  it('keeps connections to the site itself when push is not configured', async () => {
    expect(await connectSources(noPush)).toBe("connect-src 'self'");
  });

  it('refuses to load with a partial push configuration', async () => {
    await expect(loadConfig({ ...noPush, PUSHER_KEY: 'app-key' })).rejects.toThrow('PUSHER_APP_ID');
  });
});
