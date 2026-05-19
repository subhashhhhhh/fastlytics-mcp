import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerAnalysisTools(server: McpServer) {
  server.registerTool(
    'get_pace_distribution',
    {
      description:
        'Get lap time pace distribution for drivers in a session. Returns lap time histograms showing consistency, ' +
        'outliers, and pace spread. Useful for analyzing driver consistency and race pace.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R")'),
        drivers: z.array(z.string().min(3).max(3)).describe('Array of 3-letter driver codes for comparison'),
      }),
    },
    async ({ year, event, session, drivers }) => {
      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const sortedDrivers = [...drivers].sort().join('_').toUpperCase();

      const { data, error } = await callWorkerApi('/api/telemetry/pace-distribution', {
        year: String(year),
        event,
        session: sessionUpper,
        drivers: sortedDrivers,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No pace distribution for ${sortedDrivers} at ${event} ${sessionUpper}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
