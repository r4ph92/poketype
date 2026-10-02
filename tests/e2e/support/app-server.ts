import { spawn, type ChildProcess } from 'node:child_process';

export type AppServer = { url: string; stop: () => Promise<void> };

async function isServerUp(url: string): Promise<boolean> {
  return (await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => null)) !== null;
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function killProcessGroup(child: ChildProcess): void {
  if (child.pid) process.kill(-child.pid, 'SIGKILL');
}

type ServerEnvironment = Record<string, string>;

function spawnNextStart(port: number, environment: ServerEnvironment, output: string[]): ChildProcess {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], {
    env: { ...process.env, ...environment },
    detached: true,
  });
  child.stdout?.on('data', (chunk: Buffer) => output.push(chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => output.push(chunk.toString()));
  return child;
}

export async function startAppServer(port: number, databaseUrl: string, environment: ServerEnvironment = {}): Promise<AppServer> {
  const url = `http://localhost:${port}`;
  if (await isServerUp(url)) throw new Error(`port ${port} must be free`);

  const output: string[] = [];
  const child = spawnNextStart(port, { ...environment, DATABASE_URL: databaseUrl }, output);
  const stop = async () => {
    killProcessGroup(child);
    await waitFor(async () => !(await isServerUp(url)), 10_000);
  };

  if (!(await waitFor(() => isServerUp(url), 30_000))) {
    await stop();
    throw new Error(`next start on port ${port} never became ready:\n${output.join('')}`);
  }
  return { url, stop };
}
