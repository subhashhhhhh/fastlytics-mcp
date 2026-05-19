import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

export function registerPaceTools(server: McpServer) {
  server.registerTool(
    'get_team_pace',
    {
      description:
        'Get team pace comparison data for a season or specific event/session. ' +
        'Without event/session, returns season-long team pace summary. ' +
        'With event, returns event-level pace comparison. ' +
        'With event + session, returns session-level lap time distributions per team.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().optional().describe('Event name for event-level or session-level pace'),
        session: z.string().optional().describe('Session type (e.g. "R") for session-level pace'),
      }),
    },
    async ({ year, event, session }) => {
      let path: string;
      const params: Record<string, string> = { year: String(year) };

      if (event && session) {
        path = '/api/team-pace/session';
        params.event = event;
        params.session = normalizeSessionParam(session).toUpperCase();
      } else if (event) {
        path = '/api/team-pace/event';
        params.event_slug = normalizeCacheSlug(event);
      } else {
        path = '/api/team-pace/summary';
      }

      const { data, error } = await callWorkerApi(path, params);
      if (error || !data) {
        return { content: [{ type: 'text', text: `No team pace data for ${year}${event ? ' ' + event : ''}: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
