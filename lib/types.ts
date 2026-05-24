export type ArtifactType =
  | 'policy'
  | 'procedure'
  | 'knowledge-article'
  | 'document'
  | 'financial-statement'
  | 'regulatory-communication'
  | 'data-store-doc'
  | 'third-party-contract'
  | 'other';

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  policy: 'Policy',
  procedure: 'Procedure',
  'knowledge-article': 'Knowledge Article',
  document: 'Document',
  'financial-statement': 'Financial Statement',
  'regulatory-communication': 'Regulatory Communication',
  'data-store-doc': 'Data Store Documentation',
  'third-party-contract': 'Third Party Contract',
  other: 'Other',
};

export const ARTIFACT_TYPE_COLORS: Record<ArtifactType, { bg: string; text: string; border: string }> = {
  policy: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  procedure: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'knowledge-article': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  document: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'financial-statement': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  'regulatory-communication': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'data-store-doc': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'third-party-contract': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  other: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export type RelationshipType =
  | 'references'
  | 'implements'
  | 'supersedes'
  | 'related-to'
  | 'depends-on'
  | 'governed-by'
  | 'approved-by';

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  references: 'References',
  implements: 'Implements',
  supersedes: 'Supersedes',
  'related-to': 'Related To',
  'depends-on': 'Depends On',
  'governed-by': 'Governed By',
  'approved-by': 'Approved By',
};

export interface Relationship {
  targetPath: string;
  targetTitle: string;
  type: RelationshipType;
}

export type ArtifactStatus = 'draft' | 'review' | 'approved' | 'archived';

export const STATUS_COLORS: Record<ArtifactStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  review: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  content: string;
  tags: string[];
  relationships: Relationship[];
  owner?: string;
  status: ArtifactStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  path: string;
}

export interface ObsidianSettings {
  apiUrl: string;
  apiKey: string;
  vaultPath: string;
}

export interface ClaudeSettings {
  apiKey: string;
  model: string;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  description?: string;
}

export interface AppSettings {
  obsidian: ObsidianSettings;
  claude: ClaudeSettings;
  mcp: {
    servers: MCPServer[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallRecord[];
  timestamp: string;
  isStreaming?: boolean;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export type SSEEvent =
  | { type: 'thinking' }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | { type: 'text_delta'; delta: string }
  | { type: 'message_complete'; content: string; toolCalls: ToolCallRecord[] }
  | { type: 'error'; message: string }
  | { type: 'done' };
