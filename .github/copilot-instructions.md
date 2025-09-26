# Copilot Instructions for DATA-CEA (Next.js + Supabase)

## Overview
- This is a Next.js app (App Router, `/app` directory) using Supabase for backend data (auth, queries, etc.).
- Main UI logic and pages are in `app/`, with subfolders for admin, instructor, login, and API routes.
- Supabase client/server logic is in `lib/supabaseClient.js` and `lib/supabaseServer.js`.
- Custom logic for authentication, validation, and UI is in `lib/auth/`, `lib/servicios/`, and `lib/ui/`.
- Components (e.g., providers) are in `components/`.
- Tailwind CSS is used for styling (see `tailwind.config.js`, `globals.css`).

## Key Patterns & Conventions
- **Pages:** Use `page.js`/`page.jsx` for route entry points. Use `layout.js`/`layout.jsx` for shared layouts.
- **API routes:** Located under `app/api/`, use `route.js` for Next.js API handlers.
- **State & Effects:** Use React hooks (`useState`, `useEffect`, `useMemo`) for stateful logic in client components.
- **Supabase:** Import from `@/lib/supabaseClient` for client-side DB access. Use async/await for all DB calls.
- **Role-based logic:** Many admin/instructor features depend on user roles (see `localStorage.getItem('currentUser')`).
- **Data export:** For Excel/PDF export, dynamically import `exceljs`, `file-saver`, `jspdf`, and `jspdf-autotable` as needed.
- **Notifications:** Use `sonner` for toast notifications.
- **Date handling:** Use custom helpers (e.g., `todayBogota`, `isSunday`) for date logic, not external libs.
- **Styling:** Use Tailwind utility classes and custom CSS variables (e.g., `--primary`).

## Developer Workflows
- **Start dev server:** `npm run dev` (default port 3000)
- **Build for production:** `npm run build`
- **Export static:** `npm run export`
- **Lint:** `npm run lint` (uses ESLint config in `eslint.config.mjs`)
- **No formal test suite** (as of current structure)

## Integration Points
- **Supabase:** All DB/auth logic is via Supabase (see `lib/supabaseClient.js`).
- **Excel/PDF export:** Only loaded on demand in relevant pages (see `app/admin/consultas/horarios/page.jsx`).
- **Authentication:** Custom logic in `lib/auth/` and API routes under `app/api/login/` and `app/api/logout/`.

## Examples
- See `app/admin/consultas/horarios/page.jsx` for advanced data querying, role-based UI, and export logic.
- See `components/providers/ToastProvider.jsx` for notification setup.
- See `lib/servicios/validaciones.js` for custom validation helpers.

## Project-specific Notes
- Use only the provided helpers for date/number formatting and role checks.
- All user-facing text is in Spanish.
- Avoid introducing new global state management unless required by feature scope.

---
If any section is unclear or missing key project knowledge, please provide feedback for improvement.
