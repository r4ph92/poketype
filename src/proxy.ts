import { NextResponse, type NextRequest } from 'next/server';

const crossSiteFetchSites = new Set(['cross-site', 'same-site']);
const undecodableRoomTarget = '/rooms/unavailable';

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
  if (!isRoomApi && !pathname.startsWith('/rooms/')) return null;
  if (!isUndecodable(pathname)) return null;
  if (isRoomApi) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.rewrite(new URL(undecodableRoomTarget, request.url));
}

// Next cannot decode such a dynamic segment (500 for pages, 400 for route handlers, even after a rewrite to another dynamic value), so pages go to a static route and the API answers like an unknown room.
export function proxy(request: NextRequest): NextResponse {
  if (request.method === 'POST' && !isTrustedPost(request)) return new NextResponse(null, { status: 403 });
  return answerUndecodableRoomPath(request) ?? NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
