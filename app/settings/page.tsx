'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Save, TestTube, CheckCircle, XCircle, Eye, EyeOff,
  Plus, Trash2, ChevronDown, ChevronUp, Download, Info,
  Server, Bot, Database,
} from 'lucide-react';
import type { AppSettings, MCPServer } from '@/lib/types';

const MODELS = [
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Most Capable)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)' },
];

function SectionHeader({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ApiKeyInput({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function MCPServerRow({
  server,
  onUpdate,
  onDelete,
}: {
  server: MCPServer;
  onUpdate: (s: MCPServer) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
        <input
          type="checkbox"
          checked={server.enabled}
          onChange={(e) => onUpdate({ ...server, enabled: e.target.checked })}
          className="rounded"
        />
        <input
          value={server.name}
          onChange={(e) => onUpdate({ ...server, name: e.target.value })}
          placeholder="Server name"
          className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none text-slate-800"
        />
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} className="text-rose-400 hover:text-rose-600 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description (optional)</label>
            <input
              value={server.description ?? ''}
              onChange={(e) => onUpdate({ ...server, description: e.target.value })}
              placeholder="What does this server do?"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Command</label>
            <input
              value={server.command}
              onChange={(e) => onUpdate({ ...server, command: e.target.value })}
              placeholder="e.g., npx or /usr/local/bin/server"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Arguments (one per line)</label>
            <textarea
              value={server.args.join('\n')}
              onChange={(e) => onUpdate({ ...server, args: e.target.value.split('\n').filter(Boolean) })}
              rows={3}
              placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/path/to/data"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Environment Variables</label>
            <div className="space-y-1.5 mb-2">
              {Object.entries(server.env).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <code className="bg-slate-100 px-2 py-1 rounded flex-1 font-mono text-slate-700">{k}={v}</code>
                  <button
                    onClick={() => {
                      const { [k]: _removed, ...rest } = server.env;
                      onUpdate({ ...server, env: rest });
                    }}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value)}
                placeholder="KEY"
                className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none"
              />
              <input
                value={envVal}
                onChange={(e) => setEnvVal(e.target.value)}
                placeholder="value"
                className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none"
              />
              <button
                onClick={() => {
                  if (envKey.trim()) {
                    onUpdate({ ...server, env: { ...server.env, [envKey.trim()]: envVal } });
                    setEnvKey('');
                    setEnvVal('');
                  }
                }}
                className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch((e) => setError(String(e)));
  }, []);

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-brand-400 rounded-full thinking-dot" />)}
        </div>
      </div>
    );
  }

  const updateObsidian = (key: keyof typeof settings.obsidian, value: string) =>
    setSettings({ ...settings, obsidian: { ...settings.obsidian, [key]: value } });

  const updateClaude = (key: keyof typeof settings.claude, value: string) =>
    setSettings({ ...settings, claude: { ...settings.claude, [key]: value } });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  const handleTestObsidian = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.obsidian),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    }
    setTesting(false);
  };

  const exportMCPConfig = () => {
    const mcpConfig = {
      mcpServers: Object.fromEntries(
        settings.mcp.servers
          .filter((s) => s.enabled)
          .map((s) => [
            s.name,
            { command: s.command, args: s.args, env: Object.keys(s.env).length > 0 ? s.env : undefined },
          ])
      ),
    };
    const blob = new Blob([JSON.stringify(mcpConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude_desktop_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMCPServer = () => {
    const server: MCPServer = { id: uuidv4(), name: 'New Server', command: '', args: [], env: {}, enabled: true };
    setSettings({ ...settings, mcp: { servers: [...settings.mcp.servers, server] } });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure Obsidian, Claude AI, and MCP integrations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-sm text-rose-700">{error}</div>
      )}

      <div className="space-y-6">
        {/* Obsidian Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <SectionHeader
            icon={Database}
            title="Obsidian Local REST API"
            description="Connect to your local Obsidian vault via the Local REST API plugin"
          />

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Setup Instructions</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600">
                <li>Open Obsidian and go to Settings → Community Plugins</li>
                <li>Search for and install <strong>Local REST API</strong> by coddingtonbear</li>
                <li>Enable the plugin and copy your API key from the plugin settings</li>
                <li>The default URL is <code className="bg-blue-100 px-1 rounded">http://127.0.0.1:27123</code></li>
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">API URL</label>
              <input
                type="text"
                value={settings.obsidian.apiUrl}
                onChange={(e) => updateObsidian('apiUrl', e.target.value)}
                placeholder="http://127.0.0.1:27123"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 font-mono"
              />
            </div>

            <ApiKeyInput
              label="API Key"
              value={settings.obsidian.apiKey}
              onChange={(v) => updateObsidian('apiKey', v)}
              placeholder="Enter your Obsidian Local REST API key"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vault Folder Path</label>
              <input
                type="text"
                value={settings.obsidian.vaultPath}
                onChange={(e) => updateObsidian('vaultPath', e.target.value)}
                placeholder="Enterprise Brain"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Folder within your Obsidian vault where artifacts will be stored (e.g., &quot;Enterprise Brain&quot;)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestObsidian}
                disabled={testing || !settings.obsidian.apiKey}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <TestTube className="w-4 h-4" />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div className={`flex items-center gap-2 text-sm font-medium ${testResult.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Claude Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <SectionHeader
            icon={Bot}
            title="Claude AI"
            description="Configure your Anthropic Claude API for the AI assistant"
          />

          <div className="space-y-4">
            <ApiKeyInput
              label="Anthropic API Key"
              value={settings.claude.apiKey}
              onChange={(v) => updateClaude('apiKey', v)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-slate-400 -mt-2">
              Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">console.anthropic.com</a>
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
              <select
                value={settings.claude.model}
                onChange={(e) => updateClaude('model', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* MCP Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <SectionHeader
            icon={Server}
            title="MCP Servers"
            description="Configure Model Context Protocol servers for extended capabilities"
          />

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex gap-3">
            <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">About MCP</p>
              <p className="text-amber-600">
                MCP (Model Context Protocol) servers extend Claude&apos;s capabilities with external tools and data sources.
                Configure servers here and export the config for use with Claude Desktop or other MCP-compatible clients.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {settings.mcp.servers.map((server) => (
              <MCPServerRow
                key={server.id}
                server={server}
                onUpdate={(updated) =>
                  setSettings({
                    ...settings,
                    mcp: { servers: settings.mcp.servers.map((s) => (s.id === updated.id ? updated : s)) },
                  })
                }
                onDelete={() =>
                  setSettings({
                    ...settings,
                    mcp: { servers: settings.mcp.servers.filter((s) => s.id !== server.id) },
                  })
                }
              />
            ))}

            {settings.mcp.servers.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">
                No MCP servers configured. Add one to extend AI capabilities.
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addMCPServer}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 text-slate-600 text-sm font-medium rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add MCP Server
            </button>

            {settings.mcp.servers.length > 0 && (
              <button
                onClick={exportMCPConfig}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export claude_desktop_config.json
              </button>
            )}
          </div>
        </div>

        {/* Save button (bottom) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
