import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createMcpServer } from '../server.js';
import { HTTP_PORT } from '../lib/config.js';

export async function startHttp() {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(HTTP_PORT, () => {
    console.error(`Fastlytics MCP server running on http://localhost:${HTTP_PORT}/mcp`);
  });
}
