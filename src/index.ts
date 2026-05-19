import { TRANSPORT } from './lib/config.js';

async function main() {
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
