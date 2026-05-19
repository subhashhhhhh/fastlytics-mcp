import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { listR2Objects, getR2Json, r2PrefixExists } from '../lib/r2.js';
import { fetchFromBackend } from '../lib/backend.js';
import { normalizeCacheSlug, normalizeSessionParam } from '../lib/cache-keys.js';

const TELEMETRY_TYPES = ['speed', 'gear', 'throttle', 'brake', 'rpm', 'drs', 'steering'] as const;
type TelemetryType = (typeof TELEMETRY_TYPES)[number];

const TELEMETRY_DESCRIPTIONS: Record<TelemetryType, string> = {
  speed: 'Speed trace (km/h) along the track. Returns { trace: [{Distance, Speed}] }.',
  gear: 'Gear trace and map. Returns { trace: [{Distance, nGear, X, Y}] }.',
  throttle: 'Throttle application (0-100%). Returns { trace: [{Distance, Throttle}] }.',
  brake: 'Brake application (boolean or 0-100%). Returns { trace: [{Distance, Brake}] }.',
  rpm: 'Engine RPM trace. Returns { trace: [{Distance, RPM}] }.',
  drs: 'DRS activation trace (0-14). Returns { trace: [{Distance, DRS}] }.',
  steering: 'Steering angle trace (-180 to 180). Returns { trace: [{Distance, nSteering}] }.',
};

function buildTelemetryKey(
  year: number,
  event: string,
  session: string,
  driver: string,
  lap: string,
  type: TelemetryType,
): string {
  const eventSlug = normalizeCacheSlug(event);
  const sessionUpper = normalizeSessionParam(session).toUpperCase();
  const driverUpper = driver.toUpperCase();
  const suffix = type === 'gear' ? 'gear_map' : type;
  return `cache/${year}/telemetry/${eventSlug}_${sessionUpper}_${driverUpper}_${lap}_${suffix}.json.gz`;
}

async function fetchTelemetry(
  year: number,
  event: string,
  session: string,
  driver: string,
  lap: string,
  type: TelemetryType,
): Promise<unknown | null> {
  const key = buildTelemetryKey(year, event, session, driver, lap, type);
  const data = await getR2Json(key);
  if (data) return data;

  const typePath =
    type === 'gear'
      ? 'gear-map'
      : type === 'steering'
        ? 'steering'
        : type;
  const backendData = await fetchFromBackend(`/api/telemetry/${typePath}`, {
    year: String(year),
    event,
    session: normalizeSessionParam(session),
    driver: driver.toUpperCase(),
    lap,
  });
  return backendData;
}

export function registerTelemetryTools(server: McpServer) {
  server.registerTool(
    'list_telemetry_years',
    {
      description: 'List years that have telemetry data available in R2 storage. Returns an array of year numbers.',
    },
    async () => {
      const prefixes = await listR2Objects('cache/', 1000);
      const years = new Set<number>();
      for (const obj of prefixes) {
        const match = obj.key.match(/^cache\/(\d{4})\//);
        if (match) {
          years.add(parseInt(match[1], 10));
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify([...years].sort(), null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_telemetry',
    {
      description:
        'Get telemetry trace data for a specific driver, session, and lap. Returns a trace (distance-indexed arrays of speed, throttle, brake, etc.). ' +
        'Valid types: speed, gear, throttle, brake, rpm, drs, steering. ' +
        'The lap parameter can be a lap number or "fastest" for the driver\'s fastest lap.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name (e.g. "Bahrain Grand Prix") or "round_N"'),
        session: z.string().describe('Session type (e.g. "R", "Q", "FP2", "Race", "Qualifying")'),
        driver: z.string().min(3).max(3).describe('3-letter driver code (e.g. VER, HAM, LEC)'),
        lap: z.string().default('fastest').describe('Lap number or "fastest"'),
        type: z.enum(TELEMETRY_TYPES).describe('Telemetry channel to retrieve'),
      }),
    },
    async ({ year, event, session, driver, lap, type }) => {
      const data = await fetchTelemetry(year, event, session, driver, lap, type as TelemetryType);
      if (!data) {
        return {
          content: [{ type: 'text', text: `No ${type} telemetry found for ${driver} at ${event} ${session}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'list_available_telemetry',
    {
      description:
        'List available telemetry files for a given year/event/session combination. ' +
        'Shows what driver+lap+type combinations are cached. Use this before get_telemetry to discover what data exists.',
      inputSchema: z.object({
        year: z.number().int().min(2018).describe('Season year'),
        event: z.string().describe('Event name or "round_N"'),
        session: z.string().describe('Session type (e.g. "R", "Q", "FP2")'),
      }),
    },
    async ({ year, event, session }) => {
      const eventSlug = normalizeCacheSlug(event);
      const sessionUpper = normalizeSessionParam(session).toUpperCase();
      const prefix = `cache/${year}/telemetry/${eventSlug}_${sessionUpper}_`;
      const objects = await listR2Objects(prefix, 1000);
      const files = objects.map((o) => o.key.replace(prefix, ''));

      if (files.length === 0) {
        return {
          content: [{ type: 'text', text: `No telemetry files found for ${event} ${session} in ${year}` }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
      };
    },
  );
}
