import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from '../server.js';
import { getConfig } from '../lib/config.js';

export async function startHttp() {
  const { HTTP_PORT } = getConfig();
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    // Extract API key from Authorization: Bearer <key> header (remote clients),
    // falling back to FASTLYTICS_MCP_API_KEY env var (local dev).
    const authHeader = req.headers.authorization || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const apiKey = bearerMatch ? bearerMatch[1] : process.env.FASTLYTICS_MCP_API_KEY || '';

    if (!apiKey || !apiKey.startsWith('fl_mcp_')) {
      res.status(401).json({ error: 'Missing or invalid API key. Pass Authorization: Bearer fl_mcp_...' });
      return;
    }

    // Set key for this request's lifetime (api-client reads from process.env)
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
  });

  app.listen(HTTP_PORT, () => {
    console.error(`Fastlytics MCP server running on http://localhost:${HTTP_PORT}/mcp`);
  });
}
