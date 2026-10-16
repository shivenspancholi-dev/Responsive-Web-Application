# Responsive Web Application: TeamBoard

A full-stack task board for small teams. It has role-based authentication, real-time sync across every open browser, and a responsive UI that works from phone to desktop.

It is self-contained: authentication, data storage and live updates are all implemented in this codebase. There are no external services, APIs or keys.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## Features

- **Accounts and sessions**
  - Sign up and sign in with scrypt-hashed passwords.
  - Sessions use random tokens in `httpOnly`, `SameSite=Lax` cookies. Only a SHA-256 hash of each token is stored.
  - Sessions expire after 7 days.
  - Failed logins are rate-limited per email.
- **Role-based access**: `admin`, `member` and `viewer`, enforced on the server in every Server Action, with the same rules used to hide controls in the UI. The first account becomes the admin, and the last admin can't be demoted.
- **Real-time sync**: Server-Sent Events push a change notice to every signed-in browser, which then re-fetches its server data. Status changes also update optimistically, so the UI responds instantly.
- **Responsive UI**:
  - Three-column board on tablets and desktops.
  - Column tabs and a slide-down menu on phones.
  - Dark mode follows the system setting.
  - Accessible labels and focus states.
- **CI**: GitHub Actions runs the typecheck, the tests and a production build on every push and pull request.

## Roles

| Role | Can do |
| --- | --- |
| Admin | Everything, including changing roles on the **Team** page |
| Member | Create tasks, move any task, edit tasks they created or are assigned to, delete tasks they created |
| Viewer | Read-only access to the board |

Changing someone's role signs them out everywhere, so the new permissions apply immediately.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
```

Open the app, create the first account (it becomes the admin), then open a second browser window to watch changes sync live.

Production:

```bash
npm run build
npm start
```

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_FILE` | `data/db.json` | Where users, sessions and tasks are stored |
| `INSECURE_COOKIES` | *(unset)* | Set to `1` only if you must run the production build over plain HTTP on a host other than `localhost` |

## How it works

```
Browser ──Server Action──► permission check ──► Store (JSON file, serialised atomic writes)
   ▲                                                   │
   └──── EventSource /events ◄── change bus ◄──────────┘   (router.refresh() on every change)
```

```
app/
  actions.ts        Server Actions: signup, login, logout, tasks, roles
  events/route.ts   Server-Sent Events stream (signed-in users only)
  page.tsx          Board (server component)
  admin/page.tsx    Team and roles (admin only)
  login/, signup/   Auth pages
components/         Board, task form, header, live indicator, role picker
lib/
  permissions.ts    Who can do what (shared by server and UI)
  password.ts       scrypt hashing, session tokens
  session.ts        Cookie sessions, current user
  store.ts          JSON-file store with a write queue and atomic saves
  events.ts         In-process change bus
middleware.ts       Redirects signed-out visitors to /login
tests/              node:test suites
```

## Tests

```bash
npm test
npm run typecheck
```

## Scaling notes

The store and the change bus live in a single server process, which suits a small team on one server. To run several instances, replace `lib/store.ts` with a database and `lib/events.ts` with a shared pub/sub. Their interfaces were kept small for that reason.

## License

MIT
