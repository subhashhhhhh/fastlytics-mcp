import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerDriverTools(server: McpServer) {
  server.registerTool(
    'get_driver_championship',
    {
      description:
        'Get championship progression for a driver across a specific season. Returns round-by-round points and position changes.',
      inputSchema: z.object({
        driver_slug: z.string().describe('Driver slug from search_driver (e.g. "max_verstappen")'),
        season: z.number().int().min(1950).describe('Season year'),
      }),
    },
    async ({ driver_slug, season }) => {
      const { data, error } = await callWorkerApi(`/api/driver/${driver_slug}/championship`, {
        season: String(season),
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No championship data for ${driver_slug} in ${season}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_driver_teammates',
    {
      description:
        'Get teammate history for a driver. Returns all teammates across seasons, including shared teams, seasons together, ' +
        'and head-to-head records against each teammate.',
      inputSchema: z.object({
        driver_slug: z.string().describe('Driver slug from search_driver (e.g. "lewis_hamilton")'),
      }),
    },
    async ({ driver_slug }) => {
      const { data, error } = await callWorkerApi(`/api/driver/${driver_slug}/teammates`);

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No teammate data for ${driver_slug}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_team_championship',
    {
      description:
        'Get constructor championship progression for a team across a specific season. Returns round-by-round points.',
      inputSchema: z.object({
        team_slug: z.string().describe('Team slug from search_driver (e.g. "ferrari")'),
        season: z.number().int().min(1950).describe('Season year'),
      }),
    },
    async ({ team_slug, season }) => {
      const { data, error } = await callWorkerApi(`/api/team/${team_slug}/championship`, {
        season: String(season),
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No championship data for ${team_slug} in ${season}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
