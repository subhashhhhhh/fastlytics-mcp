import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug } from '../lib/cache-keys.js';

export function registerCircuitTools(server: McpServer) {
  server.registerTool(
    'get_circuit_info',
    {
      description:
        'Get detailed circuit layout information for a race track. Returns corner numbers, names, distances, angles, sector boundaries, track length, and lap count. ' +
        'Use this to understand the track layout, identify corner sequences, and correlate telemetry traces with specific corners.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year (used to load the correct event)'),
        event: z.string().describe('Event name (e.g. "Miami Grand Prix") or round number'),
      }),
    },
    async ({ year, event }) => {
      const { data, status, error } = await callWorkerApi('/api/circuit/info', {
        year: String(year),
        event,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `Circuit info not available for ${event} (${year}): ${error || `Status ${status}`}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
