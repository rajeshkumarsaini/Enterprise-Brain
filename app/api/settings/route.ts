import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';
import { createObsidianClient } from '@/lib/obsidian';
import type { AppSettings } from '@/lib/types';

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as AppSettings;
    saveSettings(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Test Obsidian connection
  try {
    const { apiUrl, apiKey, vaultPath } = (await req.json()) as {
      apiUrl: string;
      apiKey: string;
      vaultPath: string;
    };
    const client = createObsidianClient({ apiUrl, apiKey, vaultPath });
    const ok = await client.ping();
    if (ok) {
      return NextResponse.json({ ok: true, message: 'Connected to Obsidian successfully' });
    } else {
      return NextResponse.json({ ok: false, message: 'Could not connect to Obsidian. Check that Obsidian is open and the Local REST API plugin is enabled.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err) }, { status: 400 });
  }
}
