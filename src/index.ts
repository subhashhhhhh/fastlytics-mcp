#!/usr/bin/env node
import { runSetup } from './setup.js';

async function main() {
  const args = process.argv.slice(2);

  // Explicit setup command
  if (args.includes('setup') || args.includes('--setup') || args.includes('install')) {
    await runSetup();
    return;
  }

  const { getConfig } = await import('./lib/config.js');
  const { TRANSPORT } = getConfig();

  // Hosted HTTP mode accepts bearer keys per request, so only stdio/local
  // startup requires a preconfigured API key.
  if (TRANSPORT !== 'http' && !process.env.FASTLYTICS_MCP_API_KEY) {
    console.error('No FASTLYTICS_MCP_API_KEY found. Starting setup wizard...\n');
    await runSetup();
    return;
  }

  // Normal server startup
  if (TRANSPORT === 'http') {
    const { startHttp } = await import('./transports/http.js');
    await startHttp();
  } else {
    const { startStdio } = await import('./transports/stdio.js');
    await startStdio();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
