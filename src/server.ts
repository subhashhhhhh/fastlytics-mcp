import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTelemetryTools } from './tools/telemetry.js';
import { registerSessionTools } from './tools/sessions.js';
import { registerLapTools } from './tools/laps.js';
import { registerResultTools } from './tools/results.js';
import { registerScheduleTools } from './tools/schedule.js';
import { registerCircuitTools } from './tools/circuit.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'fastlytics-mcp',
      version: '1.0.0',
    },
    {
      instructions:
        'The Fastlytics MCP server provides Formula 1 telemetry, circuit layouts, results, standings, and historical data. ' +
        'Standard workflow: list_events → list_sessions → list_drivers → get_telemetry / get_laptimes / get_race_results. ' +
        'For telemetry analysis: call get_circuit_info first to get corner numbers, angles, and distances. ' +
        'Then fetch get_telemetry and correlate the distance-indexed trace with circuit corners to name turns and braking zones. ' +
        'If get_circuit_info returns empty corners (rare, e.g. Miami 2026), retry with year-1 — circuit layouts rarely change year-over-year. ' +
        'Telemetry (speed, gear, throttle, brake, rpm, drs, steering) is available for 2018+ seasons. ' +
        'Historical results, schedules, and standings cover 1950-present via Supabase. ' +
        'Compare drivers with compare_telemetry for head-to-head speed trace overlays. ' +
        'Requires a Fastlytics API key — get one from https://fastlytics.app/settings.',
    },
  );

  registerTelemetryTools(server);
  registerSessionTools(server);
  registerLapTools(server);
  registerResultTools(server);
  registerScheduleTools(server);
  registerCircuitTools(server);

  return server;
}
