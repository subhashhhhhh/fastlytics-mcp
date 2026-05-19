import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerSessionTools(server: McpServer) {
  server.registerTool(
    'list_events',
    {
      description:
        'List all events (races) for a given season. Returns round numbers, event names, country, location, dates, and format. ' +
        'Works for all years 1950-present. Uses cached data for 2018+ and Supabase for earlier seasons.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
      }),
    },
    async ({ year }) => {
      const { data, error } = await callWorkerApi<Array<Record<string, unknown>>>(`/api/schedule/${year}`);

      if (error || !data) {
        return { content: [{ type: 'text', text: `No events found for ${year}: ${error}` }], isError: true };
      }

      const events = data.map((row) => ({
        RoundNumber: row.RoundNumber,
        EventName: row.EventName,
        OfficialEventName: row.OfficialEventName,
        Country: row.Country,
        Location: row.Location,
        EventDate: row.EventDate,
        EventFormat: row.EventFormat || 'conventional',
      }));

      return { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] };
    },
  );

  server.registerTool(
    'list_sessions',
    {
      description:
        'List available sessions for a given event (e.g. Race, Qualifying, Practice sessions). ' +
        'Returns session names and type codes. Use this to discover what data is available before fetching telemetry or results.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name (e.g. "Bahrain Grand Prix") or round number'),
      }),
    },
    async ({ year, event }) => {
      const { data, error } = await callWorkerApi<Array<{ name: string; type: string }>>('/api/sessions', {
        year: String(year),
        event,
      });

      if (error || !data) {
        return { content: [{ type: 'text', text: `No sessions found for ${event} in ${year}: ${error}` }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'list_drivers',
    {
      description:
        'List drivers who participated in a specific session. Returns driver codes, names, teams, team colors, and car numbers.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R", "Q", "FP2")'),
      }),
    },
    async ({ year, event, session }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const { data, error } = await callWorkerApi<Array<Record<string, unknown>>>('/api/session/drivers', {
        year: String(year),
        event,
        session: sessionUpper,
      });

      if (error || !data) {
        return { content: [{ type: 'text', text: `No drivers found for ${event} ${sessionUpper} in ${year}: ${error}` }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
