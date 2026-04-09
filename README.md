# Address Book UI

React + Vite + TypeScript frontend for the [address-book](https://github.com/jasoncalalang/address-book) API, served together with a thin Node/Express **Backend-for-Frontend (BFF)** that proxies `/api/*` requests to the upstream Spring Boot service via Kubernetes cluster DNS.

Used as a teaching artifact for [jenkins-kube-reference](https://github.com/jasoncalalang/jenkins-kube-reference).

## Architecture

```
  browser
     │
     ▼  (same origin, no CORS)
  ┌──────────────────────────────────────┐
  │ address-book-ui pod                  │
  │                                      │
  │  ┌───────────────────────────────┐   │
  │  │ Node + Express BFF            │   │
  │  │  ├── /healthz                 │   │
  │  │  ├── /api/*  ── proxy ──┐     │   │
  │  │  └── /*       → static  │     │   │
  │  └────────────────────────│─────┘   │
  │         serves dist/       │         │
  │         (vite build out)   │         │
  └────────────────────────────│─────────┘
                               │ cluster DNS, internal only
                               ▼
                     address-book.address-book.svc.cluster.local
                     (Spring Boot API)
```

**Why a BFF?**

- The browser has one origin to talk to, so no CORS headaches.
- The upstream Spring Boot service never needs to be exposed publicly — it stays inside the cluster, and only the BFF reaches it.
- The BFF is the place to aggregate/transform/auth if you need to later, without touching the frontend or the backend.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript (UI)
- [Express](https://expressjs.com/) 4 on Node.js 22 (BFF)
- Single-port deployment: the BFF serves both `/api/*` (proxied) and static assets (`dist/`)
- Multi-stage `Dockerfile` — Vite build happens inside the build stage; the runtime image only carries `dist/` + `server/` + prod deps

## Running locally

```bash
npm install

# Terminal 1: BFF on :3000
npm run dev:server

# Terminal 2: Vite dev server on :5173 (proxies /api → :3000)
npm run dev:client

# Or both at once:
npm run dev
```

Open http://localhost:5173.

By default the BFF expects the upstream at `http://address-book.address-book.svc.cluster.local`. Override for local dev:

```bash
API_UPSTREAM=http://localhost:8081 npm run dev:server
```

## Building

```bash
npm run build      # typecheck + vite build → dist/
npm start          # runs the BFF serving dist/ + /api proxy on :3000
```

Open http://localhost:3000.

## End-to-end tests

[Playwright](https://playwright.dev/) tests in `e2e/` exercise the UI against a locally-built BFF, with `/api/contacts` responses mocked at the browser level so the tests are self-contained (no real backend required).

    npm run test:e2e          # headless chromium
    npm run test:e2e:ui       # interactive Playwright UI

The test runner spins up `npm start` via `playwright.config.ts`'s webServer option and runs against `http://localhost:3000`.

## Container

```bash
docker build -t address-book-ui:local .
docker run --rm -p 3000:3000 \
  -e API_UPSTREAM=http://host.docker.internal:8081 \
  address-book-ui:local
```

## Deploying to Kubernetes

The included [`k8s/`](k8s/) manifests deploy a Namespace, Deployment, Service, and Ingress (at `address-book-ui.lan` via Traefik). [`Jenkinsfile.kube`](Jenkinsfile.kube) drives the pipeline on [jenkins-kube-reference](https://github.com/jasoncalalang/jenkins-kube-reference):

1. `checkout scm`
2. `kaniko` builds the multi-stage Dockerfile and pushes to the in-cluster registry
3. `kubectl apply -f k8s/` + `set image` + `rollout status`
4. `curl /healthz` verifies the BFF came up

## License

MIT — see [LICENSE](LICENSE).
