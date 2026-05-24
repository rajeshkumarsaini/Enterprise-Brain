import fs from 'fs';
import path from 'path';
import type { AppSettings } from './types';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

export const DEFAULT_SETTINGS: AppSettings = {
  obsidian: {
    apiUrl: 'http://127.0.0.1:27123',
    apiKey: '',
    vaultPath: 'Enterprise Brain',
  },
  claude: {
    apiKey: '',
    model: 'claude-opus-4-7',
  },
  mcp: {
    servers: [],
  },
};

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      const saved = JSON.parse(raw) as Partial<AppSettings>;
      return {
        obsidian: { ...DEFAULT_SETTINGS.obsidian, ...saved.obsidian },
        claude: { ...DEFAULT_SETTINGS.claude, ...saved.claude },
        mcp: { servers: saved.mcp?.servers ?? [] },
      };
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
