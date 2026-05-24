'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, List, BookOpen, FileText, TrendingUp, Scale,
  Database, Handshake, File, ChevronLeft, Save, Plus, X,
} from 'lucide-react';
import type { ArtifactType, ArtifactStatus, RelationshipType } from '@/lib/types';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPE_COLORS, RELATIONSHIP_TYPE_LABELS } from '@/lib/types';

const TYPE_ICONS: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  policy: Shield, procedure: List, 'knowledge-article': BookOpen, document: FileText,
  'financial-statement': TrendingUp, 'regulatory-communication': Scale,
  'data-store-doc': Database, 'third-party-contract': Handshake, other: File,
};

const TEMPLATES: Record<ArtifactType, string> = {
  policy: `## Purpose\n\nDescribe the purpose and objective of this policy.\n\n## Scope\n\nDescribe who and what this policy applies to.\n\n## Policy Statement\n\nDescribe the policy requirements and rules.\n\n## Responsibilities\n\n- **[Role]**: Responsibilities\n- **[Role]**: Responsibilities\n\n## Compliance\n\nDescribe how compliance is monitored and enforced.\n\n## Review and Updates\n\nThis policy is reviewed annually or when significant changes occur.`,
  procedure: `## Purpose\n\nDescribe the purpose of this procedure.\n\n## Scope\n\nDescribe when and by whom this procedure is used.\n\n## Prerequisites\n\n- Prerequisite 1\n- Prerequisite 2\n\n## Procedure Steps\n\n1. **Step 1**: Description\n2. **Step 2**: Description\n3. **Step 3**: Description\n\n## Expected Outcome\n\nDescribe the expected result after completing this procedure.\n\n## Related Documents\n\nList related policies or procedures.`,
  'knowledge-article': `## Summary\n\nBrief summary of this knowledge article.\n\n## Overview\n\nDetailed overview and background information.\n\n## Key Information\n\n### Section 1\n\nContent here.\n\n### Section 2\n\nContent here.\n\n## Related Articles\n\nLinks to related knowledge articles.`,
  document: `## Overview\n\nDocument overview.\n\n## Content\n\nMain document content.\n\n## References\n\nList references and sources.`,
  'financial-statement': `## Executive Summary\n\nFinancial summary for the period.\n\n## Revenue\n\n| Category | Amount | YoY Change |\n|----------|--------|------------|\n| Revenue  | $0     | 0%         |\n\n## Expenses\n\n| Category | Amount |\n|----------|--------|\n| Expenses | $0     |\n\n## Key Metrics\n\n- Metric 1: Value\n- Metric 2: Value\n\n## Notes\n\nAdditional notes and disclosures.`,
  'regulatory-communication': `## Regulatory Body\n\nIdentify the regulatory body.\n\n## Communication Type\n\nType of communication (e.g., filing, response, notification).\n\n## Summary\n\nSummary of the communication.\n\n## Content\n\nFull content of the communication.\n\n## Response Required\n\n- Response due: [Date]\n- Action items: [List]\n\n## Attachments\n\nList of attachments.`,
  'data-store-doc': `## Overview\n\nDescribe the data store.\n\n## Technology\n\n- Type: (e.g., PostgreSQL, S3, MongoDB)\n- Version:\n- Environment:\n\n## Schema / Structure\n\n\`\`\`\n[Schema definition here]\n\`\`\`\n\n## Data Dictionary\n\n| Field | Type | Description | PII? |\n|-------|------|-------------|------|\n| id    | UUID | Primary key | No   |\n\n## Access Controls\n\nDescribe who has access and how access is managed.\n\n## Retention Policy\n\nDescribe data retention and deletion policies.\n\n## Data Owner\n\nIdentify the data owner and steward.`,
  'third-party-contract': `## Parties\n\n- **Client**: [Organization]\n- **Vendor**: [Vendor Name]\n\n## Contract Overview\n\n- Contract Type:\n- Effective Date:\n- Expiry Date:\n- Contract Value:\n- Auto-renewal:\n\n## Scope of Services\n\nDescribe services or products provided.\n\n## Key Terms\n\n### SLA Commitments\n\n- Uptime: %\n- Response time:\n- Support hours:\n\n### Payment Terms\n\nPayment schedule and terms.\n\n## Termination Clauses\n\nConditions for termination.\n\n## Contact Information\n\n- Vendor Contact:\n- Internal Owner:`,
  other: `## Overview\n\nArtifact overview.\n\n## Content\n\nMain content.\n`,
};

const ALL_TYPES: ArtifactType[] = [
  'policy', 'procedure', 'knowledge-article', 'document',
  'financial-statement', 'regulatory-communication', 'data-store-doc', 'third-party-contract', 'other',
];

export default function NewArtifactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ArtifactType>('document');
  const [content, setContent] = useState(TEMPLATES['document']);
  const [owner, setOwner] = useState('');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState<ArtifactStatus>('draft');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relTarget, setRelTarget] = useState('');
  const [relTitle, setRelTitle] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('references');
  const [relationships, setRelationships] = useState<{ targetPath: string; targetTitle: string; type: RelationshipType }[]>([]);

  const handleTypeChange = (t: ArtifactType) => {
    setType(t);
    if (!content || content === TEMPLATES[type]) {
      setContent(TEMPLATES[t]);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const addRelationship = () => {
    if (relTarget.trim() && relTitle.trim()) {
      setRelationships([...relationships, { targetPath: relTarget.trim(), targetTitle: relTitle.trim(), type: relType }]);
      setRelTarget('');
      setRelTitle('');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, content, tags, owner: owner || undefined, status, version, relationships }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      const encodedPath = encodeURIComponent(data.artifact.path);
      router.push(`/artifacts/${encodedPath}`);
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/artifacts" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create New Artifact</h1>
          <p className="text-sm text-slate-500">Add a new artifact to your enterprise vault</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter artifact title..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>

          {/* Type selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">Artifact Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                const colors = ARTIFACT_TYPE_COLORS[t];
                const selected = t === type;
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                      selected
                        ? `${colors.bg} ${colors.text} border-current`
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? colors.text : 'text-slate-400'}`} />
                    {ARTIFACT_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Content (Markdown)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 resize-y"
              placeholder="Write your artifact content in Markdown..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Metadata</h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ArtifactStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Team or person"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tags</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button onClick={addTag} className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Relationships */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Relationships</h3>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={relTitle}
                onChange={(e) => setRelTitle(e.target.value)}
                placeholder="Related artifact title"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <input
                type="text"
                value={relTarget}
                onChange={(e) => setRelTarget(e.target.value)}
                placeholder="Vault path (e.g., Vault/Policies/...)"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationshipType)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {Object.entries(RELATIONSHIP_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={addRelationship}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Relationship
              </button>
            </div>
            <div className="space-y-1.5">
              {relationships.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-700 font-medium truncate">{r.targetTitle}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-400">{RELATIONSHIP_TYPE_LABELS[r.type]}</span>
                    <button onClick={() => setRelationships(relationships.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-medium py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
