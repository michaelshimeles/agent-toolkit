# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in this MCP App Store repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI interface

### Running Single Tests
Use Vitest's filtering capabilities:
- `npm run test -- filename.test.ts` - Run specific test file
- `npm run test -- -t "test name"` - Run tests matching name
- `npm run test -- --reporter=verbose` - Detailed output

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 16.1.1, React 19.2.3, TypeScript
- **Backend**: Convex for database/serverless functions
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Authentication**: Clerk
- **Testing**: Vitest with React Testing Library
- **Code Editor**: Monaco Editor

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (UI, workspace, code editor)
- `convex/` - Database schema, server functions, and data logic
- `lib/` - Utility functions and shared logic
- `server/` - Integration implementations and gateway logic
- `packages/client/` - Standalone MCP client package

## Code Style Guidelines

### Import Organization
```typescript
// 1. React/Next.js imports
import { ReactNode } from "react";
import { Metadata } from "next";

// 2. Third-party libraries
import { cva } from "class-variance-authority";
import { ClerkProvider } from "@clerk/nextjs";

// 3. Local imports (use @ alias)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

### Component Patterns
- Use functional components with React 19+ features
- Prefer TypeScript interfaces over types for object shapes
- Use `cn()` utility for conditional Tailwind classes
- Follow shadcn/ui patterns for component variants

```typescript
interface ButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

function Button({ variant = "default", size = "md", children }: ButtonProps) {
  return <div className={cn(buttonVariants({ variant, size }))}>{children}</div>;
}
```

### TypeScript Configuration
- Strict mode disabled (`"strict": false`)
- Path alias configured: `@/*` maps to project root
- Use `v.id()` for Convex table references
- Zod for runtime validation schemas

### Naming Conventions
- **Components**: PascalCase (e.g., `CodeEditor`, `ShareDialog`)
- **Functions**: camelCase (e.g., `validateCode`, `formatCode`)
- **Variables**: camelCase, descriptive names
- **Constants**: UPPER_SNAKE_CASE for exports
- **Files**: kebab-case for components, camelCase for utilities

### Error Handling
- Use custom `ValidationError` class for validation errors
- Return structured error objects with field names
- Implement proper error boundaries in React components
- Use try-catch blocks for async operations

```typescript
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

### Testing Patterns
- Use Vitest with `describe`, `it`, `expect` globals
- Mock external dependencies with `vi.mock()`
- Test component rendering, user interactions, and edge cases
- Structure tests with nested describe blocks for organization

```typescript
describe("ComponentName", () => {
  describe("Feature Group", () => {
    it("should behave correctly", () => {
      // Test implementation
    });
  });
});
```

### Convex/Database Patterns
- Define schemas in `convex/schema.ts` with proper indexing
- Use `v.union()` for status fields and enums
- Implement proper relationships with `v.id()` references
- Write mutation functions that return updated data

### UI/Component Guidelines
- Use shadcn/ui components as base
- Implement proper dark mode support via `next-themes`
- Use `class-variance-authority` for component variants
- Follow responsive design patterns with Tailwind

### Security Best Practices
- Never expose secrets or API keys in client code
- Validate all user inputs with Zod schemas
- Use Convex's built-in authentication checks
- Implement proper rate limiting for API endpoints

## Development Workflow

1. **Before coding**: Run `npm run lint` to check current state
2. **While coding**: Use `npm run dev` for hot reloading
3. **After changes**: Run `npm run lint` and `npm run test:run`
4. **Before commit**: Ensure all tests pass and linting is clean

## File Structure Patterns

```
component-name.tsx          # Component implementation
component-name.test.tsx     # Component tests
component-name.stories.tsx   # Storybook stories (if applicable)
```

## Integration Development

When adding new integrations:
1. Create implementation in `server/integrations/`
2. Add schema entry in `convex/schema.ts`
3. Create UI components in `components/integrations/`
4. Write tests for both server and client code
5. Update integration catalog in Convex seed data

## Performance Considerations

- Use React.memo for expensive components
- Implement proper loading states with Suspense
- Optimize Convex queries with appropriate indexes
- Use Next.js Image component for media assets
- Implement code splitting for large components