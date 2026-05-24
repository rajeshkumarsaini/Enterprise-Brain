import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { createObsidianClient } from '@/lib/obsidian';
import type { Artifact } from '@/lib/types';

function decodePath(id: string): string {
  return decodeURIComponent(id).replace(/\|/g, '/');
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const filePath = decodePath(params.id);
    const settings = getSettings();
    const client = createObsidianClient(settings.obsidian);
    const artifact = await client.getArtifact(filePath);
    return NextResponse.json({ artifact });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const filePath = decodePath(params.id);
    const updates = (await req.json()) as Partial<Artifact>;
    const settings = getSettings();
    const client = createObsidianClient(settings.obsidian);
    const artifact = await client.updateArtifact(filePath, updates);
    return NextResponse.json({ artifact });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const filePath = decodePath(params.id);
    const settings = getSettings();
    const client = createObsidianClient(settings.obsidian);
    await client.deleteArtifact(filePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
