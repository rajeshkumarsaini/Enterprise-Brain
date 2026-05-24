'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Shield, List, BookOpen, FileText, TrendingUp, Scale,
  Database, Handshake, File, Search, PlusCircle, Filter,
  Clock, User, Tag,
} from 'lucide-react';
import type { Artifact, ArtifactType, ArtifactStatus } from '@/lib/types';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPE_COLORS, STATUS_COLORS } from '@/lib/types';

const TYPE_ICONS: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  policy: Shield, procedure: List, 'knowledge-article': BookOpen, document: FileText,
  'financial-statement': TrendingUp, 'regulatory-communication': Scale,
  'data-store-doc': Database, 'third-party-contract': Handshake, other: File,
};

const ALL_TYPES: ArtifactType[] = [
  'policy', 'procedure', 'knowledge-article', 'document',
  'financial-statement', 'regulatory-communication', 'data-store-doc', 'third-party-contract', 'other',
];

function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const Icon = TYPE_ICONS[artifact.type];
  const colors = ARTIFACT_TYPE_COLORS[artifact.type];
  const statusColors = STATUS_COLORS[artifact.status];
  const encodedPath = encodeURIComponent(artifact.path);

  return (
    <Link
      href={`/artifacts/${encodedPath}`}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-md transition-all group block"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors.bg} ${statusColors.text} flex-shrink-0`}>
          {artifact.status}
        </span>
      </div>
      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-2 mb-1 text-sm">
        {artifact.title}
      </h3>
      <div className={`text-xs font-medium ${colors.text} mb-2`}>{ARTIFACT_TYPE_LABELS[artifact.type]}</div>
      {artifact.content && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{artifact.content.slice(0, 120)}</p>
      )}
      <div className="flex flex-wrap gap-1 mb-3">
        {artifact.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {artifact.tags.length > 3 && (
          <span className="text-[10px] text-slate-400">+{artifact.tags.length - 3}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        {artifact.owner && (
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{artifact.owner}</span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" />
          {new Date(artifact.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

function ArtifactsPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') as ArtifactType | null;

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ArtifactType | 'all'>(initialType ?? 'all');
  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | 'all'>('all');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (q?: string, type?: ArtifactType | 'all') => {
    setLoading(!q);
    if (q) setSearching(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (type && type !== 'all') params.set('type', type);
      const res = await fetch(`/api/artifacts?${params}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setArtifacts(data.artifacts ?? []);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
    setSearching(false);
  }, []);

  useEffect(() => { load(undefined, initialType ?? 'all'); }, [load, initialType]);

  const handleSearch = useCallback(() => {
    if (query.trim()) load(query.trim(), typeFilter);
    else load(undefined, typeFilter);
  }, [query, typeFilter, load]);

  const handleTypeChange = useCallback((type: ArtifactType | 'all') => {
    setTypeFilter(type);
    load(query || undefined, type);
  }, [query, load]);

  const filtered = statusFilter === 'all'
    ? artifacts
    : artifacts.filter((a) => a.status === statusFilter);

  const statuses: (ArtifactStatus | 'all')[] = ['all', 'draft', 'review', 'approved', 'archived'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Artifacts</h1>
          <p className="text-sm text-slate-500 mt-1">{artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} in vault</p>
        </div>
        <Link
          href="/artifacts/new"
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Artifact
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search artifacts..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <button
            onClick={() => handleTypeChange('all')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              typeFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Types
          </button>
          {ALL_TYPES.map((type) => {
            const colors = ARTIFACT_TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  typeFilter === type ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ARTIFACT_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'All Statuses' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-brand-400 rounded-full thinking-dot" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No artifacts found</p>
          {query && (
            <button onClick={() => { setQuery(''); load(undefined, typeFilter); }} className="text-sm text-brand-600 mt-2">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((artifact) => (
            <ArtifactCard key={artifact.path} artifact={artifact} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArtifactsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-brand-400 rounded-full thinking-dot" />)}
        </div>
      </div>
    }>
      <ArtifactsPage />
    </Suspense>
  );
}
