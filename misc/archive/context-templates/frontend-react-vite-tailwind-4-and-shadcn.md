# Frontend React + Vite Conventions

## Core Stack

### React Router: v7
- Single package: import everything from `"react-router"` (not `react-router-dom`)
- `createBrowserRouter` with object-based route definitions
- Nested routes with `<Outlet>` pattern
- Data loaders/actions if needed

### Tailwind CSS: v4
- CSS-first configuration — no `tailwind.config.js`
- `@import "tailwindcss"` replaces `@tailwind` directives
- `@theme {}` directive for design tokens
- `@tailwindcss/vite` plugin — no PostCSS config needed
- Oxide engine (Rust-based): 2-5x faster builds

### shadcn/ui
- Real library via `npx shadcn@latest init`
- Components copied into `src/components/ui/` — you own and modify them
- Uses `class-variance-authority` (CVA) for component variants
- `cn()` utility with `clsx` + `tailwind-merge`

### Recommended Dependencies
```json
"react": "^19.0",
"react-router": "^7.13",
"tailwindcss": "^4.0",
"@tailwindcss/vite": "^4.0",
"axios": "^1.7",
"lucide-react": "^0.460",
"react-hook-form": "^7.54",
"zod": "^3.24",
"@hookform/resolvers": "^3.9",
"zustand": "^5.0",
"class-variance-authority": "^0.7",
"clsx": "^2.1",
"tailwind-merge": "^3.0",
"tw-animate-css": "^1.0"
```

---

## Tech Stack Summary

- **React 19** with functional components and hooks
- **Vite** for fast development and optimized builds
- **Tailwind CSS v4** with CSS-first configuration
- **shadcn/ui** for composable UI primitives
- **React Router v7** for routing (single `react-router` package)
- **Axios** for API communication
- **Lucide React** for consistent iconography
- **React Hook Form + Zod** for form handling and validation
- **Zustand** for global state management

---

## Project Structure

```
src/
├── features/           # Business logic modules
│   ├── auth/          # Authentication (login, register, password reset)
│   ├── dashboard/     # Main dashboard views
│   ├── users/         # User management (admin)
│   └── not-found/     # 404 handling
├── components/        # Shared components
│   └── ui/            # shadcn/ui primitives (button, input, card, etc.)
├── lib/               # Utilities (cn(), etc.)
├── hooks/             # Shared custom hooks
├── services/          # API services
├── stores/            # Zustand stores
├── constants/         # App-wide constants
└── routes/            # Route definitions and protection
```

---

## Setup

### Vite Config
```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### shadcn/ui Init
```bash
npx shadcn@latest init
```

This generates `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Adding Components
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add dialog
# etc.
```

---

## Theming (Tailwind v4 + shadcn/ui)

### CSS Variables in `src/index.css`
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --radius: 0.625rem;
  }

  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.145 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.145 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.985 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(0.269 0 0);
    --input: oklch(0.269 0 0);
    --ring: oklch(0.439 0 0);
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Key differences from v3:**
- `@import "tailwindcss"` instead of `@tailwind base/components/utilities`
- `@theme inline {}` maps CSS variables to Tailwind utilities (generates `bg-primary`, `text-muted-foreground`, etc.)
- No `tailwind.config.js` needed — everything is CSS-first
- Colors use `oklch()` instead of `hsl()` for better perceptual uniformity

---

## The cn() Utility

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Used throughout all components for composable, override-friendly class merging.

---

## Development Guidelines

### Component Patterns
1. **Functional Components Only** — use hooks for all state management
2. **Feature Isolation** — keep feature-specific code within feature folders
3. **shadcn/ui Components** — use real shadcn/ui primitives from `@/components/ui`
4. **Compose, don't wrap** — build complex UI by composing shadcn primitives, not wrapping them
5. **Form Components** — use shadcn Form components with React Hook Form

### State Management
- **Local State**: `useState` for component-specific state
- **Global State**: Zustand stores in `/stores`
- **Form State**: React Hook Form for all forms
- **Server State**: Direct API calls with loading/error handling

### Zustand Store Pattern
```ts
// src/stores/useAuthStore.ts
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

---

## Routing (React Router v7)

### Route Definitions
```tsx
// src/routes/router.tsx
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "users", element: <Users /> },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### Protected Route Pattern
```tsx
// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

---

## API Integration

### Service Pattern
```ts
// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Service Class Pattern
```ts
// src/services/UserService.ts
import api from "./api";

class UserService {
  async getUsers() {
    const { data } = await api.get("/users");
    return data;
  }

  async createUser(userData: CreateUserInput) {
    const { data } = await api.post("/users", userData);
    return data;
  }
}

export default Object.freeze(new UserService());
```

---

## Code Standards

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserForm.tsx` |
| Hooks | camelCase with 'use' prefix | `useAuth.ts` |
| Services | PascalCase class names | `AuthService.ts` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS` |
| UI Primitives | lowercase (shadcn convention) | `button.tsx`, `input.tsx` |
| Stores | camelCase with 'use' prefix | `useAuthStore.ts` |

### Form Handling (shadcn Form + React Hook Form + Zod)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

type UserFormValues = z.infer<typeof userSchema>;

function UserForm() {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = async (data: UserFormValues) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## Key Features Implementation

### Authentication Flow
- JWT tokens stored in httpOnly cookies
- Automatic token refresh on 401 responses
- Protected routes using `ProtectedRoute` component
