// Backend-for-Frontend (BFF) for the address-book UI.
//
// Responsibilities:
//   1. Serve the Vite-built React SPA as static files.
//   2. Proxy /api/* requests to the upstream Spring Boot service via cluster
//      DNS. The browser never talks to the upstream directly, so the upstream
//      can stay cluster-internal (no public Ingress needed).
//   3. Provide a separate /healthz endpoint for liveness/readiness probes,
//      distinct from the upstream /health (which is proxied at /api/.../health
//      or via /health if the API exposes it there).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const API_UPSTREAM =
  process.env.API_UPSTREAM ??
  'http://address-book.address-book.svc.cluster.local';

app.use(express.json({ limit: '1mb' }));

// BFF self-health — NOT the upstream's health. Kube probes hit this.
app.get('/healthz', (_req, res) => {
  res.json({ status: 'UP', upstream: API_UPSTREAM });
});

// Proxy /api/* to the upstream address-book service.
// We intentionally use a small hand-rolled proxy instead of http-proxy-middleware
// to keep the dependency tree tiny and make the logic easy to read.
app.use('/api', async (req, res) => {
  const upstreamUrl = `${API_UPSTREAM}/api${req.url}`;
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: { 'content-type': 'application/json' },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    const contentType = upstreamRes.headers.get('content-type') ?? 'application/json';
    const bodyText = await upstreamRes.text();
    res.status(upstreamRes.status).type(contentType).send(bodyText);
  } catch (err) {
    console.error('BFF proxy error:', err);
    res.status(502).json({
      error: 'Upstream service unavailable',
      upstream: API_UPSTREAM,
      detail: String(err),
    });
  }
});

// Serve the Vite-built static client from ../dist.
// In dev you wouldn't run this server's static middleware — Vite handles it.
const clientDir = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDir));

// SPA fallback: anything not matched above returns index.html so client-side
// routing (if added later) works.
app.use((_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[bff] listening on :${PORT}`);
  console.log(`[bff] proxying /api -> ${API_UPSTREAM}`);
  console.log(`[bff] serving static from ${clientDir}`);
});
