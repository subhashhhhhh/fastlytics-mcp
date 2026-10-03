import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';

const LEADERBOARD_STATS = [
  'wins', 'points', 'podiums', 'poles', 'championships',
  'win-streaks', 'podium-streaks', 'win-percentage', 'entries', 'dnfs',
  'fastest-laps', 'average-finish', 'seasons',
] as const;

const TEAM_LEADERBOARD_STATS = [
  'wins', 'championships', 'podiums', 'poles', 'points', 'entries',
  'seasons', 'win-percentage', 'podium-percentage', 'average-finish',
  'one-two-finishes', 'dnfs', 'fastest-laps', 'drivers-fielded',
  'win-streaks', 'podium-streaks', 'points-streaks', 'points-per-race',
] as const;

export function registerBiosTools(server: McpServer) {
  server.registerTool(
    'search_driver',
    {
      description:
        'Search for drivers and teams by name or code. Returns matching results with IDs, names, codes, and nationalities. ' +
        'Use this to find driver/team slugs for other tools like get_driver_bio or get_head_to_head.',
      inputSchema: z.object({
        query: z.string().describe('Search query (partial name or 3-letter code)'),
      }),
    },
    async ({ query }) => {
      const { data, error } = await callWorkerApi('/api/search', { q: query });

      if (error || !data) {
        return { content: [{ type: 'text', text: `No results for "${query}": ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_driver_bio',
    {
      description:
        'Get detailed Wikipedia biography for a driver. Returns career overview, early life, racing history, and personal info.',
      inputSchema: z.object({
        driver_slug: z.string().describe('Driver slug from search_driver (e.g. "max_verstappen")'),
      }),
    },
    async ({ driver_slug }) => {
      const { data, error } = await callWorkerApi(`/api/driver/${driver_slug}/bio`);

      if (error || !data) {
        return { content: [{ type: 'text', text: `No bio for ${driver_slug}: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_driver_career',
    {
      description:
        'Get career statistics for a driver across all seasons. Returns teams driven for, seasons active, ' +
        'total entries, wins, podiums, points, and other aggregate stats.',
      inputSchema: z.object({
        driver_slug: z.string().describe('Driver slug from search_driver (e.g. "max_verstappen")'),
      }),
    },
    async ({ driver_slug }) => {
      const { data, error } = await callWorkerApi(`/api/driver/${driver_slug}/career`);

      if (error || !data) {
        return { content: [{ type: 'text', text: `No career data for ${driver_slug}: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_team_bio',
    {
      description:
        'Get Wikipedia biography and history for an F1 team. Returns founding info, eras, notable drivers, and achievements.',
      inputSchema: z.object({
        team_slug: z.string().describe('Team slug from search_driver (e.g. "ferrari")'),
      }),
    },
    async ({ team_slug }) => {
      const { data, error } = await callWorkerApi(`/api/team/${team_slug}/bio`);

      if (error || !data) {
        return { content: [{ type: 'text', text: `No bio for ${team_slug}: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_head_to_head',
    {
      description:
        'Compare two drivers head-to-head across their shared seasons. Returns side-by-side stats: wins, podiums, ' +
        'points, qualifying head-to-head, race head-to-head, and average finishing positions.',
      inputSchema: z.object({
        driver1_slug: z.string().describe('First driver slug (e.g. "max_verstappen")'),
        driver2_slug: z.string().describe('Second driver slug (e.g. "lewis_hamilton")'),
      }),
    },
    async ({ driver1_slug, driver2_slug }) => {
      const { data, error } = await callWorkerApi('/api/bios/head-to-head', {
        driver1: driver1_slug,
        driver2: driver2_slug,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No head-to-head data for ${driver1_slug} vs ${driver2_slug}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_leaderboard',
    {
      description:
        'Get all-time leaderboards for drivers or teams. Available driver stats: ' +
        LEADERBOARD_STATS.join(', ') + '. Available team stats: ' +
        TEAM_LEADERBOARD_STATS.join(', ') + '. ' +
        'Optionally filter by minimum races/entries.',
      inputSchema: z.object({
        type: z.enum(['drivers', 'teams']).describe('Leaderboard type'),
        stat: z.string().describe('Stat to rank by (e.g. "wins", "podiums", "championships")'),
        limit: z.number().int().min(5).max(100).default(20).describe('Number of results (default 20)'),
        min_races: z.number().int().optional().describe('Minimum races/entries filter (e.g. 50)'),
      }),
    },
    async ({ type, stat, limit, min_races }) => {
      const path = `/api/bios/leaderboard/${type}/${stat}`;
      const params: Record<string, string> = { limit: String(limit) };
      if (min_races) params.min_races = String(min_races);

      const { data, error } = await callWorkerApi(path, params);

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No leaderboard data for ${type} ${stat}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
