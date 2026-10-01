import { endSession } from '@/server/sessions/end-session';

const seeOther = 303;

// A plain form post answered by a redirect loads a new document, which drops the router cache that Back would otherwise show with the old identity.
export async function POST(): Promise<Response> {
  await endSession();
  return new Response(null, { status: seeOther, headers: { Location: '/', 'Cache-Control': 'no-store' } });
}
