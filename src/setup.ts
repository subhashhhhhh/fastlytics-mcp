import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';

interface AgentConfig {
  name: string;
  id: string;
  configPath: () => string;
  format: (name: string, key: string) => unknown;
}

function getHomeConfigPath(subpath: string): string {
  if (platform() === 'darwin' || platform() === 'linux') {
    return join(homedir(), subpath);
  }
  // Windows — use APPDATA
  return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), subpath);
}

const AGENTS: AgentConfig[] = [
  {
    name: 'Claude Desktop',
    id: 'claude-desktop',
    configPath: () => {
      if (platform() === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      if (platform() === 'win32') return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
      return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
    },
    format: (name, key) => ({
      mcpServers: { [name]: { command: 'npx', args: ['-y', 'fastlytics-mcp'], env: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'Claude Code (CLI)',
    id: 'claude-code',
    configPath: () => resolve('.claude', 'mcp.json'),
    format: (name, key) => ({
      mcpServers: { [name]: { command: 'npx', args: ['-y', 'fastlytics-mcp'], env: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'Cursor',
    id: 'cursor',
    configPath: () => resolve('.cursor', 'mcp.json'),
    format: (name, key) => ({
      mcpServers: { [name]: { command: 'npx', args: ['-y', 'fastlytics-mcp'], env: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'VS Code / GitHub Copilot',
    id: 'vscode',
    configPath: () => resolve('.vscode', 'mcp.json'),
    format: (name, key) => ({
      mcpServers: { [name]: { command: 'npx', args: ['-y', 'fastlytics-mcp'], env: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'KiloCode',
    id: 'kilo',
    configPath: () => resolve('.kilo', 'kilo.json'),
    format: (name, key) => ({
      mcp: { [name]: { type: 'local', command: ['npx', '-y', 'fastlytics-mcp'], environment: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'Codex (OpenAI)',
    id: 'codex',
    configPath: () => resolve('.codex', 'config.toml'),
    format: (name, key) => {
      // TOML inline format
      return `[mcp_servers.${name}]\ncommand = "npx"\nargs = ["-y", "fastlytics-mcp"]\n[mcp_servers.${name}.env]\nFASTLYTICS_MCP_API_KEY = "${key}"\n`;
    },
  },
  {
    name: 'OpenCode',
    id: 'opencode',
    configPath: () => getHomeConfigPath('.config/opencode/opencode.jsonc'),
    format: (name, key) => ({
      mcp: { [name]: { type: 'local', command: ['npx', '-y', 'fastlytics-mcp'], enabled: true, environment: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
  {
    name: 'Windsurf',
    id: 'windsurf',
    configPath: () => resolve('.windsurf', 'mcp.json'),
    format: (name, key) => ({
      mcpServers: { [name]: { command: 'npx', args: ['-y', 'fastlytics-mcp'], env: { FASTLYTICS_MCP_API_KEY: key } } },
    }),
  },
];

function mergeConfig(existing: string, newConfig: unknown, isToml: boolean): string {
  if (isToml) {
    const newToml = newConfig as string;
    if (existing.includes('[mcp_servers')) {
      return existing.trimEnd() + '\n\n' + newToml;
    }
    return (existing.trimEnd() + '\n\n' + newToml).trim() + '\n';
  }

  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(existing);
  } catch {
    current = {};
  }

  const addition = newConfig as Record<string, unknown>;
  const merged = deepMerge(current, addition);
  return JSON.stringify(merged, null, 2) + '\n';
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && key in result && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function runSetup() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  Fastlytics MCP — Setup Wizard\n');

  // Step 1: API key
  const apiKey = await ask(rl, '  Enter your Fastlytics API key: ');
  if (!apiKey || !apiKey.startsWith('fl_mcp_')) {
    console.log('  Invalid API key. Keys start with "fl_mcp_". Get one at https://fastlytics.app/settings/api-keys\n');
    rl.close();
    process.exit(1);
  }

  // Step 2: Choose agent
  console.log('\n  Which AI agent are you using?\n');
  AGENTS.forEach((a, i) => console.log(`    ${i + 1}. ${a.name}`));
  console.log('');

  const choice = await ask(rl, '  Enter number (1-' + AGENTS.length + '): ');
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= AGENTS.length) {
    console.log('  Invalid choice.\n');
    rl.close();
    process.exit(1);
  }

  const agent = AGENTS[idx];

  // Step 3: Build config
  const newConfig = agent.format('fastlytics', apiKey);
  const isToml = agent.id === 'codex';
  const configPath = agent.configPath();

  // Step 4: Read existing config (if any)
  let finalContent: string;
  if (existsSync(configPath)) {
    const existing = readFileSync(configPath, 'utf-8');
    finalContent = mergeConfig(existing, newConfig, isToml);
    console.log(`\n  Updated existing config at ${configPath}`);
  } else {
    mkdirSync(dirname(configPath), { recursive: true });
    finalContent = isToml ? (newConfig as string).trim() + '\n' : JSON.stringify(newConfig, null, 2) + '\n';
    console.log(`\n  Created config at ${configPath}`);
  }

  writeFileSync(configPath, finalContent);
  rl.close();

  console.log('\n  Done! Restart your agent to connect to Fastlytics.\n');
  console.log('  Tip: Get more API keys or upgrade your plan at https://fastlytics.app/settings\n');
}
