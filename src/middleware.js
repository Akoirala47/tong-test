// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'; // REMOVED OLD HELPER
import { NextResponse } from 'next/server';
import { updateSession } from './utils/supabase/middleware' // IMPORT NEW HELPER
import { createServerClient } from '@supabase/ssr'; // Need this to read session *after* updateSession

// Hardcoded admin email for initial setup
const ADMIN_EMAIL = 'aayush.k204@gmail.com'; 

export async function middleware(req) {
  // 1. Run updateSession first to handle session refresh and cookie management.
  // It returns a response object (potentially modified with cookies) that MUST be returned later.
  const response = await updateSession(req); 

  // 2. Get user session AFTER updateSession has run.
  // We need to create a temporary client here using the request cookies *as potentially modified by updateSession*.
  // This seems redundant, but updateSession doesn't directly return the user object.
  // Alternatively, modify updateSession utility to return { response, user }? 
  // Let's stick to the docs pattern for now.
  const tempSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // Use cookies from the potentially modified request within the response
          return response.cookies.getAll() 
        },
      },
    }
  );
  const { data: { user } } = await tempSupabase.auth.getUser();
  console.log('Middleware: User after updateSession:', user); // Log user status

  const { pathname } = req.nextUrl; 

  // --- Protect /admin route ---
  if (pathname.startsWith('/admin')) {
    // 1. Check if user is logged in (using user from step 2)
    if (!user) {
      console.log('Middleware: No user found for /admin after updateSession, redirecting to login.');
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', pathname); // Optional: add redirect info
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Check if the logged-in user is the designated admin
    if (user.email !== ADMIN_EMAIL) {
       console.log(`Middleware: User ${user.email} is not admin, redirecting from /admin.`);
       const redirectUrl = req.nextUrl.clone();
       redirectUrl.pathname = '/dashboard'; // Redirect non-admins to dashboard
       return NextResponse.redirect(redirectUrl);
    }

    // Option B: Check is_admin flag in profiles table (more flexible but requires DB query)
    /* 
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (error || !profile || !profile.is_admin) {
      console.error('Middleware: Error fetching profile or user is not admin.', error);
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard'; // Redirect non-admins to dashboard
      return NextResponse.redirect(redirectUrl);
    }
    */

    console.log(`Middleware: Admin access granted for ${user.email} to ${pathname}`);
    // If checks pass, allow access to /admin by returning the response from updateSession
    return response; 
  }

  // --- Protect other routes (e.g., /dashboard) ---
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/assessment') || pathname.startsWith('/call')) {
     if (!user) {
       console.log(`Middleware: No user found for ${pathname} after updateSession, redirecting to login.`);
       const redirectUrl = req.nextUrl.clone();
       redirectUrl.pathname = '/login';
       redirectUrl.searchParams.set('redirectedFrom', pathname);
       return NextResponse.redirect(redirectUrl);
     }
  }

  // Allow all other requests to proceed by returning the response from updateSession
  return response;
}

// Define which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
