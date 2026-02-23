import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // Allow public paths
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
        if (isLoggedIn && pathname === '/login') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
