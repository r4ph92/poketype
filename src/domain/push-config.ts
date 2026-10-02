// The only push settings a browser receives: where to connect and the public app key, never the secret.
export type PublicPushConfig = { key: string; host: string; port: number; useTls: boolean };
