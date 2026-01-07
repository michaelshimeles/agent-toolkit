import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}