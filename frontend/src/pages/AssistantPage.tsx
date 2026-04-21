import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  AudioLines,
  ChevronsRight,
  Copy,
  EllipsisVertical,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { sendAssistantMessage } from '../lib/api';
import type { AssistantAction, AssistantMessage } from '../../shared/assistant';
import type { ProgressData } from '../types';

type AssistantPageProps = {
  progress: ProgressData | null;
  currentTab: string;
  currentKitId: string | null;
  onRunAction: (action: AssistantAction) => Promise<void> | void;
  onQuickCreate: () => void;
  onOpenSettings: () => void;
};

type AssistantUiMessage = AssistantMessage & {
  actions?: string[];
  usedModel?: boolean;
};

type AssistantMode = 'chat' | 'solve';

type AssistantThread = {
  id: string;
  title: string;
  mode: AssistantMode;
  messages: AssistantUiMessage[];
  updatedAt: string;
};

const THREADS_STORAGE_KEY = 'snaplet_juno_threads_v1';

function loadThreads(): AssistantThread[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(THREADS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((thread): thread is AssistantThread => {
        return (
          typeof thread === 'object' &&
          thread !== null &&
          typeof (thread as AssistantThread).id === 'string' &&
          typeof (thread as AssistantThread).title === 'string' &&
          ((thread as AssistantThread).mode === 'chat' || (thread as AssistantThread).mode === 'solve') &&
          Array.isArray((thread as AssistantThread).messages) &&
          typeof (thread as AssistantThread).updatedAt === 'string'
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

function buildThreadTitle(messages: AssistantUiMessage[], fallback: string): string {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim();
  if (!firstUserMessage) {
    return fallback;
  }
  return firstUserMessage.length > 48 ? `${firstUserMessage.slice(0, 45)}...` : firstUserMessage;
}

function formatAssistantText(content: string): string {
  return content
    .replace(/\*\*/g, '')
    .replace(/^\* /gm, '• ')
    .replace(/^- /gm, '• ');
}

function formatThreadTime(updatedAt: string): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return 'Today';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AssistantPage({
  progress,
  currentTab,
  currentKitId,
  onRunAction,
  onQuickCreate,
  onOpenSettings,
}: AssistantPageProps) {
  const [threads, setThreads] = useState<AssistantThread[]>(() => loadThreads());
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => loadThreads()[0]?.id ?? null);
  const [mode, setMode] = useState<AssistantMode>('chat');
  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasConversation = messages.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, submitting]);

  useEffect(() => {
    const currentThread = threads.find((thread) => thread.id === currentThreadId) ?? null;
    if (!currentThread) {
      return;
    }
    setMessages(currentThread.messages);
    setMode(currentThread.mode);
  }, [currentThreadId, threads]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (historyRef.current && !historyRef.current.contains(target)) {
        setHistoryOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentThread = useMemo(
    () => threads.find((thread) => thread.id === currentThreadId) ?? null,
    [currentThreadId, threads],
  );

  const upsertThread = (
    threadId: string,
    threadMessages: AssistantUiMessage[],
    threadMode: AssistantMode,
  ) => {
    const nextThread: AssistantThread = {
      id: threadId,
      title: buildThreadTitle(
        threadMessages,
        threadMode === 'solve' ? 'Untitled solve chat' : 'Untitled chat',
      ),
      mode: threadMode,
      messages: threadMessages,
      updatedAt: new Date().toISOString(),
    };

    setThreads((current) => {
      const withoutCurrent = current.filter((thread) => thread.id !== threadId);
      return [nextThread, ...withoutCurrent];
    });
    setCurrentThreadId(threadId);
  };

  const startFreshThread = (nextMode: AssistantMode = mode) => {
    setCurrentThreadId(null);
    setMessages([]);
    setInput('');
    setSubmitting(false);
    setStatus(null);
    setMode(nextMode);
    setHistoryOpen(false);
    setMenuOpen(false);
  };

  const deleteCurrentThread = () => {
    if (!currentThreadId) {
      startFreshThread();
      return;
    }

    setThreads((current) => current.filter((thread) => thread.id !== currentThreadId));
    setCurrentThreadId(null);
    setMessages([]);
    setStatus(null);
    setInput('');
    setMenuOpen(false);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>, override?: string) => {
    event?.preventDefault();
    const content = (override ?? input).trim();
    if (!content || submitting) {
      return;
    }

    const threadId = currentThreadId ?? crypto.randomUUID();
    const nextMessages = [...messages, { role: 'user', content }] satisfies AssistantUiMessage[];
    setMessages(nextMessages);
    upsertThread(threadId, nextMessages, mode);
    setInput('');
    setSubmitting(true);
    setStatus(mode === 'solve' ? 'Juno is working through it...' : 'Juno is thinking...');

    try {
      const response = await sendAssistantMessage({
        messages: nextMessages.map(({ role, content: body }) => ({ role, content: body })),
        routeContext: {
          currentTab,
          currentKitId,
        },
      });

      const finalMessages = [
        ...nextMessages,
        {
          role: 'assistant',
          content: formatAssistantText(response.message),
          actions: response.suggestions,
          usedModel: response.usedModel,
        },
      ] satisfies AssistantUiMessage[];

      setMessages(finalMessages);
      upsertThread(threadId, finalMessages, mode);

      if (response.action) {
        const actionLabel = describeAction(response.action);
        setStatus(`Juno is ${actionLabel.toLowerCase()}...`);
        await onRunAction(response.action);
      }

      setStatus(null);
    } catch (error) {
      const errorMessages = [
        ...nextMessages,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `I hit a problem while replying: ${error.message}`
              : 'I hit a problem while replying. Please try again.',
          usedModel: false,
        },
      ] satisfies AssistantUiMessage[];
      setMessages(errorMessages);
      upsertThread(threadId, errorMessages, mode);
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSubmit();
  };

  const heading =
    mode === 'solve' ? 'What question are we working on today?' : 'What can I help with?';
  const placeholder =
    mode === 'solve' ? 'Type your question here' : 'Type your question here';
  const emptyTag = mode === 'solve' ? 'Ultra' : 'Ultra';

  const composer = (
    <div className="mx-auto w-full max-w-[660px]">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.06] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={onQuickCreate}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-on-surface-variant transition hover:text-white"
          aria-label="Assistant tools"
        >
          <Plus className="h-4 w-4" />
        </button>
        <textarea
          id="juno-message"
          name="juno_message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={placeholder}
          rows={1}
          className="max-h-36 min-h-[28px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 text-white placeholder:text-on-surface-variant focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || input.trim().length === 0}
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
            submitting || input.trim().length === 0
              ? 'bg-white/[0.08] text-on-surface-variant/50'
              : 'bg-white text-black',
          ].join(' ')}
          aria-label="Send message"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );

  return (
    <div className="assistant-shell relative min-h-screen bg-[#0b0b0c]">
      <div className="relative flex min-h-screen flex-col">
        <div ref={historyRef} className="absolute left-4 top-4 z-30">
          <button
            type="button"
            onClick={() => setHistoryOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-background/80 text-on-surface-variant transition hover:text-white"
            aria-label="Toggle history"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>

          {historyOpen ? (
            <div className="absolute left-0 top-14 w-[280px] overflow-hidden rounded-[24px] border border-white/10 bg-[#18191c] p-3 text-white shadow-[0_26px_70px_rgba(0,0,0,0.46)]">
              <div className="mb-2 px-2 pt-1 text-sm font-semibold text-white">Chat History</div>
              <div className="space-y-1">
                {threads.length === 0 ? (
                  <div className="rounded-2xl bg-white/[0.03] px-3 py-4 text-sm text-on-surface-variant">
                    Nothing here yet.
                  </div>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setCurrentThreadId(thread.id);
                        setHistoryOpen(false);
                      }}
                      className={[
                        'flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition',
                        thread.id === currentThreadId ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                      ].join(' ')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{thread.title}</div>
                        <div className="mt-1 text-xs text-on-surface-variant">
                          {thread.mode === 'solve' ? 'Solve' : 'Chat'} · {formatThreadTime(thread.updatedAt)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div ref={menuRef} className="absolute right-4 top-4 z-30 flex items-center gap-3">
          <button
            type="button"
            onClick={onQuickCreate}
            className="flex h-12 min-w-12 items-center justify-center rounded-full bg-primary px-4 text-black transition"
            aria-label="Create"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-background/80 text-on-surface-variant transition hover:text-white"
              aria-label="More"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-[20px] border border-white/10 bg-[#18191c] p-2 text-white shadow-[0_26px_70px_rgba(0,0,0,0.46)]">
                <button
                  type="button"
                  onClick={() => startFreshThread()}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-white transition hover:bg-white/[0.05]"
                >
                  <MessageSquareText className="h-4 w-4" />
                  New chat
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-white transition hover:bg-white/[0.05]"
                >
                  <Sparkles className="h-4 w-4" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={deleteCurrentThread}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-[#ff8f8f] transition hover:bg-white/[0.05]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete this chat
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {!hasConversation ? (
          <header className="flex items-center justify-center px-4 pt-11">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setMode('chat')}
                className={[
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                  mode === 'chat' ? 'bg-white/[0.06] text-white' : 'text-on-surface-variant hover:text-white',
                ].join(' ')}
              >
                <MessageSquareText className="h-4 w-4" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMode('solve')}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  mode === 'solve' ? 'bg-white/[0.06] text-white' : 'text-on-surface-variant hover:text-white',
                ].join(' ')}
              >
                Solve
              </button>
            </div>
          </header>
        ) : null}

        <div
          ref={scrollRef}
          className={[
            'flex-1 overflow-y-auto px-4 pb-44',
            hasConversation ? 'pt-20' : 'flex items-center justify-center pt-2',
          ].join(' ')}
        >
          {!hasConversation ? (
            <div className="mx-auto flex w-full max-w-[760px] -translate-y-6 flex-col items-center text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#2B2232] px-4 py-2 text-sm font-bold text-[#E0B8FF]">
                <Sparkles className="h-4 w-4" />
                {emptyTag}
              </div>
              <h1 className="max-w-[520px] text-[2rem] font-headline font-black tracking-tight text-white sm:text-[2.35rem]">
                {heading}
              </h1>
              {mode === 'chat' ? (
                <p className="mt-3 text-sm text-on-surface-variant">Just start asking any questions</p>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">Juno will solve it step by step</p>
              )}
              <div className="mt-8 w-full">{composer}</div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[860px] space-y-10">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  {message.role === 'user' ? (
                    <div className="mr-[12%] max-w-[240px] rounded-full bg-white/[0.12] px-5 py-3 text-sm font-medium text-white">
                      {message.content}
                    </div>
                  ) : (
                    <div className="ml-[10%] max-w-[640px]">
                      {message.usedModel === false ? (
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5b4730] bg-[#2b2118] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d8b185]">
                          Fallback reply
                        </div>
                      ) : null}
                      <div className="text-[1.02rem] leading-8 whitespace-pre-wrap text-white">{message.content}</div>
                      <div className="mt-4 flex items-center gap-4 text-on-surface-variant">
                        <button type="button" className="transition hover:text-white" aria-label="Copy response">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button type="button" className="transition hover:text-white" aria-label="Like response">
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button type="button" className="transition hover:text-white" aria-label="Dislike response">
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button type="button" className="transition hover:text-white" aria-label="Read aloud">
                          <AudioLines className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {submitting ? (
                <div className="flex justify-start">
                  <div className="ml-[10%] inline-flex items-center gap-3 text-sm text-on-surface-variant">
                    <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                    <span>{status ?? 'Juno is thinking...'}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {hasConversation ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(10,10,10,0.96),rgba(10,10,10,0))]" />
            <div className="sticky bottom-0 z-10 mt-auto px-4 pb-6">{composer}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function describeAction(action: AssistantAction): string {
  if (action.type === 'navigate') {
    return `Opening ${action.target}`;
  }
  if (action.type === 'open_help_topic') {
    return 'Opening Help';
  }
  if (action.type === 'open_kit') {
    return 'Opening your kit';
  }
  return 'Creating your kit';
}
