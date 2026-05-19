import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';

export function registerScheduleTools(server: McpServer) {
  server.registerTool(
    'get_standings',
    {
      description:
        'Get driver and constructor championship standings for a season. ' +
        'Returns driver standings (position, driver, team, points, wins) and constructor standings. ' +
        'Works for all years 1950-present.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
        type: z.enum(['drivers', 'teams']).default('drivers').describe('Standings type'),
      }),
    },
    async ({ year, type }) => {
      const endpoint = type === 'teams' ? 'teams' : 'drivers';
      const { data, error } = await callWorkerApi(`/api/standings/${endpoint}`, {
        year: String(year),
      });

      if (error || !data) {
        return { content: [{ type: 'text', text: `No ${type} standings for ${year}: ${error}` }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_championship_progression',
    {
      description:
        'Get championship points progression throughout a season. Returns round-by-round points for each driver/team. ' +
        'Useful for visualizing how the championship battle evolved.',
      inputSchema: z.object({
        year: z.number().int().min(1950).max(2030).describe('Season year'),
      }),
    },
    async ({ year }) => {
      const { data, error } = await callWorkerApi('/api/standings/progression', {
        year: String(year),
      });

      if (error || !data) {
        return { content: [{ type: 'text', text: `No championship progression for ${year}: ${error}` }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
