'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Bot, User, Wrench, ChevronDown, ChevronUp,
  Lightbulb, FileText, Search, BarChart3, AlertCircle,
} from 'lucide-react';
import type { ChatMessage, ToolCallRecord, SSEEvent } from '@/lib/types';

const QUICK_PROMPTS = [
  { icon: BarChart3, label: 'Vault Summary', prompt: 'Give me a summary of all artifacts in the enterprise vault, including counts by type and any recent updates.' },
  { icon: FileText, label: 'Create Policy', prompt: 'Help me create a comprehensive Data Privacy Policy for our enterprise. Ask me for the details you need.' },
  { icon: Search, label: 'Find Gaps', prompt: 'Analyze the current artifacts in the vault and identify any documentation gaps or missing enterprise artifacts that should be created.' },
  { icon: Lightbulb, label: 'Suggest Relationships', prompt: 'Look at the existing artifacts and suggest meaningful relationships that should be established between them.' },
];

function ToolCallBadge({ toolCall }: { toolCall: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = toolCall.result !== undefined;

  return (
    <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-colors text-left"
      >
        <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-medium text-slate-700 flex-1">{toolCall.name}</span>
        {hasResult && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${toolCall.error ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {toolCall.error ? 'Error' : 'Done'}
          </span>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-200 space-y-2 pt-2">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Input</div>
            <pre className="bg-white border border-slate-100 rounded p-2 overflow-x-auto text-[11px] text-slate-600">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {hasResult && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {toolCall.error ? 'Error' : 'Result'}
              </div>
              <pre className={`border rounded p-2 overflow-x-auto text-[11px] max-h-48 ${toolCall.error ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-white border-slate-100 text-slate-600'}`}>
                {toolCall.error ?? JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-brand-600' : 'bg-slate-700'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[80%] space-y-2 ${isUser ? 'items-end flex flex-col' : ''}`}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1.5 w-full">
            {message.toolCalls.map((tc) => (
              <ToolCallBadge key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm ${
              isUser
                ? 'bg-brand-600 text-white rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && !message.content && (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-slate-400 rounded-full thinking-dot" />
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your Enterprise Brain AI Assistant. I can help you:

- **Create and manage** enterprise artifacts (policies, procedures, contracts, etc.)
- **Search and explore** your vault content
- **Identify relationships** between documents
- **Analyze gaps** in your enterprise documentation
- **Generate** professional artifact content

What would you like to work on today?`,
      toolCalls: [],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        setConfigured(!!settings.claude?.apiKey);
      } catch {
        setConfigured(false);
      }
    }
    checkConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    // Build conversation history for API (exclude welcome message)
    const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({
      role: m.role,
      content: m.content || '...',
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error('Chat API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';
      const finalToolCalls: ToolCallRecord[] = [];
      const pendingToolCalls: Record<string, ToolCallRecord> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent;

            if (event.type === 'thinking') {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantMsg.id ? { ...m, isStreaming: true } : m)
              );
            } else if (event.type === 'tool_call') {
              const tc: ToolCallRecord = { id: event.id, name: event.name, input: event.input };
              pendingToolCalls[event.id] = tc;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
                    : m
                )
              );
            } else if (event.type === 'tool_result') {
              if (pendingToolCalls[event.id]) {
                pendingToolCalls[event.id].result = event.result;
                finalToolCalls.push(pendingToolCalls[event.id]);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map((tc) =>
                            tc.id === event.id ? { ...tc, result: event.result } : tc
                          ),
                        }
                      : m
                  )
                );
              }
            } else if (event.type === 'message_complete') {
              finalContent = event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: finalContent, toolCalls: event.toolCalls, isStreaming: false }
                    : m
                )
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                    : m
                )
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${String(err)}`, isStreaming: false }
            : m
        )
      );
    }

    setStreaming(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">Enterprise Brain AI Assistant</h1>
            <p className="text-xs text-slate-500">Powered by Claude · Enterprise vault agent</p>
          </div>
        </div>
      </div>

      {/* Config warning */}
      {configured === false && (
        <div className="flex-shrink-0 mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-700">
            Claude API key not configured.{' '}
            <a href="/settings" className="font-medium underline">Go to Settings</a>
          </span>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 px-6 py-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => sendMessage(prompt)}
                disabled={streaming}
                className="flex items-center gap-2.5 text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/50 transition-all text-sm group disabled:opacity-50"
              >
                <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <span className="font-medium text-slate-700 group-hover:text-brand-700">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-200">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the AI assistant... (Enter to send, Shift+Enter for new line)"
            disabled={streaming}
            rows={1}
            className="flex-1 px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 disabled:opacity-50 resize-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
            className="flex-shrink-0 w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          The assistant can create, read, and modify artifacts in your Obsidian vault.
        </p>
      </div>
    </div>
  );
}
