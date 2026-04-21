import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import {
  Play,
  Edit3,
  Trash2,
  ArrowLeft,
  Zap,
  RefreshCw,
  Globe2,
  Copy,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Kit } from '../types';
import { BackendActiveSourceSession } from '../lib/api';

interface ReviewKitProps {
  kit: Kit;
  onStart: () => void;
  onStartRapid: () => void;
  onRegenerate: () => Promise<void> | void;
  onToggleVisibility: (visibility: 'private' | 'public') => Promise<void> | void;
  activeSession: BackendActiveSourceSession | null;
  activeSessionLoading: boolean;
  onResumeSession: () => void;
  onBack: () => void;
  onDelete: () => void;
  onUpdateQuestion: (questionId: string, question: string, answer: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
}

export const ReviewKit = ({
  kit,
  onStart,
  onStartRapid,
  onRegenerate,
  onToggleVisibility,
  activeSession,
  activeSessionLoading,
  onResumeSession,
  onBack,
  onDelete,
  onUpdateQuestion,
  onDeleteQuestion,
}: ReviewKitProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '' });
  const [localQuestions, setLocalQuestions] = useState(kit.questions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const mastery = Math.max(0, Math.min(100, kit.mastery));
  const estimatedMinutes = localQuestions.length === 0 ? 0 : Math.max(1, Math.round(localQuestions.length * 0.75));
  const needsAttentionUpload = kit.kind !== 'paste' && kit.extractionStatus === 'needs_attention';
  const failedUpload = kit.kind !== 'paste' && kit.extractionStatus === 'failed';
  const generationFailed = kit.questionGenerationStatus === 'failed';
  const sharedUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/shared/${kit.id}`;
  const studyActionsDisabled = localQuestions.length === 0 || activeSessionLoading;

  const emptyState = (() => {
    if (failedUpload) {
      return {
        label: 'Import failed',
        title: 'We could not read enough from this file.',
        body:
          'This upload did not produce readable study material. Try a cleaner PDF or DOCX, upload a smaller file, or paste the text directly into a new kit.',
      };
    }

    if (needsAttentionUpload) {
      return {
        label: 'Needs attention',
        title: 'This file imported, but the extracted text looks weak.',
        body:
          'Snaplet pulled in some text, but it may be incomplete or noisy. You can still review what was generated, or go back and paste cleaner notes for a stronger result.',
      };
    }

    if (generationFailed) {
      return {
        label: 'Generation failed',
        title: 'No questions are ready for review yet.',
        body:
          'This kit has source content, but the current generation pass did not produce usable questions. Try editing the source or regenerating from clearer notes.',
      };
    }

    return {
      label: 'Generation needed',
      title: 'No questions are ready for review yet.',
      body:
        'This kit exists, but it does not have any active questions yet. Go back to your kits, edit the source material, or regenerate from clearer notes before starting a session.',
    };
  })();

  useEffect(() => {
    setLocalQuestions(kit.questions);
  }, [kit]);

  const handleEdit = (q: { id: string; question: string; answer: string }) => {
    setEditingId(q.id);
    setEditForm({ question: q.question, answer: q.answer });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSavingId(editingId);
    setItemError(null);
    try {
      await onUpdateQuestion(editingId, editForm.question, editForm.answer);
      setLocalQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                question: editForm.question,
                answer: editForm.answer,
              }
            : q,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question from the kit?')) {
      return;
    }

    setDeletingId(id);
    setItemError(null);
    try {
      await onDeleteQuestion(id);
      setLocalQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to delete question.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setItemError(null);
    try {
      await onRegenerate();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to regenerate questions.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleVisibility = async (visibility: 'private' | 'public') => {
    if (visibility === kit.visibility) {
      return;
    }

    setVisibilityUpdating(true);
    setItemError(null);
    try {
      await onToggleVisibility(visibility);
      setShareFeedback(visibility === 'public' ? 'Share page is live now.' : 'This kit is private again.');
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to update visibility.');
    } finally {
      setVisibilityUpdating(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!sharedUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sharedUrl);
      setShareFeedback('Public share link copied.');
    } catch {
      setShareFeedback('Copy failed. You can still open the public page directly.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-primary tracking-widest uppercase">AI Generated</span>
            {kit.isAutoReview ? (
              <span className="px-3 py-1 bg-secondary/14 rounded-full text-xs font-bold text-secondary tracking-widest uppercase">
                Auto Review
              </span>
            ) : null}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${
                kit.visibility === 'public'
                  ? 'bg-primary/12 text-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {kit.visibility}
            </span>
          </div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface mb-3 tracking-tight">{kit.title}</h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Review the questions, make quick fixes if needed, then start studying.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeSession ? (
            <>
              <Button variant="outline" onClick={onStart} disabled={localQuestions.length === 0} className="border-outline-variant/20">
                Start fresh
              </Button>
              <Button size="lg" onClick={onResumeSession}>
                <RefreshCw className="w-4 h-4" />
                Resume study
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={onStart} disabled={studyActionsDisabled}>
              <Play className="w-5 h-5" />
              {activeSessionLoading ? 'Checking session...' : 'Start studying'}
            </Button>
          )}
          <Button variant="outline" onClick={() => { void handleRegenerate(); }} disabled={regenerating} className="border-outline-variant/20">
            <RotateCcw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </header>
      {itemError ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{itemError}</div>
      ) : null}
      {shareFeedback ? (
        <div className="rounded-xl border border-primary/20 bg-primary/8 p-3 text-sm text-primary">{shareFeedback}</div>
      ) : null}

      {needsAttentionUpload && localQuestions.length > 0 ? (
        <div className="rounded-2xl border border-tertiary/20 bg-tertiary/8 px-6 py-5 flex flex-col gap-2">
          <span className="inline-flex w-fit px-3 py-1 rounded-full bg-tertiary/14 text-tertiary text-[10px] font-bold uppercase tracking-widest">
            Needs attention
          </span>
          <h3 className="text-lg font-headline font-bold text-on-surface">This upload produced questions, but the extracted text may be imperfect.</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl">
            Review these questions carefully before studying. If the wording feels noisy or incomplete, go back and paste cleaner notes
            or upload a clearer source file.
          </p>
        </div>
      ) : null}

      {kit.isAutoReview ? (
        <div className="rounded-2xl border border-secondary/20 bg-secondary/8 px-6 py-5 flex flex-col gap-2">
          <span className="inline-flex w-fit px-3 py-1 rounded-full bg-secondary/14 text-secondary text-[10px] font-bold uppercase tracking-widest">
            Auto Review queue
          </span>
          <h3 className="text-lg font-headline font-bold text-on-surface">This kit was generated from missed or weaker questions.</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl">
            Snaplet created this review queue so you can revisit pressure points faster. It behaves like a normal kit now, but it is system-generated from your study history.
          </p>
        </div>
      ) : null}

      {activeSession ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/8 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex px-3 py-1 rounded-full bg-primary/14 text-primary text-[10px] font-bold uppercase tracking-widest">
              Session in progress
            </span>
            <h3 className="mt-3 text-lg font-headline font-bold text-on-surface">
              You already have a live {activeSession.mode.replace('_', ' ')} session for this kit.
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              {activeSession.answeredCount} answered of {activeSession.questionCap}
              {activeSession.currentPosition ? ` • next question ${activeSession.currentPosition}` : ''}
              {activeSession.pendingRetry ? ' • retry waiting' : ''}
            </p>
          </div>
          <Button onClick={onResumeSession} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
            Resume Session
          </Button>
        </div>
      ) : activeSessionLoading ? (
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container px-6 py-5 text-sm text-on-surface-variant">
          Checking for an in-progress session...
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {localQuestions.length === 0 ? (
            <div className="rounded-2xl bg-surface-container p-8 border border-outline-variant/10 space-y-4">
              <span className="inline-flex px-3 py-1 rounded-full bg-tertiary/12 text-tertiary text-xs font-bold uppercase tracking-widest">
                {emptyState.label}
              </span>
              <h3 className="text-2xl font-headline font-bold text-on-surface">{emptyState.title}</h3>
              <p className="text-on-surface-variant leading-relaxed max-w-2xl">
                {emptyState.body}
              </p>
            </div>
          ) : localQuestions.map((q, i) => (
            <div key={q.id} className="group bg-surface-container rounded-2xl p-8 transition-all hover:bg-surface-container-high border border-outline-variant/5 flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded tracking-tighter uppercase">Question {i + 1}</span>
                  <span className="h-1 w-1 rounded-full bg-outline-variant"></span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{q.category}</span>
                </div>

                {editingId === q.id ? (
                  <div className="space-y-4">
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-on-surface focus:ring-2 focus:ring-primary/40"
                      value={editForm.question}
                      onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                    />
                    <textarea
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-on-surface focus:ring-2 focus:ring-primary/40 min-h-[100px]"
                      value={editForm.answer}
                      onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { void handleSaveEdit(); }} disabled={savingId === q.id}>
                        {savingId === q.id ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={savingId === q.id}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-headline font-bold text-on-surface mb-6">{q.question}</h3>
                    <div className="bg-surface-container-low rounded-xl p-6">
                      <p className="text-on-surface-variant leading-relaxed">{q.answer}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex md:flex-col justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(q)}
                    disabled={Boolean(savingId || deletingId)}
                    className="p-3 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                  >
                  <Edit3 className="w-5 h-5" />
                </button>
                  <button
                    onClick={() => { void handleDeleteQuestion(q.id); }}
                    disabled={Boolean(savingId || deletingId)}
                    className="p-3 bg-surface-container-lowest text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-all"
                  >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-primary/8 rounded-2xl p-6 border border-primary/20">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-3">Next step</p>
            <h4 className="font-headline font-bold text-xl text-on-surface mb-2">
              {activeSession ? 'Pick up where you left off' : 'Start a study session'}
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
              {activeSession
                ? 'You already have a live session for this kit. Resume it to keep your place, or start a fresh run if you want a reset.'
                : 'Use the main start button for the guided mode picker, or jump straight into a fast drill when you want the quickest start.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {activeSession ? (
                <>
                  <Button onClick={onResumeSession}>
                    <RefreshCw className="w-4 h-4" />
                    Resume study
                  </Button>
                  <Button variant="outline" onClick={onStart} disabled={activeSessionLoading} className="border-outline-variant/20">
                    Start fresh
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={onStart} disabled={studyActionsDisabled}>
                    <Play className="w-4 h-4" />
                    {activeSessionLoading ? 'Checking session...' : 'Choose study mode'}
                  </Button>
                  <Button variant="outline" onClick={onStartRapid} disabled={studyActionsDisabled} className="border-outline-variant/20">
                    <Zap className="w-4 h-4" />
                    Fast drill now
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/5">
            <h4 className="font-headline font-bold text-sm mb-4 tracking-wider text-on-surface-variant uppercase">Visibility</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => { void handleToggleVisibility('private'); }}
                disabled={visibilityUpdating}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  kit.visibility === 'private'
                    ? 'border-on-surface bg-surface text-on-surface'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <p className="text-sm font-bold">Private</p>
                <p className="text-xs mt-1">Only visible inside your account.</p>
              </button>
              <button
                type="button"
                onClick={() => { void handleToggleVisibility('public'); }}
                disabled={visibilityUpdating}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  kit.visibility === 'public'
                    ? 'border-primary bg-primary/8 text-on-surface'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <p className="text-sm font-bold inline-flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Public
                </p>
                <p className="text-xs mt-1">Read-only share page anyone can open.</p>
              </button>
            </div>

            {kit.visibility === 'public' ? (
              <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  Share page live
                </div>
                <p className="text-sm text-on-surface-variant break-all">{sharedUrl}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { void handleCopyShareLink(); }}>
                    <Copy className="w-4 h-4" />
                    Copy link
                  </Button>
                  <a
                    href={sharedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-surface px-4 py-2 text-sm font-bold text-on-surface"
                  >
                    Open share page
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Keep this private while you tune the questions, then switch it public when you want a read-only share page.
              </p>
            )}
          </div>

          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/5">
            <h4 className="font-headline font-bold text-sm mb-4 tracking-wider text-on-surface-variant uppercase">Kit Performance</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-on-surface-variant">Current Mastery</span>
                  <span className="text-secondary">{mastery}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${mastery}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase mb-1">Items</p>
                  <p className="text-xl font-headline font-black text-on-surface">{localQuestions.length}</p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase mb-1">Time Est.</p>
                  <p className="text-xl font-headline font-black text-on-surface">{estimatedMinutes}m</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm tracking-wider text-on-surface uppercase mb-2">Refresh this kit</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                  Regeneration reruns question creation from the saved source material. Use it after cleaning notes or when the first pass feels too weak.
                </p>
                <Button variant="outline" size="sm" onClick={() => { void handleRegenerate(); }} disabled={regenerating}>
                  <RotateCcw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Refreshing...' : 'Regenerate questions'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-6 border border-error/10">
            <h4 className="font-headline font-bold text-sm tracking-wider text-on-surface uppercase mb-2">Danger zone</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
              Delete this kit only if you are done with its questions and history.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('Delete this kit and its study history? This cannot be undone.')) {
                  onDelete();
                }
              }}
              className="text-error border-error/20 hover:bg-error/10"
            >
              <Trash2 className="w-5 h-5" />
              Delete kit
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};
