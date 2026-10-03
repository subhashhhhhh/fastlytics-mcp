import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer, resolvePackageVersion } from '../server.js';
import { getConfig } from '../lib/config.js';

export async function startStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log the resolved version and upstream host on every start. A wrong
  // FASTLYTICS_API_URL in a client's config is the single most common cause of
  // "Network error: fetch failed", and this line makes that visible at a glance
  // instead of requiring a request-timing investigation.
  const { FASTLYTICS_API_URL } = getConfig();
  console.error(
    `Fastlytics MCP server running on stdio (v${resolvePackageVersion()} -> ${FASTLYTICS_API_URL})`,
  );

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}
