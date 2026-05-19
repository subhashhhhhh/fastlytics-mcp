import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerLapTools(server: McpServer) {
  server.registerTool(
    'get_laptimes',
    {
      description:
        'Get lap time comparison data for one or more drivers in a session. ' +
        'Returns `lapComparison` (per-lap times for each driver) and `driverLapDetails` (detailed per-driver info including positions). ' +
        'Works for all years 1950-present.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R", "Q")'),
        drivers: z.array(z.string().min(3).max(3)).describe('Array of 3-letter driver codes (e.g. ["VER", "HAM"])'),
      }),
    },
    async ({ year, event, session, drivers }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();

      const params: Record<string, string> = {
        year: String(year),
        event,
        session: sessionUpper,
      };
      for (const d of drivers) {
        params[`drivers`] = params[`drivers`] ? `${params[`drivers`]},${d}` : d;
      }

      const { data, error } = await callWorkerApi('/api/laptimes', params);

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No lap time data for ${drivers.join(', ')} at ${event} ${sessionUpper} in ${year}: ${error}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_lap_positions',
    {
      description:
        'Get position progression data for a session. Returns lap-by-lap track positions for all drivers. ' +
        'Useful for analyzing race progression, overtakes, and position changes.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (usually "R" for race)'),
      }),
    },
    async ({ year, event, session }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const { data, error } = await callWorkerApi('/api/lapdata/positions', {
        year: String(year),
        event,
        session: sessionUpper,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No position data for ${event} ${sessionUpper} in ${year}: ${error}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_strategy',
    {
      description:
        'Get tire strategy data for a session. Returns tire compound usage, stint lengths, and pit stop windows per driver.',
      inputSchema: z.object({
        year: z.number().int().describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (usually "R")'),
      }),
    },
    async ({ year, event, session }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const { data, error } = await callWorkerApi('/api/strategy', {
        year: String(year),
        event,
        session: sessionUpper,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No strategy data for ${event} ${sessionUpper} in ${year}: ${error}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
