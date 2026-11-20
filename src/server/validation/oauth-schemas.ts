import { z } from 'zod';
import { oauthProviders } from '@/domain/oauth-provider';

const secretToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const queryValue = (maxLength: number) => z.string().max(maxLength).optional();

export const oauthRouteParamsSchema = z.object({ provider: z.enum(oauthProviders) });

// Providers may add their own parameters, so only these three are read; an over-long value refuses the callback.
export const oauthCallbackQuerySchema = z.object({ code: queryValue(512), state: queryValue(128), error: queryValue(64) });

export const oauthFlowSchema = z.strictObject({
  provider: z.enum(oauthProviders),
  state: secretToken,
  codeVerifier: secretToken,
  destination: z.string().max(200).nullable(),
  sessionBinding: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  expiresAt: z.number().int().positive(),
});
