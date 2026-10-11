import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerStintTools(server: McpServer) {
  server.registerTool(
    'get_stint_analysis',
    {
      description:
        'Get detailed stint analysis for a session. Returns per-stint lap times, tire compounds, pit windows, ' +
        'and stint lengths. Useful for comparing tire strategies between drivers.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (usually "R" for Race)'),
      }),
    },
    async ({ year, event, session }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const { data, error } = await callWorkerApi('/api/stint-analysis', {
        year: String(year),
        event,
        session: sessionUpper,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No stint analysis for ${event} ${sessionUpper} in ${year}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_laptimes_gaps',
    {
      description:
        'Get lap time gaps between drivers in a session. Returns per-lap gap to leader (or reference driver) for each driver. ' +
        'Useful for analyzing how gaps evolved through the race.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R")'),
        drivers: z.array(z.string().min(3).max(3)).describe('Array of 3-letter driver codes'),
      }),
    },
    async ({ year, event, session, drivers }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const driverCodes = [...drivers].map(d => d.toUpperCase()).sort();
      const sortedDrivers = driverCodes.join('_');

      // The backend reads drivers as a repeated parameter; the worker builds the same
      // HAM_VER cache key from the repeated values. Sending "HAM_VER" as one value hit
      // the cache but, on a miss, asked the backend for a single driver named HAM_VER.
      const { data, error } = await callWorkerApi('/api/laptimes/gaps', {
        year: String(year),
        event,
        session: sessionUpper,
        drivers: driverCodes,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No gap data for ${sortedDrivers} at ${event} ${sessionUpper}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
