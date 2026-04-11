import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import {
  Play,
  Edit3,
  Trash2,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { Kit } from '../types';

interface ReviewKitProps {
  kit: Kit;
  onStart: () => void;
  onStartRapid: () => void;
  onBack: () => void;
  onDelete: () => void;
  onUpdateQuestion: (questionId: string, question: string, answer: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
}

export const ReviewKit = ({
  kit,
  onStart,
  onStartRapid,
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
  const [itemError, setItemError] = useState<string | null>(null);
  const mastery = Math.max(0, Math.min(100, kit.mastery));
  const estimatedMinutes = localQuestions.length === 0 ? 0 : Math.max(1, Math.round(localQuestions.length * 0.75));
  const needsAttentionUpload = kit.kind !== 'paste' && kit.extractionStatus === 'needs_attention';
  const failedUpload = kit.kind !== 'paste' && kit.extractionStatus === 'failed';
  const generationFailed = kit.questionGenerationStatus === 'failed';

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

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-primary tracking-widest uppercase">AI Generated</span>
          </div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface mb-3 tracking-tight">{kit.title}</h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">Review the AI's interpretations before finalizing your study deck.</p>
        </div>
        <div className="flex gap-4">
              <Button variant="outline" onClick={onDelete} className="text-error border-error/20 hover:bg-error/10">
            <Trash2 className="w-5 h-5" />
            Delete Kit
          </Button>
              <Button size="lg" onClick={onStart} disabled={localQuestions.length === 0}>
            <Play className="w-5 h-5" />
            Start Study Session
              </Button>
            </div>
          </header>
          {itemError ? (
            <div className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{itemError}</div>
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

          <div className="bg-primary rounded-2xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-headline font-bold text-sm mb-2 text-on-primary">Rapid Mode</h4>
              <p className="text-xs text-on-primary/70 mb-4 leading-relaxed">Feeling confident? Enable Rapid Mode to reduce display time by 40%.</p>
              <button
                onClick={onStartRapid}
                disabled={localQuestions.length === 0}
                className="bg-surface/80 border border-outline-variant/20 text-on-surface text-[10px] font-bold py-2 px-4 rounded-full hover:bg-surface transition-colors"
              >
                ENABLE NOW
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform">
              <Zap className="w-24 h-24 rotate-12" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
