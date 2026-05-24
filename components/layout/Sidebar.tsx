'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Settings,
  ChevronRight,
  Wifi,
  WifiOff,
  PlusCircle,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/artifacts', label: 'Artifacts', icon: FolderOpen },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const settings = await res.json();
        if (!settings.obsidian?.apiKey) { setConnected(false); return; }

        const test = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings.obsidian),
        });
        const data = await test.json();
        setConnected(data.ok === true);
      } catch {
        setConnected(false);
      }
    }
    checkConnection();
    const id = setInterval(checkConnection, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white">Enterprise Brain</div>
            <div className="text-[11px] text-slate-400">Vault Manager</div>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <Link
          href="/artifacts/new"
          className="flex items-center gap-2 w-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Artifact
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-brand-400' : ''}`} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs">
          {connected === null ? (
            <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
          ) : connected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className={connected === null ? 'text-slate-500' : connected ? 'text-emerald-400' : 'text-rose-400'}>
            {connected === null ? 'Checking...' : connected ? 'Obsidian Connected' : 'Obsidian Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
