import { NextResponse, type NextRequest } from 'next/server';

const crossSiteFetchSites = new Set(['cross-site', 'same-site']);
const undecodableRoomTarget = '/rooms/unavailable';

function isTrustedPost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  return !crossSiteFetchSites.has(request.headers.get('sec-fetch-site') ?? '');
}

function hasUndecodableRoomSegment(pathname: string): boolean {
  if (!pathname.startsWith('/rooms/')) return false;
  try {
    decodeURIComponent(pathname);
    return false;
  } catch {
    return true;
  }
}

// Next answers 500 for a dynamic segment it cannot decode, even after a rewrite to another dynamic value, so the target is a static route.
export function proxy(request: NextRequest): NextResponse {
  if (request.method === 'POST' && !isTrustedPost(request)) return new NextResponse(null, { status: 403 });
  if (hasUndecodableRoomSegment(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(undecodableRoomTarget, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
