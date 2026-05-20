import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from '../server.js';
import { getConfig } from '../lib/config.js';

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
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
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

  return process.env.FASTLYTICS_MCP_API_KEY || '';
}

async function handleMcpRequest(req: express.Request, res: express.Response) {
  setCorsHeaders(req, res);

  const apiKey = extractApiKey(req);

  if (!apiKey || !apiKey.startsWith('fl_mcp_')) {
    res.status(401).json({ error: 'Missing or invalid API key. Pass Authorization: Bearer fl_mcp_...' });
    return;
  }

  const previousKey = process.env.FASTLYTICS_MCP_API_KEY;
  process.env.FASTLYTICS_MCP_API_KEY = apiKey;

  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
      process.env.FASTLYTICS_MCP_API_KEY = previousKey;
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    process.env.FASTLYTICS_MCP_API_KEY = previousKey;
  }
}

export async function startHttp() {
  const { HTTP_PORT } = getConfig();
  const app = express();
  app.use(express.json());

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
