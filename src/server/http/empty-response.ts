export const noStoreHeaders = { 'Cache-Control': 'no-store' };

export function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: noStoreHeaders });
}
