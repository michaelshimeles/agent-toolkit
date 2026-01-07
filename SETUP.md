# Setup Guide

This guide will help you set up the MCP Hub application from scratch.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Convex account (sign up at https://convex.dev)
- A Clerk account (sign up at https://clerk.com)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Encryption (generate a random 32-character string)
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 3. Initialize Convex

Start the Convex development server:

```bash
npx convex dev
```

This will:
- Create a new Convex project (if you don't have one)
- Deploy the schema and functions
- Generate TypeScript types in `convex/_generated/`
- Watch for changes and auto-deploy

**Important**: Keep this terminal running while developing.

### 4. Seed the Database

In a new terminal, seed the database with the GitHub integration:

```bash
npx convex run seed:seedIntegrations
```

### 5. Set Up Clerk

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Copy the publishable and secret keys to `.env.local`
4. Set up webhooks:
   - Go to Webhooks in the Clerk dashboard
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the webhook secret to `.env.local`

### 6. Run Tests

Ensure all tests pass:

```bash
npm test
```

You should see:
```
Test Files: 8 passed (8)
Tests: 114 passed (114)
```

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Build for Production

To create a production build:

```bash
npm run build
```

**Note**: The build requires Convex to be deployed and generating types. Make sure `npx convex dev` has run successfully first.

## Troubleshooting

### Build Fails with "Property 'auth' does not exist"

This means Convex hasn't generated the TypeScript types yet. Run:

```bash
npx convex dev
```

Wait for it to finish deploying, then try the build again.

### "Missing required environment variables"

Make sure you've:
1. Copied `.env.example` to `.env.local`
2. Filled in all required values
3. Restarted your development server

### Tests Failing

Run tests in verbose mode to see which tests are failing:

```bash
npm test -- --reporter=verbose
```

### Clerk Webhook Not Working

1. Make sure you've set the webhook URL correctly
2. Verify the webhook secret in `.env.local` matches Clerk
3. Check that you're subscribed to the correct events
4. Use ngrok or similar for local development:
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL for your webhook endpoint

## Development Workflow

1. Keep `npx convex dev` running in one terminal
2. Run `npm run dev` in another terminal
3. Run `npm test -- --watch` in a third terminal for continuous testing
4. Make changes and see them reflected immediately

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically:
- Install dependencies
- Run the build
- Deploy your application

### Deploying Convex to Production

```bash
npx convex deploy --prod
```

This will create a production Convex deployment. Update your `NEXT_PUBLIC_CONVEX_URL` in Vercel to point to the production URL.

## Support

If you encounter issues:
1. Check the main README.md for detailed documentation
2. Review the plan.md for architecture details
3. Open an issue on GitHub
