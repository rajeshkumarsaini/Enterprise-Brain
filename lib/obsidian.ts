import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import type { Artifact, ArtifactType, ArtifactStatus, Relationship } from './types';

interface ObsidianVaultList {
  files: string[];
}

interface ObsidianSearchResult {
  filename: string;
  score: number;
  matches?: unknown[];
}

export class ObsidianClient {
  private baseUrl: string;
  private apiKey: string;
  public vaultPath: string;

  constructor(apiUrl: string, apiKey: string, vaultPath: string) {
    this.baseUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.vaultPath = vaultPath;
  }

  private get authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        headers: this.authHeaders,
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async fetchJSON<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { ...this.authHeaders, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Obsidian API error ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  private async fetchText(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { ...this.authHeaders, Accept: 'text/markdown' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Obsidian API error ${res.status}: ${res.statusText}`);
    return res.text();
  }

  private async putFile(path: string, content: string): Promise<void> {
    const encoded = encodeURIComponent(path).replace(/%2F/g, '/');
    const res = await fetch(`${this.baseUrl}/vault/${encoded}`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'text/markdown' },
      body: content,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Obsidian write error ${res.status}: ${res.statusText}`);
  }

  private async deleteFile(path: string): Promise<void> {
    const encoded = encodeURIComponent(path).replace(/%2F/g, '/');
    const res = await fetch(`${this.baseUrl}/vault/${encoded}`, {
      method: 'DELETE',
      headers: this.authHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Obsidian delete error ${res.status}`);
  }

  async listFiles(): Promise<string[]> {
    try {
      const folderPath = encodeURIComponent(this.vaultPath).replace(/%2F/g, '/');
      const data = await this.fetchJSON<ObsidianVaultList>(`/vault/${folderPath}/`);
      return (data.files ?? []).filter((f: string) => f.endsWith('.md'));
    } catch {
      // Folder may not exist yet
      return [];
    }
  }

  async readFile(filePath: string): Promise<string> {
    const encoded = encodeURIComponent(filePath).replace(/%2F/g, '/');
    return this.fetchText(`/vault/${encoded}`);
  }

  async search(query: string): Promise<ObsidianSearchResult[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/search/simple/?query=${encodeURIComponent(query)}&contextLength=200`,
        { headers: { ...this.authHeaders, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return [];
      return res.json() as Promise<ObsidianSearchResult[]>;
    } catch {
      return [];
    }
  }

  parseArtifact(filePath: string, raw: string): Artifact {
    const { data: fm, content } = matter(raw);
    const name = filePath.split('/').pop()?.replace(/\.md$/, '') ?? 'Untitled';
    return {
      id: (fm.id as string) || filePath,
      title: (fm.title as string) || name,
      type: ((fm.type as ArtifactType) || 'document') as ArtifactType,
      content: content.trim(),
      tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
      relationships: Array.isArray(fm.relationships) ? (fm.relationships as Relationship[]) : [],
      owner: fm.owner as string | undefined,
      status: ((fm.status as ArtifactStatus) || 'draft') as ArtifactStatus,
      version: (fm.version as string) || '1.0',
      createdAt: (fm.created as string) || new Date().toISOString(),
      updatedAt: (fm.updated as string) || new Date().toISOString(),
      path: filePath,
    };
  }

  serializeArtifact(artifact: Artifact): string {
    const fm: Record<string, unknown> = {
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      tags: artifact.tags,
      relationships: artifact.relationships,
      status: artifact.status,
      version: artifact.version,
      created: artifact.createdAt,
      updated: artifact.updatedAt,
    };
    if (artifact.owner) fm.owner = artifact.owner;
    return matter.stringify(`\n${artifact.content}\n`, fm);
  }

  artifactPath(title: string, type: ArtifactType): string {
    const folder = this.typeFolderName(type);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${this.vaultPath}/${folder}/${slug}.md`;
  }

  private typeFolderName(type: ArtifactType): string {
    const map: Record<ArtifactType, string> = {
      policy: 'Policies',
      procedure: 'Procedures',
      'knowledge-article': 'Knowledge Articles',
      document: 'Documents',
      'financial-statement': 'Financial Statements',
      'regulatory-communication': 'Regulatory Communications',
      'data-store-doc': 'Data Store Documentation',
      'third-party-contract': 'Third Party Contracts',
      other: 'Other',
    };
    return map[type];
  }

  async listArtifacts(typeFilter?: string, tagFilter?: string[]): Promise<Artifact[]> {
    const files = await this.listFiles();
    const artifacts: Artifact[] = [];
    for (const file of files) {
      try {
        const raw = await this.readFile(file);
        const artifact = this.parseArtifact(file, raw);
        if (typeFilter && artifact.type !== typeFilter) continue;
        if (tagFilter?.length) {
          const hasTag = tagFilter.some((t) => artifact.tags.includes(t));
          if (!hasTag) continue;
        }
        artifacts.push(artifact);
      } catch {
        // Skip unreadable files
      }
    }
    return artifacts;
  }

  async getArtifact(filePath: string): Promise<Artifact> {
    const raw = await this.readFile(filePath);
    return this.parseArtifact(filePath, raw);
  }

  async createArtifact(data: {
    title: string;
    type: ArtifactType;
    content: string;
    tags?: string[];
    owner?: string;
    status?: ArtifactStatus;
    version?: string;
    relationships?: Relationship[];
  }): Promise<Artifact> {
    const now = new Date().toISOString();
    const artifact: Artifact = {
      id: uuidv4(),
      title: data.title,
      type: data.type,
      content: data.content,
      tags: data.tags ?? [],
      relationships: data.relationships ?? [],
      owner: data.owner,
      status: data.status ?? 'draft',
      version: data.version ?? '1.0',
      createdAt: now,
      updatedAt: now,
      path: this.artifactPath(data.title, data.type),
    };
    const raw = this.serializeArtifact(artifact);
    await this.putFile(artifact.path, raw);
    return artifact;
  }

  async updateArtifact(filePath: string, updates: Partial<Omit<Artifact, 'id' | 'createdAt' | 'path'>>): Promise<Artifact> {
    const existing = await this.getArtifact(filePath);
    const updated: Artifact = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      path: filePath,
    };
    const raw = this.serializeArtifact(updated);
    await this.putFile(filePath, raw);
    return updated;
  }

  async deleteArtifact(filePath: string): Promise<void> {
    await this.deleteFile(filePath);
  }

  async searchArtifacts(query: string): Promise<Artifact[]> {
    const results = await this.search(query);
    const vaultFiles = results
      .map((r) => r.filename)
      .filter((f) => f.startsWith(this.vaultPath) && f.endsWith('.md'));
    const artifacts: Artifact[] = [];
    for (const file of vaultFiles) {
      try {
        artifacts.push(await this.getArtifact(file));
      } catch {
        // skip
      }
    }
    return artifacts;
  }
}

export function createObsidianClient(settings: {
  apiUrl: string;
  apiKey: string;
  vaultPath: string;
}): ObsidianClient {
  return new ObsidianClient(settings.apiUrl, settings.apiKey, settings.vaultPath);
}
