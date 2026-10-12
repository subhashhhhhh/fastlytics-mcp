import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from '../server.js';
import { getConfig } from '../lib/config.js';
import { runWithApiKey } from '../lib/request-context.js';
import { checkApiKey } from '../lib/key-check.js';
import { reportError } from '../lib/sentry.js';
import { protectedResourceMetadata, resourceMetadataUrl, verifyOAuthAccessToken } from '../lib/oauth.js';

function setCorsHeaders(req: express.Request, res: express.Response) {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-API-Key, Api-Key, Content-Type, Accept, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, WWW-Authenticate');
}

function extractApiKey(req: express.Request): string {
  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) {
    return bearerMatch[1];
  }

  if (authHeader.startsWith('fl_mcp_')) {
    return authHeader;
  }

  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    return xApiKey.trim();
  }

  const apiKeyHeader = req.headers['api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  // No ?api_key= query parameter: a key in the URL ends up in Cloudflare, tunnel
  // and proxy access logs and in Referer headers.

  // No env fallback here: a server-wide key would answer unauthenticated
  // requests and stop OAuth clients from ever seeing the 401 that starts sign-in.
  return '';
}

/**
 * 401 that tells an OAuth client (Claude) where to discover the authorization
 * server. Claude only reads WWW-Authenticate on a 401.
 */
function sendUnauthorized(res: express.Response, error?: 'invalid_token') {
  const params = [`resource_metadata="${resourceMetadataUrl()}"`];
  if (error) params.unshift(`error="${error}"`);
  res.setHeader('WWW-Authenticate', `Bearer ${params.join(', ')}`);
  res.status(401).json({
    error: error ?? 'unauthorized',
    error_description: 'Sign in with OAuth, or pass Authorization: Bearer fl_mcp_...',
  });
}

function ensureStreamableAccept(req: express.Request) {
  const required = ['application/json', 'text/event-stream'];
  const rawAccept = req.headers.accept;
  const existing = typeof rawAccept === 'string' ? rawAccept : '';
  const missing = required.filter(r => !existing.includes(r));
  const patched = missing.length > 0 ? (existing ? existing + ', ' + missing.join(', ') : missing.join(', ')) : existing;

  if (patched) {
    req.headers.accept = patched;
  }

  const rawHeaders = req.rawHeaders;
  if (Array.isArray(rawHeaders)) {
    let found = false;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      if (rawHeaders[i].toLowerCase() === 'accept') {
        rawHeaders[i + 1] = patched || 'application/json, text/event-stream';
        found = true;
        break;
      }
    }
    if (!found) {
      rawHeaders.push('Accept', patched || 'application/json, text/event-stream');
    }
  }
}

const MAX_CONCURRENT_PER_IP = 20;
const MAX_REQUESTS_PER_MINUTE = 120;
const clients = new Map<string, { open: number; windowStart: number; count: number }>();

/**
 * Behind cloudflared every request arrives from loopback, so the visitor's address
 * is CF-Connecting-IP; that header is only trusted on loopback connections, where
 * nobody but the tunnel can set it.
 */
function clientIp(req: express.Request): string {
  const socketIp = req.socket.remoteAddress || 'unknown';
  const loopback = socketIp === '127.0.0.1' || socketIp === '::1' || socketIp === '::ffff:127.0.0.1';
  const forwarded = req.headers['cf-connecting-ip'];
  return loopback && typeof forwarded === 'string' && forwarded ? forwarded : socketIp;
}

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = clientIp(req);
  const now = Date.now();
  let entry = clients.get(ip);
  if (!entry) {
    entry = { open: 0, windowStart: now, count: 0 };
    clients.set(ip, entry);
  }
  if (now - entry.windowStart >= 60_000) {
    entry.windowStart = now;
    entry.count = 0;
  }
  if (entry.count >= MAX_REQUESTS_PER_MINUTE || entry.open >= MAX_CONCURRENT_PER_IP) {
    setCorsHeaders(req, res);
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests. Slow down and retry shortly.' });
    return;
  }
  entry.count += 1;
  entry.open += 1;
  const tracked = entry;
  res.once('close', () => {
    tracked.open -= 1;
  });
  next();
}

// Drop idle entries so the map can't grow without bound.
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, entry] of clients) {
    if (entry.open === 0 && entry.windowStart < cutoff) clients.delete(ip);
  }
}, 60_000).unref();

async function handleMcpRequest(req: express.Request, res: express.Response) {
  setCorsHeaders(req, res);

  ensureStreamableAccept(req);

  const apiKey = extractApiKey(req);

  if (!apiKey) {
    sendUnauthorized(res);
    return;
  }

  // fl_mcp_ keys are checked against the worker (cached). Anything else must be a
  // Supabase OAuth access token, verified here and forwarded to the worker as-is.
  if (apiKey.startsWith('fl_mcp_')) {
    const valid = await checkApiKey(apiKey);
    if (valid === null) {
      res.status(503).json({ error: 'Could not verify the API key right now. Try again shortly.' });
      return;
    }
    if (!valid) {
      sendUnauthorized(res, 'invalid_token');
      return;
    }
  } else if (!(await verifyOAuthAccessToken(apiKey))) {
    sendUnauthorized(res, 'invalid_token');
    return;
  }

  await runWithApiKey(apiKey, async () => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    let cleanedUp = false;

    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      await transport.close();
      await server.close();
    };

    const cleanupQuietly = () => {
      cleanup().catch(error => console.error('MCP cleanup failed:', error));
    };
    res.once('close', cleanupQuietly);
    req.once('aborted', cleanupQuietly);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to process MCP request.' });
      }
      console.error('MCP request failed:', error);
      reportError(error, { where: 'mcp-request' });
    }
  });
}

export async function startHttp() {
  const { HTTP_PORT, HOST } = getConfig();
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const sendResourceMetadata = (req: express.Request, res: express.Response) => {
    setCorsHeaders(req, res);
    res.json(protectedResourceMetadata());
  };
  app.get('/.well-known/oauth-protected-resource/mcp', sendResourceMetadata);
  app.get('/.well-known/oauth-protected-resource', sendResourceMetadata);

  app.options('/mcp', (req, res) => {
    setCorsHeaders(req, res);
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(204).end();
  });

  // Stateless server (no session ids): there is no server-to-client stream to
  // open and no session to delete, so GET and DELETE are 405 per the Streamable
  // HTTP spec. Serving GET used to open an SSE stream that never closed and kept a
  // whole McpServer alive per connection.
  const methodNotAllowed = (req: express.Request, res: express.Response) => {
    setCorsHeaders(req, res);
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'This server is stateless: send JSON-RPC requests with POST /mcp.' });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.post('/mcp', rateLimit, async (req, res) => {
    await handleMcpRequest(req, res);
  });

  // Loopback by default: cloudflared reaches the server on 127.0.0.1, and binding
  // every interface exposed plain HTTP on the VPS that skipped Cloudflare.
  app.listen(HTTP_PORT, HOST, () => {
    console.error(`Fastlytics MCP server running on http://${HOST}:${HTTP_PORT}/mcp`);
  });
}
