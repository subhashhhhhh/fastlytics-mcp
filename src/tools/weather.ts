import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { callWorkerApi } from '../lib/api-client.js';

export function registerWeatherTools(server: McpServer) {
  server.registerTool(
    'get_weather_forecast',
    {
      description:
        'Get weather forecast for a race weekend location. Returns temperature, precipitation, wind, and humidity forecasts ' +
        'for the event date range. Useful for predicting how weather might affect race strategy.',
      inputSchema: z.object({
        latitude: z.string().describe('Latitude of the circuit location'),
        longitude: z.string().describe('Longitude of the circuit location'),
        start_date: z.string().describe('Start date (YYYY-MM-DD)'),
        end_date: z.string().describe('End date (YYYY-MM-DD)'),
      }),
    },
    async ({ latitude, longitude, start_date, end_date }) => {
      const { data, error } = await callWorkerApi('/api/weather/forecast', {
        latitude,
        longitude,
        start_date,
        end_date,
      });

      if (error || !data) {
        return { content: [{ type: 'text', text: `Weather forecast unavailable: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'get_weather',
    {
      description:
        'Get weather data for a specific location. Returns current conditions or historical weather for a circuit area.',
      inputSchema: z.object({
        location: z.string().describe('Circuit location name (e.g. "Miami Gardens", "Melbourne")'),
      }),
    },
    async ({ location }) => {
      const { data, error } = await callWorkerApi(`/api/weather/${encodeURIComponent(location)}`);

      if (error || !data) {
        return { content: [{ type: 'text', text: `Weather data unavailable for ${location}: ${error}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );
}
