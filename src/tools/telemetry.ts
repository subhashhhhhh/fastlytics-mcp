import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

const TELEMETRY_TYPES = ['speed', 'gear', 'throttle', 'brake', 'rpm', 'drs', 'steering'] as const;
type TelemetryType = (typeof TELEMETRY_TYPES)[number];

const TYPE_PATH_MAP: Record<TelemetryType, string> = {
  speed: 'speed',
  gear: 'gear-map',
  throttle: 'throttle',
  brake: 'brake',
  rpm: 'rpm',
  drs: 'drs',
  steering: 'steering',
};

export function registerTelemetryTools(server: McpServer) {
  server.registerTool(
    'get_telemetry',
    {
      description:
        'Get telemetry trace data for a specific driver, session, and lap. ' +
        'Valid types: speed (km/h trace), gear (gear number + X/Y map), throttle (0-100%), brake, rpm, drs (0-14 activation), steering (angle). ' +
        'Lap can be a number or "fastest" for the driver\'s fastest lap. ' +
        'Data is available for all F1 seasons 2018-present, plus historical seasons via Supabase.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year (2018+)'),
        event: z.string().describe('Event name (e.g. "Bahrain Grand Prix") or round number'),
        session: z.string().describe('Session type: "R", "Q", "FP1", "FP2", "FP3", "Sprint", "SQ", or full name'),
        driver: z.string().min(3).max(3).describe('3-letter driver code (e.g. VER, HAM, LEC)'),
        lap: z.string().default('fastest').describe('Lap number or "fastest"'),
        type: z.enum(TELEMETRY_TYPES).describe('Telemetry channel'),
      }),
    },
    async ({ year, event, session, driver, lap, type }) => {
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const path = TYPE_PATH_MAP[type as TelemetryType];

      const { data, status, error } = await callWorkerApi(`/api/telemetry/${path}`, {
        year: String(year),
        event,
        session: sessionUpper,
        driver: driver.toUpperCase(),
        lap,
      });

      if (error || !data) {
        return {
          content: [{ type: 'text', text: `No ${type} telemetry for ${driver.toUpperCase()} at ${event} ${sessionUpper} in ${year}. ${error || `Status ${status}`}` }],
          isError: true,
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'compare_telemetry',
    {
      description:
        'Compare telemetry between two drivers on their respective laps. Returns a comparison trace with both drivers overlaid. ' +
        'Useful for analyzing driving styles, cornering differences, and performance gaps.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name or round number'),
        session: z.string().describe('Session type'),
        driver1: z.string().min(3).max(3).describe('First driver code'),
        lap1: z.string().default('fastest').describe('Lap for driver 1'),
        driver2: z.string().min(3).max(3).describe('Second driver code'),
        lap2: z.string().default('fastest').describe('Lap for driver 2'),
      }),
    },
    async ({ year, event, session, driver1, lap1, driver2, lap2 }) => {
      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();

      const [speed1, speed2] = await Promise.all([
        callWorkerApi(`/api/telemetry/speed`, { year: String(year), event, session: sessionUpper, driver: driver1.toUpperCase(), lap: lap1 }),
        callWorkerApi(`/api/telemetry/speed`, { year: String(year), event, session: sessionUpper, driver: driver2.toUpperCase(), lap: lap2 }),
      ]);

      if (speed1.error || !speed1.data) {
        return { content: [{ type: 'text', text: `No speed data for ${driver1.toUpperCase()} lap ${lap1}` }], isError: true };
      }
      if (speed2.error || !speed2.data) {
        return { content: [{ type: 'text', text: `No speed data for ${driver2.toUpperCase()} lap ${lap2}` }], isError: true };
      }

      const sectorsResult = await callWorkerApi(`/api/comparison/sectors`, {
        year: String(year),
        event,
        session: sessionUpper,
        driver1: driver1.toUpperCase(),
        lap1,
        driver2: driver2.toUpperCase(),
        lap2,
      });

      const comparison = {
        driver1: { code: driver1.toUpperCase(), lap: lap1, speedTrace: speed1.data },
        driver2: { code: driver2.toUpperCase(), lap: lap2, speedTrace: speed2.data },
        sectorComparison: sectorsResult.data,
      };

      return { content: [{ type: 'text', text: JSON.stringify(comparison, null, 2) }] };
    },
  );
}
