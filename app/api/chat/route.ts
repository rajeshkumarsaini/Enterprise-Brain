import Anthropic from '@anthropic-ai/sdk';
import { getSettings } from '@/lib/settings';
import { createObsidianClient, ObsidianClient } from '@/lib/obsidian';
import type { ArtifactType, ArtifactStatus, Relationship, ToolCallRecord, SSEEvent } from '@/lib/types';

const SYSTEM_PROMPT = `You are the Enterprise Brain AI Assistant — an expert enterprise architect AI that helps manage and develop an enterprise knowledge vault stored in Obsidian.

Your role is to help users:
1. Create, organize, and manage enterprise artifacts (policies, procedures, knowledge articles, documents, financial statements, regulatory communications, data store documentation, third-party contracts)
2. Identify and establish meaningful relationships between artifacts
3. Search and retrieve information from the vault
4. Ensure artifacts follow enterprise standards with proper structure and metadata
5. Suggest improvements, gaps, and connections in the enterprise documentation

Artifact types you work with:
- **policy**: High-level organizational directives and rules (e.g., Data Privacy Policy, Security Policy)
- **procedure**: Step-by-step operational instructions (e.g., Onboarding Procedure, Incident Response)
- **knowledge-article**: Reference material and how-to guides
- **document**: General documentation and reports
- **financial-statement**: Financial records, budgets, forecasts
- **regulatory-communication**: Regulatory filings, compliance communications, audit responses
- **data-store-doc**: Database schemas, data dictionaries, data architecture documentation
- **third-party-contract**: Vendor agreements, SLAs, NDAs, partnerships

Best practices:
- Always check existing artifacts before creating new ones to avoid duplication
- Add relevant tags to improve discoverability
- Create meaningful relationships between related artifacts
- Use clear, professional language appropriate for enterprise documentation
- Set appropriate status: draft → review → approved → archived

When creating artifacts, generate well-structured, professional content appropriate for the type.
Always respond in a helpful, concise manner. Use the available tools to interact with the vault.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_artifacts',
    description: 'List all artifacts in the enterprise vault. Optionally filter by type or tags.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['policy', 'procedure', 'knowledge-article', 'document', 'financial-statement', 'regulatory-communication', 'data-store-doc', 'third-party-contract', 'other'],
          description: 'Filter by artifact type',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (any match)',
        },
      },
    },
  },
  {
    name: 'search_artifacts',
    description: 'Full-text search across all artifacts in the vault.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_artifact',
    description: 'Read the full content and metadata of a specific artifact by its file path.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Vault path to the artifact file (e.g., "Enterprise Brain/Policies/data-privacy-policy.md")' },
      },
      required: ['path'],
    },
  },
  {
    name: 'create_artifact',
    description: 'Create a new artifact in the enterprise vault.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Artifact title' },
        type: {
          type: 'string',
          enum: ['policy', 'procedure', 'knowledge-article', 'document', 'financial-statement', 'regulatory-communication', 'data-store-doc', 'third-party-contract', 'other'],
          description: 'Artifact type',
        },
        content: { type: 'string', description: 'Full markdown content of the artifact' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the artifact' },
        owner: { type: 'string', description: 'Owner or responsible team/person' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'archived'], description: 'Artifact status' },
        version: { type: 'string', description: 'Version string (e.g., "1.0")' },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetPath: { type: 'string' },
              targetTitle: { type: 'string' },
              type: { type: 'string', enum: ['references', 'implements', 'supersedes', 'related-to', 'depends-on', 'governed-by', 'approved-by'] },
            },
            required: ['targetPath', 'targetTitle', 'type'],
          },
          description: 'Relationships to other artifacts',
        },
      },
      required: ['title', 'type', 'content'],
    },
  },
  {
    name: 'update_artifact',
    description: 'Update an existing artifact in the vault.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Vault path to the artifact' },
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        owner: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'archived'] },
        version: { type: 'string' },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetPath: { type: 'string' },
              targetTitle: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_vault_stats',
    description: 'Get statistics about the enterprise vault (artifact counts by type, recent artifacts).',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

async function executeTool(
  obsidian: ObsidianClient,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'list_artifacts': {
      const artifacts = await obsidian.listArtifacts(
        input.type as ArtifactType | undefined,
        input.tags as string[] | undefined
      );
      return artifacts.map((a) => ({
        path: a.path,
        title: a.title,
        type: a.type,
        status: a.status,
        tags: a.tags,
        updatedAt: a.updatedAt,
        summary: a.content.slice(0, 200),
      }));
    }
    case 'search_artifacts': {
      const artifacts = await obsidian.searchArtifacts(input.query as string);
      return artifacts.map((a) => ({
        path: a.path,
        title: a.title,
        type: a.type,
        tags: a.tags,
        summary: a.content.slice(0, 200),
      }));
    }
    case 'read_artifact': {
      const artifact = await obsidian.getArtifact(input.path as string);
      return artifact;
    }
    case 'create_artifact': {
      const artifact = await obsidian.createArtifact({
        title: input.title as string,
        type: input.type as ArtifactType,
        content: input.content as string,
        tags: input.tags as string[] | undefined,
        owner: input.owner as string | undefined,
        status: input.status as ArtifactStatus | undefined,
        version: input.version as string | undefined,
        relationships: input.relationships as Relationship[] | undefined,
      });
      return { success: true, artifact: { path: artifact.path, title: artifact.title, type: artifact.type } };
    }
    case 'update_artifact': {
      const artifact = await obsidian.updateArtifact(input.path as string, {
        title: input.title as string | undefined,
        content: input.content as string | undefined,
        tags: input.tags as string[] | undefined,
        owner: input.owner as string | undefined,
        status: input.status as ArtifactStatus | undefined,
        version: input.version as string | undefined,
        relationships: input.relationships as Relationship[] | undefined,
      });
      return { success: true, artifact: { path: artifact.path, title: artifact.title } };
    }
    case 'get_vault_stats': {
      const artifacts = await obsidian.listArtifacts();
      const byType: Record<string, number> = {};
      for (const a of artifacts) {
        byType[a.type] = (byType[a.type] ?? 0) + 1;
      }
      const recent = artifacts
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map((a) => ({ path: a.path, title: a.title, type: a.type, updatedAt: a.updatedAt }));
      return { total: artifacts.length, byType, recent };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
  };

  const settings = getSettings();
  if (!settings.claude.apiKey) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Claude API key not configured. Please visit Settings.' } satisfies SSEEvent)}\n\ndata: ${JSON.stringify({ type: 'done' } satisfies SSEEvent)}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    );
  }

  const anthropic = new Anthropic({ apiKey: settings.claude.apiKey });
  const obsidian = createObsidianClient(settings.obsidian);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        let currentMessages: Anthropic.MessageParam[] = [...messages];
        const toolCalls: ToolCallRecord[] = [];
        const MAX_ITERATIONS = 10;

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          send({ type: 'thinking' });

          const response = await anthropic.messages.create({
            model: settings.claude.model || 'claude-opus-4-7',
            max_tokens: 8096,
            system: SYSTEM_PROMPT,
            messages: currentMessages,
            tools: TOOLS,
          });

          if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
            const textBlock = response.content.find((c) => c.type === 'text');
            const finalText = textBlock?.type === 'text' ? textBlock.text : '';
            send({ type: 'message_complete', content: finalText, toolCalls });
            break;
          }

          if (response.stop_reason === 'tool_use') {
            // Push assistant turn
            currentMessages = [...currentMessages, { role: 'assistant', content: response.content }];

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type !== 'tool_use') continue;

              const record: ToolCallRecord = {
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              };

              send({ type: 'tool_call', id: block.id, name: block.name, input: block.input as Record<string, unknown> });

              try {
                const result = await executeTool(obsidian, block.name, block.input as Record<string, unknown>);
                record.result = result;
                send({ type: 'tool_result', id: block.id, name: block.name, result });
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
              } catch (err) {
                const errMsg = String(err);
                record.error = errMsg;
                send({ type: 'tool_result', id: block.id, name: block.name, result: { error: errMsg } });
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${errMsg}`, is_error: true });
              }

              toolCalls.push(record);
            }

            currentMessages = [...currentMessages, { role: 'user', content: toolResults }];
          }
        }
      } catch (err) {
        send({ type: 'error', message: String(err) });
      }

      send({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
