import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from '../server.js';
import { getConfig } from '../lib/config.js';
import { runWithApiKey } from '../lib/request-context.js';
import { protectedResourceMetadata, resourceMetadataUrl, verifyOAuthAccessToken } from '../lib/oauth.js';

function setCorsHeaders(req: express.Request, res: express.Response) {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  const requestUrl = req.originalUrl || req.url;
  try {
    const apiKeyParam = new URL(requestUrl, 'http://localhost').searchParams.get('api_key');
    if (apiKeyParam?.trim()) {
      return apiKeyParam.trim();
    }
  } catch {
    // Ignore malformed URLs.
  }

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

async function handleMcpRequest(req: express.Request, res: express.Response) {
  setCorsHeaders(req, res);

  ensureStreamableAccept(req);

  const apiKey = extractApiKey(req);

  if (!apiKey) {
    sendUnauthorized(res);
    return;
  }

  // fl_mcp_ keys are checked by the worker. Anything else must be a Supabase
  // OAuth access token, verified here and forwarded to the worker as-is.
  if (!apiKey.startsWith('fl_mcp_') && !(await verifyOAuthAccessToken(apiKey))) {
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

    res.once('close', () => {
      void cleanup();
    });
    req.once('aborted', () => {
      void cleanup();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to process MCP request.' });
      }
      console.error('MCP request failed:', error);
    }
  });
}

export async function startHttp() {
  const { HTTP_PORT } = getConfig();
  const app = express();
  app.use(express.json());

  const sendResourceMetadata = (req: express.Request, res: express.Response) => {
    setCorsHeaders(req, res);
    res.json(protectedResourceMetadata());
  };
  app.get('/.well-known/oauth-protected-resource/mcp', sendResourceMetadata);
  app.get('/.well-known/oauth-protected-resource', sendResourceMetadata);

  app.options('/mcp', (req, res) => {
    setCorsHeaders(req, res);
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.status(204).end();
  });

  app.get('/mcp', async (req, res) => {
    const acceptsSse = req.headers.accept?.includes('text/event-stream');
    if (!acceptsSse) {
      setCorsHeaders(req, res);
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      res.status(405).json({ error: 'GET /mcp requires Accept: text/event-stream or use POST for JSON-RPC requests.' });
      return;
    }

    await handleMcpRequest(req, res);
  });

  app.post('/mcp', async (req, res) => {
    await handleMcpRequest(req, res);
  });

  app.listen(HTTP_PORT, () => {
    console.error(`Fastlytics MCP server running on http://localhost:${HTTP_PORT}/mcp`);
  });
}
