'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield, List, BookOpen, FileText, TrendingUp, Scale,
  Database, Handshake, File, AlertCircle, MessageSquare,
  PlusCircle, ArrowRight, RefreshCw,
} from 'lucide-react';
import type { Artifact, ArtifactType } from '@/lib/types';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPE_COLORS } from '@/lib/types';

const TYPE_ICONS: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  policy: Shield,
  procedure: List,
  'knowledge-article': BookOpen,
  document: FileText,
  'financial-statement': TrendingUp,
  'regulatory-communication': Scale,
  'data-store-doc': Database,
  'third-party-contract': Handshake,
  other: File,
};

function StatCard({ type, count }: { type: ArtifactType; count: number }) {
  const Icon = TYPE_ICONS[type];
  const colors = ARTIFACT_TYPE_COLORS[type];
  return (
    <Link
      href={`/artifacts?type=${type}`}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <span className="text-xs font-medium text-slate-500 leading-tight">{ARTIFACT_TYPE_LABELS[type]}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{count}</div>
      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 group-hover:text-brand-500 transition-colors">
        View all <ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

function ArtifactRow({ artifact }: { artifact: Artifact }) {
  const Icon = TYPE_ICONS[artifact.type];
  const colors = ARTIFACT_TYPE_COLORS[artifact.type];
  const encodedPath = encodeURIComponent(artifact.path);
  return (
    <Link
      href={`/artifacts/${encodedPath}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors group"
    >
      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-600">{artifact.title}</div>
        <div className="text-xs text-slate-400">{ARTIFACT_TYPE_LABELS[artifact.type]} · {artifact.status}</div>
      </div>
      <div className="text-xs text-slate-400 flex-shrink-0">
        {new Date(artifact.updatedAt).toLocaleDateString()}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      if (!settings.obsidian?.apiKey) {
        setConfigured(false);
        setLoading(false);
        return;
      }
      setConfigured(true);
      const res = await fetch('/api/artifacts');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setArtifacts(data.artifacts ?? []);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const countByType = (type: ArtifactType) => artifacts.filter((a) => a.type === type).length;
  const recentArtifacts = [...artifacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const artifactTypes: ArtifactType[] = [
    'policy', 'procedure', 'knowledge-article', 'document',
    'financial-statement', 'regulatory-communication', 'data-store-doc', 'third-party-contract',
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enterprise Vault</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and explore your enterprise artifacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/artifacts/new"
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Artifact
          </Link>
        </div>
      </div>

      {/* Not configured banner */}
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800">Setup Required</div>
              <p className="text-sm text-amber-700 mt-1">
                Configure your Obsidian Local REST API and Claude API key to get started.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 mt-2"
              >
                Go to Settings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-brand-400 rounded-full thinking-dot" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Total count */}
          {artifacts.length > 0 && (
            <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold">{artifacts.length}</div>
                  <div className="text-brand-200 text-sm mt-1">Total Artifacts in Vault</div>
                </div>
                <Link
                  href="/chat"
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask AI Assistant
                </Link>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {artifactTypes.map((type) => (
              <StatCard key={type} type={type} count={countByType(type)} />
            ))}
          </div>

          {/* Recent artifacts */}
          {recentArtifacts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Recent Artifacts</h2>
                <Link href="/artifacts" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-2">
                {recentArtifacts.map((a) => (
                  <ArtifactRow key={a.path} artifact={a} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {artifacts.length === 0 && configured && !error && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Vault is empty</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Start building your enterprise vault by creating your first artifact, or let the AI assistant help you get organized.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/artifacts/new"
                  className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create First Artifact
                </Link>
                <Link
                  href="/chat"
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Use AI Assistant
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
