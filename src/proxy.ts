import { NextResponse, type NextRequest } from 'next/server';

const crossSiteFetchSites = new Set(['cross-site', 'same-site']);
const undecodablePageTargets = [
  { prefix: '/rooms/', target: '/rooms/unavailable' },
  { prefix: '/invite/', target: '/invite/invalid' },
];

function isTrustedPost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  return !crossSiteFetchSites.has(request.headers.get('sec-fetch-site') ?? '');
}

function isUndecodable(pathname: string): boolean {
  try {
    decodeURIComponent(pathname);
    return false;
  } catch {
    return true;
  }
}

function answerUndecodableRoomPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const isRoomApi = pathname.startsWith('/api/rooms/');
  const page = undecodablePageTargets.find(({ prefix }) => pathname.startsWith(prefix));
  if ((!isRoomApi && !page) || !isUndecodable(pathname)) return null;
  if (!page) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.rewrite(new URL(page.target, request.url));
}

// Next cannot decode such a dynamic segment (500 for pages, 400 for route handlers, even after a rewrite to another dynamic value), so pages go to a static route (an invitation to "Invitation invalide") and the API answers like an unknown room.
export function proxy(request: NextRequest): NextResponse {
  if (request.method === 'POST' && !isTrustedPost(request)) return new NextResponse(null, { status: 403 });
  return answerUndecodableRoomPath(request) ?? NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
