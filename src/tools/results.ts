import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerResultTools(server: McpServer) {
  server.registerTool(
    'get_race_results',
    {
      description:
        'Get race or session results. Returns positions, drivers, teams, gaps, points, status, fastest laps, and grid positions. ' +
        'Works for all sessions (Race, Qualifying, Sprint, Practice) and all years 1950-present.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name or slug'),
        session: z.string().default('R').describe('Session type (default: "R" for Race, use "Q" for Qualifying)'),
      }),
    },
    async ({ year, event, session }) => {
      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();

      const { data, error } = await callWorkerApi(`/api/results/race/${year}/${eventSlug}`, {
        session: sessionUpper,
        event_slug: eventSlug,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No results for ${event} ${sessionUpper} in ${year}: ${error}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
