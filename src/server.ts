import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTelemetryTools } from './tools/telemetry.js';
import { registerSessionTools } from './tools/sessions.js';
import { registerLapTools } from './tools/laps.js';
import { registerResultTools } from './tools/results.js';
import { registerScheduleTools } from './tools/schedule.js';
import { registerDriverTools } from './tools/drivers.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'fastlytics-mcp',
      version: '1.0.0',
    },
    {
      instructions:
        'The Fastlytics MCP server provides Formula 1 telemetry, results, schedule, standings, and historical data. ' +
        'Use list_events to discover events for a year. Use list_sessions to find available sessions for an event. ' +
        'Use list_drivers to see who participated. Then use get_telemetry, get_laptimes, get_race_results for detailed data. ' +
        'For historical data (1950-2017), most tools query Supabase automatically when the year is < 2018. ' +
        'Telemetry data (speed, gear, throttle, brake, rpm, drs, steering) is available for 2018+ seasons from R2 cache.',
    },
  );

  registerTelemetryTools(server);
  registerSessionTools(server);
  registerLapTools(server);
  registerResultTools(server);
  registerScheduleTools(server);
  registerDriverTools(server);

  return server;
}
