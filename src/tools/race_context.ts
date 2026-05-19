import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';

export function registerRaceContextTools(server: McpServer) {
  server.registerTool(
    'get_race_control',
    {
      description:
        'Get race control messages for a session. Returns flags (yellow, blue, etc.), Safety Car and Virtual Safety Car deployments, ' +
        'DRS enabled/disabled status, track status changes, and other official race control communications.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (e.g. "R")'),
      }),
    },
    async ({ year, event, session }) => {
      const { data, error } = await callWorkerApi('/api/openf1/race_control', {
        year: String(year),
        event,
        session: session.toUpperCase(),
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No race control data for ${event} ${session.toUpperCase()} in ${year}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_incidents',
    {
      description:
        'Get race incident data for a session. Returns incident reports including drivers involved, type of incident, ' +
        'and session time. Useful for understanding what happened during a race and who was involved.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name'),
        session: z.string().describe('Session type (usually "R")'),
      }),
    },
    async ({ year, event, session }) => {
      const { data, error } = await callWorkerApi('/api/incidents', {
        year: String(year),
        event,
        session: session.toUpperCase(),
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No incident data for ${event} ${session.toUpperCase()} in ${year}: ${error}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
