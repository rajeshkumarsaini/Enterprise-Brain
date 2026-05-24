'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft, Edit2, Save, X, Trash2, Tag, User,
  Clock, GitBranch, ArrowUpRight, Plus,
} from 'lucide-react';
import type { Artifact, ArtifactType, ArtifactStatus, RelationshipType } from '@/lib/types';
import {
  ARTIFACT_TYPE_LABELS, ARTIFACT_TYPE_COLORS, STATUS_COLORS, RELATIONSHIP_TYPE_LABELS,
} from '@/lib/types';

export default function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const filePath = decodeURIComponent(id);

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<ArtifactStatus>('draft');
  const [editOwner, setEditOwner] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/artifacts/${encodeURIComponent(filePath)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Not found');
        setArtifact(data.artifact);
      } catch (e) {
        setError(String(e));
      }
      setLoading(false);
    }
    load();
  }, [filePath]);

  const startEdit = () => {
    if (!artifact) return;
    setEditTitle(artifact.title);
    setEditContent(artifact.content);
    setEditStatus(artifact.status);
    setEditOwner(artifact.owner ?? '');
    setEditVersion(artifact.version);
    setEditTags([...artifact.tags]);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!artifact) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/artifacts/${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          status: editStatus,
          owner: editOwner || undefined,
          version: editVersion,
          tags: editTags,
          relationships: artifact.relationships,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArtifact(data.artifact);
      setEditing(false);
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/artifacts/${encodeURIComponent(filePath)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/artifacts');
    } catch (e) {
      setError(String(e));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-1.5">{[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 bg-brand-400 rounded-full thinking-dot" />
        ))}</div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-rose-600 mb-4">{error || 'Artifact not found'}</p>
        <Link href="/artifacts" className="text-brand-600 hover:text-brand-700 text-sm">← Back to Artifacts</Link>
      </div>
    );
  }

  const colors = ARTIFACT_TYPE_COLORS[artifact.type as ArtifactType];
  const statusColors = STATUS_COLORS[artifact.status];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/artifacts" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-xl font-bold w-full border-b-2 border-brand-400 bg-transparent focus:outline-none pb-1"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 truncate">{artifact.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {ARTIFACT_TYPE_LABELS[artifact.type as ArtifactType]}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors.bg} ${statusColors.text} capitalize`}>
              {artifact.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">Delete Artifact?</h3>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete &quot;{artifact.title}&quot; from Obsidian. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {editing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={30}
                className="w-full p-6 text-sm font-mono focus:outline-none resize-y border-0"
              />
            ) : (
              <div className="p-6 prose prose-slate prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Details</h3>

            {editing ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ArtifactStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Owner</label>
                  <input
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    placeholder="Team or person"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Version</label>
                  <input
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </>
            ) : (
              <>
                {artifact.owner && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{artifact.owner}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <GitBranch className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>v{artifact.version}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Updated {new Date(artifact.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono break-all">{artifact.path}</div>
              </>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </h3>
            {editing ? (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = editTagInput.trim().toLowerCase();
                        if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
                        setEditTagInput('');
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const t = editTagInput.trim().toLowerCase();
                      if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
                      setEditTagInput('');
                    }}
                    className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editTags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                      {tag}
                      <button onClick={() => setEditTags(editTags.filter((t) => t !== tag))}>
                        <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {artifact.tags.length === 0 ? (
                  <span className="text-xs text-slate-400">No tags</span>
                ) : (
                  artifact.tags.map((tag) => (
                    <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Relationships */}
          {artifact.relationships.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Relationships</h3>
              <div className="space-y-2">
                {artifact.relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">{RELATIONSHIP_TYPE_LABELS[r.type as RelationshipType]}</span>
                    <Link
                      href={`/artifacts/${encodeURIComponent(r.targetPath)}`}
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium truncate"
                    >
                      {r.targetTitle}
                      <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
