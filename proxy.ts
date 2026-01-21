import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    "/",
    '/sign-in(.*)',
    '/sign-up(.*)',
    // API routes that handle their own auth (via API key, webhook signature, or internal auth)
    '/api/health(.*)',
    '/api/docs(.*)',
    '/api/gateway(.*)',
    '/api/webhooks(.*)',
    '/api/integrations(.*)',
    '/api/mcp-test(.*)',  // Handles auth via API key only
    '/api/keys(.*)',       // Handles auth internally via Clerk
])

function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')
    // XSS protection (legacy browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block')
    // Control referrer information
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    // HSTS in production
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    // Content Security Policy - includes Clerk domains for authentication UI
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src https://*.clerk.accounts.dev https://challenges.cloudflare.com; frame-ancestors 'none';")
    return response
}

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        await auth.protect()
    }
    const response = NextResponse.next()
    return addSecurityHeaders(response)
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}