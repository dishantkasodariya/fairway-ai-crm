---
name: shadcn
description: Deep knowledge of shadcn/ui components, patterns, and best practices for creating, customizing, and composing accessible UI components using Lucide icons and clean CSS design tokens.
---

# shadcn/ui Skill

This skill provides comprehensive instructions for designing, composing, and maintaining shadcn/ui components within this modular codebase.

## 1. Core Principles
- **No Random AI-Generated Icons**: Exclusively use official `lucide-react` icons (e.g., `<Plus />`, `<Building2 />`, `<FileText />`, `<TrendingUp />`, `<Check />`, `<Eye />`, etc.).
- **No Arbitrary Hardcoded Colors**: Use Tailwind & CSS variable design tokens (`bg-background`, `bg-surface`, `bg-card`, `text-foreground`, `text-foreground-muted`, `border-border`, `bg-fairway-600`, `text-fairway-900`, etc.).
- **Modular Component Primitives**: All UI primitives live exclusively in `@/modules/core/components/ui/` (`Button`, `Input`, `Label`, `Badge`, `Card`, `Modal` / `Dialog`, `DropdownMenu`, `Tabs`, `Breadcrumbs`, `Skeleton`, `EmptyState`, etc.).
- **Accessibility & Keyboard Navigation**: Follow standard Radix / Shadcn ARIA patterns (`aria-expanded`, `aria-haspopup`, `role="dialog"`, ESC key triggers, focus rings via `ring-fairway-600`).

## 2. Component Reference
- **Button**: Supports variants (`primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`), sizes (`xs`, `sm`, `md`, `lg`), `leftIcon`, `rightIcon`, and `isLoading`.
- **Input / Select / Textarea**: Standardized form controls with `label`, `error`, `helperText`, and `leftIcon` / `rightIcon` support.
- **Label**: Dedicated accessible label component with required asterisk (`*`) support.
- **Modal / Dialog**: Viewport-centered modal rendered via React `createPortal(..., document.body)` with backdrop blur and responsive `maxWidth` constraints (`sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `full`).
- **DropdownMenu**: Accessible click-outside popovers with `DropdownMenuItem`, `DropdownMenuSeparator`, and `DropdownMenuLabel`.
- **Badge**: Dense semantic status pills (`default`, `secondary`, `success`, `warning`, `danger`, `outline`, `accent`) with optional status dot.
- **Card**: Card container with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.

## 3. Composition Rules
1. Never duplicate UI primitives outside `src/modules/core/components/ui/`.
2. Form fields must always compose with standard `Label` and `Input`/`Select`/`Textarea` components.
3. Keep action buttons visually aligned with Lucide icons (no bare text symbols like `+` or `✓`).
