import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTelemetryTools } from './tools/telemetry.js';
import { registerSessionTools } from './tools/sessions.js';
import { registerLapTools } from './tools/laps.js';
import { registerResultTools } from './tools/results.js';
import { registerScheduleTools } from './tools/schedule.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'fastlytics-mcp',
      version: '1.0.0',
    },
    {
      instructions:
        'The Fastlytics MCP server provides Formula 1 telemetry, results, standings, and historical data. ' +
        'Use list_events to discover events for a year. Use list_sessions to find available sessions for an event. ' +
        'Use list_drivers to see who participated. Then use get_telemetry, get_laptimes, get_race_results for detailed data. ' +
        'All data from 1950-present is available. Telemetry (speed, gear, throttle, brake, rpm, drs, steering) is available for 2018+ seasons. ' +
        'Requires a Fastlytics API key — get one from your account settings at https://fastlytics.app.',
    },
  );

  registerTelemetryTools(server);
  registerSessionTools(server);
  registerLapTools(server);
  registerResultTools(server);
  registerScheduleTools(server);

  return server;
}
