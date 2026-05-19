import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getSupabase } from '../lib/supabase.js';

export function registerDriverTools(server: McpServer) {
  server.registerTool(
    'search_driver',
    {
      description:
        'Search for a driver by name or code. Returns matching drivers with their IDs, names, codes, nationalities, and permanent numbers. ' +
        'Searches across all F1 drivers from 1950-present.',
      inputSchema: z.object({
        query: z.string().describe('Search query (partial name or 3-letter code)'),
        limit: z.number().int().min(1).max(50).default(10).describe('Max results'),
      }),
    },
    async ({ query, limit }) => {
      const supabase = getSupabase();
      const trimmed = query.trim().toUpperCase();

      if (trimmed.length === 3 && /^[A-Z]{3}$/.test(trimmed)) {
        const { data, error } = await supabase
          .from('f1_drivers')
          .select('id, forename, surname, abbreviation, nationality, reference')
          .eq('abbreviation', trimmed)
          .limit(limit);

        if (!error && data?.length) {
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
      }

      const { data, error } = await supabase
        .from('f1_drivers')
        .select('id, forename, surname, abbreviation, nationality, reference')
        .or(`forename.ilike.%${query}%,surname.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        return { content: [{ type: 'text', text: `Search error: ${error.message}` }], isError: true };
      }

      if (!data?.length) {
        return { content: [{ type: 'text', text: `No drivers found matching "${query}"` }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_driver_info',
    {
      description:
        'Get detailed information about a driver including their seasons active, teams driven for, and career stats. ' +
        'Provide either a driver_id (from search_driver) or a 3-letter driver code.',
      inputSchema: z.object({
        driver_code: z.string().min(3).max(3).describe('3-letter driver code (e.g. VER, HAM, ALO)').optional(),
        driver_id: z.number().int().describe('Driver ID from Supabase').optional(),
      }).refine((data) => data.driver_code || data.driver_id, {
        message: 'Either driver_code or driver_id must be provided',
      }),
    },
    async ({ driver_code, driver_id }) => {
      const supabase = getSupabase();

      let driver: Record<string, unknown> | null = null;

      if (driver_id) {
        const { data } = await supabase
          .from('f1_drivers')
          .select('id, forename, surname, abbreviation, nationality, reference, image_url')
          .eq('id', driver_id)
          .single();
        driver = data as Record<string, unknown> | null;
      } else if (driver_code) {
        const { data } = await supabase
          .from('f1_drivers')
          .select('id, forename, surname, abbreviation, nationality, reference, image_url')
          .eq('abbreviation', driver_code.toUpperCase())
          .single();
        driver = data as Record<string, unknown> | null;
      }

      if (!driver) {
        return { content: [{ type: 'text', text: `Driver not found` }], isError: true };
      }

      const { data: seasons } = await supabase
        .from('f1_team_drivers')
        .select('f1_teams(name), f1_seasons(year)')
        .eq('driver_id', driver.id);

      const teams = new Set<string>();
      const years: number[] = [];

      for (const td of (seasons as Array<Record<string, unknown>>) || []) {
        const t = td.f1_teams as Record<string, unknown>;
        const s = td.f1_seasons as Record<string, unknown>;
        if (t?.name) teams.add(t.name as string);
        if (s?.year) years.push(s.year as number);
      }

      const info = {
        ...driver,
        teams: [...teams].sort(),
        seasons: [...new Set(years)].sort(),
        totalSeasons: new Set(years).size,
      };

      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    },
  );
}
