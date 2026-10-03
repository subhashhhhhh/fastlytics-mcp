import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTelemetryTools } from './tools/telemetry.js';
import { registerSessionTools } from './tools/sessions.js';
import { registerLapTools } from './tools/laps.js';
import { registerResultTools } from './tools/results.js';
import { registerScheduleTools } from './tools/schedule.js';
import { registerCircuitTools } from './tools/circuit.js';
import { registerPaceTools } from './tools/pace.js';
import { registerStintTools } from './tools/stints.js';
import { registerRaceContextTools } from './tools/race_context.js';
import { registerBiosTools } from './tools/bios.js';
import { registerWeatherTools } from './tools/weather.js';
import { registerDriverTools } from './tools/drivers.js';
import { registerAnalysisTools } from './tools/analysis.js';

/**
 * Read the version from the nearest package.json so it can never drift from
 * the published package version. Resolves correctly both when running from the
 * repo (dist/../package.json) and when installed as a dependency
 * (node_modules/fastlytics-mcp/package.json).
 */
export function resolvePackageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Human-readable titles for each tool, plus annotations.
 *
 * Anthropic's Connectors Directory requires every tool to declare a `title`
 * and a `readOnlyHint`/`destructiveHint` annotation. All Fastlytics tools are
 * GET-only reads against the worker API (no POST/PUT/PATCH/DELETE exists in
 * this codebase), so every tool is annotated read-only.
 */
const TOOL_TITLES: Record<string, string> = {
  // Telemetry & circuit
  get_telemetry: 'Get telemetry trace',
  compare_telemetry: 'Compare two telemetry traces',
  get_circuit_info: 'Get circuit layout and corners',
  get_pace_distribution: 'Get pace distribution',
  // Sessions & drivers
  list_events: 'List season events',
  list_sessions: 'List sessions for an event',
  list_drivers: 'List drivers in a session',
  search_driver: 'Search drivers and teams',
  // Lap analysis & strategy
  get_laptimes: 'Get lap times',
  get_laptimes_gaps: 'Get lap time gaps',
  get_lap_positions: 'Get lap-by-lap positions',
  get_strategy: 'Get race strategy',
  get_stint_analysis: 'Get stint analysis',
  // Results & standings
  get_race_results: 'Get race or session results',
  get_standings: 'Get championship standings',
  get_championship_progression: 'Get championship progression',
  // Race context
  get_race_control: 'Get race control messages',
  get_incidents: 'Get incidents',
  // Team performance
  get_team_pace: 'Get team pace comparison',
  // Bios & history
  get_driver_bio: 'Get driver biography',
  get_driver_career: 'Get driver career history',
  get_driver_championship: 'Get driver championship seasons',
  get_driver_teammates: 'Get driver teammates by year',
  get_team_bio: 'Get team biography',
  get_team_championship: 'Get team championship seasons',
  get_head_to_head: 'Compare two drivers head to head',
  get_leaderboard: 'Get driver or team leaderboard',
  // Weather
  get_weather: 'Get circuit weather',
  get_weather_forecast: 'Get weather forecast',
};

/**
 * Wrap registerTool so every tool automatically gets its display title and
 * read-only annotation. Doing this in one place keeps the 29 registration
 * sites unchanged and makes it impossible for a new tool to ship unannotated.
 */
function withAnnotations(server: McpServer): McpServer {
  const original = server.registerTool.bind(server);

  server.registerTool = ((
    name: string,
    config: Record<string, unknown>,
    cb: (args: Record<string, unknown>) => unknown,
  ) =>
    original(
      name,
      {
        ...config,
        annotations: {
          title: TOOL_TITLES[name] ?? name,
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      } as never,
      cb as never,
    )) as typeof server.registerTool;

  return server;
}

export function createMcpServer(): McpServer {
  const server = withAnnotations(
    new McpServer(
    {
      name: 'fastlytics-mcp',
      version: resolvePackageVersion(),
    },
    {
      instructions:
        'The Fastlytics MCP server provides Formula 1 telemetry, circuit layouts, results, standings, and historical data. ' +
        'Standard workflow: list_events → list_sessions → list_drivers → get_telemetry / get_laptimes / get_race_results. ' +
        'For telemetry analysis: call get_circuit_info first to get corner numbers, angles, and distances. ' +
        'Then fetch get_telemetry and correlate the distance-indexed trace with circuit corners to name turns and braking zones. ' +
        'If get_circuit_info returns empty corners (rare, e.g. Miami 2026), retry with year-1 — circuit layouts rarely change year-over-year. ' +
        'For race analysis: combine get_race_results, get_laptimes, get_laptimes_gaps, get_stint_analysis, and get_race_control. ' +
        'For driver/team stats: use search_driver to find slugs, then get_driver_bio, get_driver_career, get_head_to_head, get_leaderboard. ' +
        'For team performance: use get_team_pace to compare pace across teams. ' +
        'Use get_incidents for crash/incident details. ' +
        'Use get_weather_forecast and get_weather for race weekend weather. ' +
        'Use get_driver_championship and get_team_championship for season progression. ' +
        'Use get_driver_teammates for teammate history. Use get_pace_distribution for driver consistency analysis. ' +
        'Telemetry (speed, gear, throttle, brake, rpm, drs, steering) is available for 2018+ seasons. ' +
        'Historical results, schedules, and standings cover 1950-present via Supabase. ' +
        'Compare drivers with compare_telemetry for head-to-head speed trace overlays. ' +
        'Requires a Fastlytics API key — get one from https://fastlytics.app/settings?section=api-keys.',
    },
    ),
  );

  registerTelemetryTools(server);
  registerSessionTools(server);
  registerLapTools(server);
  registerResultTools(server);
  registerScheduleTools(server);
  registerCircuitTools(server);
  registerPaceTools(server);
  registerStintTools(server);
  registerRaceContextTools(server);
  registerBiosTools(server);
  registerWeatherTools(server);
  registerDriverTools(server);
  registerAnalysisTools(server);

  return server;
}
