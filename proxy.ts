import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin dashboard routes
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
};
