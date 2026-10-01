import { randomUUID } from 'node:crypto';
import type { FullConfig } from '@playwright/test';

// next dev compiles each route on its first request, which can outlast a 5 s expectation; next start (CI) serves compiled routes.
export default async function warmUpDevServer(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (process.env.CI || !baseURL) return;
  const roomId = randomUUID();
  for (const path of ['/', '/play', `/rooms/${roomId}`, `/api/rooms/${roomId}/snapshot`, `/api/rooms/${roomId}/start`, `/api/rooms/${roomId}/progress`]) {
    await fetch(new URL(path, baseURL), { redirect: 'manual' });
  }
}
