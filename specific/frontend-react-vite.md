# Frontend React + Vite Conventions

## Core Stack

### React Router: v6 (v6.4+)
- Clean hooks API (`useNavigate`, `useParams`, `useLoaderData`)
- Nested routes with `<Outlet>` pattern
- Data loaders if needed, but often just the basic routing is enough

### Tailwind CSS: v3.4
- Rock solid, widely adopted
- Great documentation and ecosystem
- v4 exists but v3.4 is more battle-tested
- Use CSS variables for theming (shadcn pattern)

### Recommended Dependencies
```json
"react": "^19.0",
"react-router-dom": "^6.28",
"tailwindcss": "^3.4",
"axios": "^1.7",
"lucide-react": "^0.460",
"react-hook-form": "^7.54",
"zod": "^3.24",
"@hookform/resolvers": "^3.9",
"zustand": "^5.0"
```

---

## Tech Stack Summary

- **React 19** with functional components and hooks
- **Vite** for fast development and optimized builds
- **Axios** for API communication
- **Lucide React** for consistent iconography
- **React Hook Form + Zod** for form handling and validation
- **Zustand** for global state management
- **Tailwind CSS** with variable themes (shadcn pattern)

---

## Project Structure

```
src/
├── features/           # Business logic modules
│   ├── auth/          # Authentication (login, register, password reset)
│   ├── dashboard/     # Main dashboard views
│   ├── users/         # User management (admin)
│   └── not-found/     # 404 handling
├── shared/            # Reusable components and utilities
│   ├── components/    # UI components used across features
│   │   └── ui/        # UI primitives (button, input, card, etc.)
│   ├── constants/     # App-wide constants
│   ├── hooks/         # Shared custom hooks
│   ├── routes/        # Route protection components
│   ├── services/      # Shared API services
│   └── stores/        # Zustand stores
```

---

## Development Guidelines

### Component Patterns
1. **Functional Components Only** - Use hooks for all state management
2. **Feature Isolation** - Keep feature-specific code within feature folders
3. **Shared Components** - Place reusable UI in `/shared/components`
4. **UI Primitives** - Mimic shadcn design pattern for base components
5. **Form Components** - Use `FormInput`, `FormSelect`, etc. from shared forms

### State Management
- **Local State**: `useState` for component-specific state
- **Global State**: Zustand stores in `/shared/stores`
- **Context**: AuthContext for authentication state (or Zustand)
- **Form State**: React Hook Form for all forms
- **Server State**: Direct API calls with loading/error handling

### Zustand Store Pattern
```tsx
// shared/stores/useAuthStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

---

## Theming (shadcn Pattern)

### CSS Variables in `index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode values */
  }
}
```

### Tailwind Config
```js
// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

---

## API Integration

### Service Pattern
```js
// shared/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Add auth headers if needed
  return config;
});

// Response interceptor
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
```js
// shared/services/UserService.js
import api from './api';

class UserService {
  async getUsers() {
    const { data } = await api.get('/users');
    return data;
  }

  async createUser(userData) {
    const { data } = await api.post('/users', userData);
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
| Components | PascalCase | `UserForm.jsx` |
| Hooks | camelCase with 'use' prefix | `useAuth.js` |
| Services | PascalCase class names | `AuthService.js` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS` |
| UI Primitives | lowercase | `button.jsx`, `input.jsx` |
| Stores | camelCase with 'use' prefix | `useAuthStore.js` |

### Form Handling
```tsx
// Always use React Hook Form with Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

function UserForm() {
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data) => {
    // Handle submission
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Error Handling
```tsx
// Consistent error handling pattern
try {
  const result = await UserService.createUser(data);
  // Handle success
} catch (error) {
  // Show user-friendly message
  console.error('User creation failed:', error);
}
```

---

## Key Features Implementation

### Authentication Flow
- JWT tokens stored in httpOnly cookies
- Automatic token refresh on 401 responses
- Protected routes using `ProtectedRoute` component

### Protected Route Pattern
```tsx
// shared/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```
