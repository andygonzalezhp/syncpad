# SyncPad

[![CI](https://github.com/andygonzalezhp/syncpad/actions/workflows/ci.yml/badge.svg)](https://github.com/andygonzalezhp/syncpad/actions/workflows/ci.yml)

SyncPad is a full-stack, real-time collaborative rich-text editor built with Next.js, Spring Boot, Hocuspocus, Yjs, PostgreSQL, Redis, and Clerk.

It allows multiple authenticated users to edit the same document simultaneously, see who else is present, share documents with role-based permissions, and discuss content through persistent comment threads and replies.

The project is designed as a production-oriented collaborative system rather than a basic text editor demo. It includes persistent collaborative state, server-side authorization, database migrations, automated testing, CI, responsive interfaces, and protections against stale or revoked permissions.

## Project status

SyncPad is under active development.

Implemented:

- Real-time collaborative editing
- Rich-text document editing
- Persistent document storage
- Clerk authentication
- Document dashboard and CRUD operations
- Owner, editor, and viewer roles
- Document invitations and sharing
- Server-side permission enforcement
- Presence indicators
- Connection and synchronization status
- Inline comment threads
- Comment replies
- Resolve and reopen functionality
- Real-time comment synchronization
- Responsive comments drawer
- Permission-revocation handling
- Database migrations with Flyway
- Frontend, collaboration-service, and backend tests
- GitHub Actions CI

In progress:

- Production Docker configuration
- Public deployment
- Dependency and security remediation
- Observability and production monitoring
- Expanded end-to-end coverage
- AI-assisted writing features

---

## Features

### Real-time collaborative editing

Multiple users can open and edit the same document simultaneously.

Document changes are represented through Yjs shared data structures and synchronized over WebSockets through the Hocuspocus collaboration server. This allows concurrent edits to merge without relying on traditional last-write-wins behavior.

The editor also displays:

- Active collaborators
- User presence
- Connection state
- Synchronization state
- Reconnection behavior

### Rich-text editor

SyncPad uses Tiptap as its editor framework.

The editor supports structured rich text while remaining compatible with Yjs collaborative state. The editing interface is designed to behave like a focused writing application rather than a raw collaborative textarea.

### Authentication

Authentication is handled by Clerk.

Signed-out users see a public landing page. Signed-in users can access their dashboard, create documents, and open documents shared with them.

The frontend sends Clerk-issued authentication tokens to the API and collaboration server. Authentication is verified on the server rather than relying only on client-side UI state.

### Document dashboard

The dashboard allows users to:

- Create documents
- View documents they own
- View documents shared with them
- Open existing documents
- Rename documents
- Delete documents when authorized
- Identify their role for each document
- Access sharing controls

### Role-based sharing

Each document supports three roles:

| Role | Capabilities |
|---|---|
| `OWNER` | Edit, comment, share, manage permissions, rename, and delete |
| `EDITOR` | Edit the document and participate in comments |
| `VIEWER` | Read the document without modifying its content |

Permissions are enforced by the backend and collaboration server. Hiding an editing button in the frontend is not treated as a security boundary.

When a user’s permission is revoked, connected clients are informed and prevented from continuing unauthorized collaboration.

### Comments and replies

Users with sufficient permission can attach comment threads to document content.

The comment system supports:

- Inline comment anchors
- Persistent comment metadata
- Replies
- Resolved threads
- Reopening resolved threads
- Filtering resolved comments
- Real-time updates between connected users

Comment thread identifiers are stored inside Tiptap marks, while comment metadata is stored in PostgreSQL.

The Spring Boot API remains the authoritative source for comment data. Hocuspocus broadcasts lightweight events indicating that comment data changed, and clients then fetch the current authoritative state from the API.

### Persistent collaborative state

Document content is persisted in PostgreSQL rather than existing only in browser memory.

The collaboration server loads and stores Yjs document state, allowing users to close a document and return later without losing collaborative content.

Flyway manages database schema changes and preserves an auditable migration history.

### Responsive interface

The application is designed for desktop and smaller screens.

Responsive behavior includes:

- Adaptive dashboard layouts
- Mobile-friendly navigation
- Collapsible or drawer-based comment interfaces
- Permission-aware editing controls
- Clear loading and error states
- Accessible interactive controls

---

## Architecture

SyncPad is organized as a monorepo containing three main applications:

1. Next.js web client
2. Spring Boot REST API
3. Hocuspocus collaboration service

PostgreSQL stores durable application data and collaborative document state. Redis provides infrastructure for transient state, coordination, and future horizontal scaling.

```mermaid
flowchart LR
    User[Browser]

    Web[Next.js Web Application]
    API[Spring Boot REST API]
    Collab[Hocuspocus Collaboration Server]

    Clerk[Clerk Authentication]
    Postgres[(PostgreSQL)]
    Redis[(Redis)]

    User --> Web

    Web -->|Authentication| Clerk
    Web -->|REST / HTTPS| API
    Web -->|WebSocket / Yjs| Collab

    API -->|Verify identity| Clerk
    Collab -->|Verify identity| Clerk

    API -->|Documents, permissions, comments| Postgres
    Collab -->|Yjs document state| Postgres

    API --> Redis
    Collab --> Redis

    Collab -. Comment-change events .-> Web
    Web -->|Fetch authoritative comment data| API
```

### Component responsibilities

#### Next.js web application

The frontend is responsible for:

- Rendering the landing page
- Authentication UI
- Dashboard UI
- Document editor UI
- Connecting Tiptap to Yjs
- Connecting to the collaboration WebSocket
- Displaying presence information
- Displaying synchronization state
- Managing comment interactions
- Enforcing permission-aware UI behavior
- Handling loading, error, and revoked-access states

#### Spring Boot API

The backend API is responsible for:

- Validating authenticated requests
- Document CRUD operations
- Document metadata
- Sharing and permission management
- Comment thread persistence
- Comment replies
- Resolve and reopen operations
- Authorization checks
- Database migrations through Flyway
- Returning authoritative application state

#### Hocuspocus collaboration service

The collaboration service is responsible for:

- WebSocket connections
- Yjs document synchronization
- Collaborative document persistence
- Presence and awareness state
- Collaboration authorization
- Rejecting unauthorized document connections
- Broadcasting lightweight comment-change events
- Responding to permission changes

#### PostgreSQL

PostgreSQL stores durable data such as:

- Documents
- Document ownership
- Sharing permissions
- Invitations or access relationships
- Collaborative Yjs document state
- Comment threads
- Replies
- Resolved status
- Migration history

#### Redis

Redis supports transient application infrastructure and prepares the system for multi-instance coordination and production scaling.

---

## How collaborative editing works

When a user opens a document:

1. The Next.js application retrieves the user’s Clerk session.
2. The application requests document metadata and permissions from the Spring Boot API.
3. The editor creates a Yjs document.
4. The client connects to the Hocuspocus server over WebSockets.
5. The collaboration server validates the user and checks document access.
6. The server loads the persisted Yjs document state.
7. Local and remote changes are synchronized through Yjs.
8. Hocuspocus periodically persists the updated collaborative state.
9. Presence information is shared through Yjs awareness.
10. The frontend displays connection and synchronization status.

Yjs handles concurrent edits using a conflict-free replicated data type, allowing changes from multiple users to merge consistently.

---

## How comments work

Comments use a hybrid architecture.

The editor document stores only the UUID of each comment thread inside its Tiptap marks. The complete thread data is stored in PostgreSQL.

This separates collaborative text state from application metadata.

When a comment changes:

1. A user creates, replies to, resolves, or reopens a thread.
2. The frontend sends the operation to the Spring Boot API.
3. The API validates the user’s permission.
4. The API updates PostgreSQL.
5. A lightweight event is broadcast through the collaboration connection.
6. Other connected clients receive the event.
7. Those clients fetch the latest comment data from the API.

This design ensures that:

- PostgreSQL remains authoritative
- Comment metadata does not need to be embedded inside the Yjs document
- Clients receive updates in real time
- The collaboration server does not become a second comment database

---

## Permission model

Access is checked at multiple layers.

### Frontend

The frontend adjusts the interface based on the current role.

For example:

- Viewers receive a read-only editor
- Editors cannot manage ownership
- Only authorized users see destructive actions

Frontend checks improve usability but are not considered sufficient for security.

### REST API

The Spring Boot API validates permissions before every protected operation.

A user cannot bypass restrictions by manually sending an API request.

### Collaboration server

The Hocuspocus server independently checks whether the user may connect to or edit a document.

This prevents unauthorized users from connecting directly to the WebSocket server and sending collaborative updates.

### Permission revocation

Permission changes are propagated to active clients.

If access is revoked while a document is open, the application prevents the user from continuing to interact with the document under stale permissions.

---

## Technology stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Tiptap
- Yjs
- Clerk
- Vitest
- React Testing Library
- Playwright

### Backend

- Java 21
- Spring Boot
- Spring Security
- Spring Data
- Maven
- Flyway
- PostgreSQL
- Testcontainers

### Collaboration service

- Node.js
- TypeScript
- Hocuspocus
- Yjs
- WebSockets
- Vitest

### Infrastructure

- PostgreSQL
- Redis
- Docker
- Docker Compose
- GitHub Actions

---

## Repository structure

```text
syncpad/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── tests/
│       ├── package.json
│       └── package-lock.json
│
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   └── test/
│   │   ├── mvnw
│   │   └── pom.xml
│   │
│   └── collab/
│       ├── src/
│       ├── tests/
│       ├── package.json
│       └── package-lock.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

The exact internal folders may evolve as the project grows.

---

## Local development

### Prerequisites

Install the following tools:

- Node.js 22 or later
- npm
- Java 21
- Docker
- Docker Compose
- Git

The project includes a Maven wrapper, so a global Maven installation should not be required.

### Clone the repository

```bash
git clone https://github.com/andygonzalezhp/syncpad.git
cd syncpad
```

### Start PostgreSQL and Redis

From the repository root:

```bash
docker compose up -d
```

Check that the containers are running:

```bash
docker compose ps
```

To stop the infrastructure:

```bash
docker compose down
```

To remove containers and local volumes:

```bash
docker compose down -v
```

Be careful: removing volumes deletes locally persisted database data.

---

## Environment variables

Never commit real secrets to the repository.

### Frontend

Create:

```text
apps/web/.env.local
```

Example:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234
```

Variables beginning with `NEXT_PUBLIC_` are exposed to the browser. Never store private credentials in a `NEXT_PUBLIC_` variable.

### Spring Boot API

The API requires database and Clerk configuration.

Typical local variables include:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/syncpad
SPRING_DATASOURCE_USERNAME=syncpad
SPRING_DATASOURCE_PASSWORD=syncpad

SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
```

Use the property names defined in the API’s Spring configuration as the final source of truth.

Important: Spring Boot does not automatically load a root `.env` file.

Export variables before starting the API:

```bash
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/syncpad"
export SPRING_DATASOURCE_USERNAME="syncpad"
export SPRING_DATASOURCE_PASSWORD="syncpad"
export SPRING_DATA_REDIS_HOST="localhost"
export SPRING_DATA_REDIS_PORT="6379"
export CLERK_JWKS_URL="https://your-clerk-domain/.well-known/jwks.json"
```

You can also configure these values through your IDE’s run configuration.

### Collaboration service

Create the environment file expected by the collaboration service, commonly:

```text
services/collab/.env
```

The collaboration service requires configuration for:

- Its listening port
- PostgreSQL
- Redis
- Clerk token verification
- Allowed frontend or API origins
- API communication, when applicable

A typical local configuration may resemble:

```env
PORT=1234

DATABASE_URL=postgresql://syncpad:syncpad@localhost:5432/syncpad
REDIS_URL=redis://localhost:6379

CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
API_BASE_URL=http://localhost:8080
```

Confirm the exact variable names against the collaboration service’s configuration source.

---

## Running the application

Run each application in a separate terminal.

### 1. Infrastructure

From the repository root:

```bash
docker compose up -d
```

### 2. Backend API

```bash
cd services/api
./mvnw spring-boot:run
```

The API normally runs at:

```text
http://localhost:8080
```

Flyway migrations run during application startup.

### 3. Collaboration service

```bash
cd services/collab
npm ci
npm run dev
```

The collaboration server normally runs at:

```text
ws://localhost:1234
```

### 4. Frontend

```bash
cd apps/web
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Local service ports

| Service | Default local address |
|---|---|
| Next.js frontend | `http://localhost:3000` |
| Spring Boot API | `http://localhost:8080` |
| Hocuspocus server | `ws://localhost:1234` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

These values may be overridden through environment variables.

---

## Testing

### Frontend checks

```bash
cd apps/web
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run build
```

### Frontend end-to-end tests

Install the Playwright browser if needed:

```bash
cd apps/web
npx playwright install
```

Run the tests:

```bash
npx playwright test
```

### Collaboration-service tests

```bash
cd services/collab
npm ci
npm run test:run
npm run build
```

### Backend tests

The backend test suite uses Spring Boot testing tools and Testcontainers.

Make sure Docker is running, then execute:

```bash
cd services/api
./mvnw --batch-mode --no-transfer-progress test
```

Backend coverage includes areas such as:

- Document controllers
- Document services
- Permission behavior
- Comment operations
- Flyway migrations
- PostgreSQL integration

---

## Continuous integration

GitHub Actions runs the project’s CI workflow on:

- Pushes
- Pull requests
- Manual workflow dispatches

The workflow contains four jobs.

### Repository hygiene

Checks for:

- Git whitespace errors
- Accidentally committed generated artifacts
- Tracked `node_modules`
- Tracked build output
- Tracked coverage output
- Tracked Java targets
- Tracked TypeScript build metadata

### Frontend

Runs:

- Dependency installation
- Type checking
- Linting
- Unit and component tests
- Production build
- Git working-tree verification

### Collaboration service

Runs:

- Dependency installation
- Unit tests
- Production build
- Git working-tree verification

### Backend

Runs:

- Java setup
- Maven tests
- Flyway validation
- Testcontainers integration tests
- Git working-tree verification

The CI configuration is located at:

```text
.github/workflows/ci.yml
```

---

## Database migrations

The API uses Flyway to manage the PostgreSQL schema.

Migration files are stored under the backend’s resources directory, typically:

```text
services/api/src/main/resources/db/migration
```

Each schema change should be introduced through a new migration.

Do not edit a migration that has already been applied to a shared or production database. Create a new migration instead.

The migration history includes support for:

- Documents
- Permissions
- Collaborative document state
- Comments
- Permission-change notifications
- Relationships between document state and document metadata

---

## Security considerations

SyncPad follows several security principles.

### Server-side authorization

All sensitive operations are authorized on the server.

The application does not rely solely on disabled buttons or hidden UI controls.

### Independent WebSocket authorization

The collaboration service verifies access independently from the REST API.

Possessing a document identifier is not sufficient to join a collaboration session.

### Secret management

Secrets must be supplied through environment variables or an external secret manager.

Never commit:

- Clerk secret keys
- Database passwords
- Private signing keys
- Production tokens
- Cloud credentials

### Public environment variables

Only variables intentionally intended for browser use should begin with:

```text
NEXT_PUBLIC_
```

### Dependency management

Dependency audits and upgrades should be reviewed carefully.

Avoid blindly running:

```bash
npm audit fix --force
```

Forced upgrades may introduce breaking dependency changes. Review security advisories and upgrade affected packages intentionally.

### CI permissions

The GitHub Actions workflow uses read-only repository permissions unless broader access is explicitly required.

---

## Troubleshooting

### The API fails because `CLERK_JWKS_URL` is unresolved

Spring Boot does not automatically read a root `.env` file.

Export the variable in the shell or add it to your IDE’s run configuration:

```bash
export CLERK_JWKS_URL="https://your-clerk-domain/.well-known/jwks.json"
```

Then restart the API.

### The frontend cannot reach the API

Confirm:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Also verify that:

- The API is running
- CORS allows the frontend origin
- The browser is not blocking mixed HTTP and HTTPS content
- The Clerk token is being attached correctly

### The editor cannot connect to collaboration

Confirm:

```env
NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234
```

Then verify:

- The Hocuspocus server is running
- The document exists
- The user has access
- The authentication token is valid
- The frontend and collaboration service agree on the document identifier
- The WebSocket URL uses `wss://` in an HTTPS production environment

### Database connection failures

Check the infrastructure:

```bash
docker compose ps
docker compose logs postgres
```

Verify the configured database name, username, password, port, and JDBC URL.

### Flyway migration failure

Inspect the backend logs and confirm that:

- Migration versions are unique
- Previously applied migration files were not modified
- PostgreSQL is reachable
- The schema is in the expected state

For disposable local data, the environment can be reset with:

```bash
docker compose down -v
docker compose up -d
```

Do not use this approach against production data.

### CI reports modified tracked files

Some build or test command generated a change to a tracked file.

Inspect it locally:

```bash
git status
git diff
```

Generated build artifacts should normally be ignored rather than committed.

---

## Development principles

### PostgreSQL is authoritative

Persistent document metadata, permissions, comments, and replies come from PostgreSQL.

### Yjs owns collaborative text state

Collaborative text mutations flow through the Yjs document rather than through conventional REST update requests.

### Hocuspocus transports real-time events

The collaboration service handles document synchronization, presence, and lightweight real-time notifications.

### The API owns business rules

Sharing, permissions, comments, document lifecycle operations, and authorization decisions belong in the Spring Boot API.

### Authorization is enforced at boundaries

Every externally reachable service validates the user and their permission rather than trusting another client-side or service-side check.

---

## Roadmap

### Core application

- [x] Clerk authentication
- [x] Public landing page
- [x] User dashboard
- [x] Document creation
- [x] Document rename and deletion
- [x] Real-time collaborative editing
- [x] Rich-text editor
- [x] PostgreSQL persistence
- [x] Owner, editor, and viewer roles
- [x] Document sharing
- [x] Server-side authorization
- [x] Presence indicators
- [x] Synchronization indicators
- [x] Responsive interface
- [x] Permission-revocation handling

### Comments

- [x] Inline comment threads
- [x] Persistent comment metadata
- [x] Replies
- [x] Resolve threads
- [x] Reopen threads
- [x] Resolved-thread filtering
- [x] Real-time comment synchronization
- [x] Responsive comments drawer

### Testing and quality

- [x] Frontend unit and component tests
- [x] Collaboration-service tests
- [x] Backend service tests
- [x] Backend controller tests
- [x] Testcontainers integration tests
- [x] Flyway migration tests
- [x] Playwright smoke testing
- [x] GitHub Actions CI
- [ ] Expanded multi-user end-to-end tests
- [ ] Broader accessibility automation
- [ ] Load testing for collaborative sessions
- [ ] Permission-focused security testing

### Production readiness

- [ ] Complete dependency remediation
- [ ] Production frontend image
- [ ] Production API image
- [ ] Production collaboration-server image
- [ ] Production Docker Compose configuration
- [ ] Reverse proxy configuration
- [ ] HTTPS and secure WebSockets
- [ ] Health and readiness checks
- [ ] Structured application logging
- [ ] Metrics and dashboards
- [ ] Error monitoring
- [ ] Automated database backups
- [ ] Public deployment

### Future features

- [ ] Document search
- [ ] Document folders
- [ ] Version history
- [ ] Activity history
- [ ] User mentions
- [ ] Notifications
- [ ] Export to Markdown
- [ ] Export to PDF
- [ ] Improved offline behavior
- [ ] AI-generated document summaries
- [ ] AI-assisted rewriting
- [ ] Semantic document search
- [ ] Retrieval-augmented document assistance

---

## Deployment plan

The planned deployment architecture is:

### Frontend

Deploy the Next.js application to Vercel.

### Application server

Deploy the following services to a Linux virtual machine:

- Spring Boot API
- Hocuspocus collaboration service
- PostgreSQL
- Redis
- Reverse proxy

### Reverse proxy

Use Caddy or Nginx to provide:

- HTTPS termination
- API routing
- WebSocket routing
- Secure `wss://` connections
- Domain-based service routing

A possible production layout is:

```text
https://syncpad.example.com
    └── Next.js frontend

https://api.syncpad.example.com
    └── Spring Boot API

wss://collab.syncpad.example.com
    └── Hocuspocus collaboration server
```

Production deployment is not yet complete.

---

## Screenshots

Add screenshots after deployment or final UI polish.

Suggested screenshots:

1. Landing page
2. Dashboard
3. Collaborative editor with multiple users
4. Sharing dialog
5. Viewer read-only mode
6. Comment thread with replies
7. Responsive mobile comments drawer

Example:

```markdown
![SyncPad dashboard](docs/images/dashboard.png)
![SyncPad collaborative editor](docs/images/editor.png)
```

---

## Contributing

SyncPad is currently developed as a personal project, but issue reports and constructive feedback are welcome.

For substantial changes:

1. Fork the repository.
2. Create a feature branch.
3. Add or update tests.
4. Run all relevant checks locally.
5. Open a pull request with a clear explanation of the change.

```bash
git checkout -b feature/example-feature
```

Before opening a pull request, run:

```bash
cd apps/web
npm run typecheck
npm run lint
npm run test:run
npm run build
```

```bash
cd services/collab
npm run test:run
npm run build
```

```bash
cd services/api
./mvnw test
```

---

## Acknowledgements

SyncPad is built with open-source technologies including:

- Next.js
- React
- Tiptap
- Yjs
- Hocuspocus
- Spring Boot
- PostgreSQL
- Redis
- Clerk
- Vitest
- Playwright
- Testcontainers
- Flyway

---
