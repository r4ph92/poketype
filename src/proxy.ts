import { NextResponse, type NextRequest } from 'next/server';

const crossSiteFetchSites = new Set(['cross-site', 'same-site']);

function isTrustedPost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  return !crossSiteFetchSites.has(request.headers.get('sec-fetch-site') ?? '');
}

export function proxy(request: NextRequest): NextResponse {
  if (request.method === 'POST' && !isTrustedPost(request)) return new NextResponse(null, { status: 403 });
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
