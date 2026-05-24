import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { createObsidianClient } from '@/lib/obsidian';
import type { ArtifactType, ArtifactStatus, Relationship } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? undefined;
    const tag = searchParams.get('tag') ?? undefined;
    const q = searchParams.get('q') ?? undefined;

    const settings = getSettings();
    if (!settings.obsidian.apiKey) {
      return NextResponse.json({ artifacts: [], warning: 'Obsidian not configured' });
    }

    const client = createObsidianClient(settings.obsidian);

    if (q) {
      const artifacts = await client.searchArtifacts(q);
      return NextResponse.json({ artifacts });
    }

    const artifacts = await client.listArtifacts(type, tag ? [tag] : undefined);
    artifacts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ artifacts });
  } catch (err) {
    return NextResponse.json({ error: String(err), artifacts: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title: string;
      type: ArtifactType;
      content: string;
      tags?: string[];
      owner?: string;
      status?: ArtifactStatus;
      version?: string;
      relationships?: Relationship[];
    };

    const settings = getSettings();
    if (!settings.obsidian.apiKey) {
      return NextResponse.json({ error: 'Obsidian not configured' }, { status: 400 });
    }

    const client = createObsidianClient(settings.obsidian);
    const artifact = await client.createArtifact(body);
    return NextResponse.json({ artifact });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
