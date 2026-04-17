import { BackendQuestion, BackendSource } from '../../../lib/api';
import { ProgressData } from '../../../types';
import { Kit, Question } from '../../../types';

function guessIcon(source: BackendSource, idx: number): string {
  const text = `${source.title} ${source.kind}`.toLowerCase();
  if (text.includes('spanish') || text.includes('vocab') || text.includes('language')) return 'translate';
  if (text.includes('chem') || text.includes('biology') || text.includes('physics')) return 'science';
  return idx % 2 === 0 ? 'auto_awesome' : 'book';
}

function guessColor(idx: number): string {
  const colors = [
    'bg-orange-500/20 text-orange-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-primary/20 text-primary',
    'bg-secondary/20 text-secondary',
  ];
  return colors[idx % colors.length];
}

function isAutoReviewSource(source: BackendSource): boolean {
  return source.title.startsWith('Auto Review ·');
}

function mapQuestions(questions: BackendQuestion[]): Question[] {
  return questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    answer: q.answer,
    category: 'General',
  }));
}

export function mapSourceToKit(
  source: BackendSource,
  questions: BackendQuestion[],
  idx: number,
  progress: ProgressData | null,
): Kit {
  const breakdown = progress?.kitBreakdown.find((item) => item.sourceId === source.id) ?? null;
  const statusLabel =
    source.questionGenerationStatus === 'ready'
      ? `${source.questionCount} questions ready`
      : source.extractionStatus === 'needs_attention'
      ? 'extraction needs attention'
      : source.extractionStatus === 'failed'
      ? 'import failed'
      : source.questionGenerationStatus;

  return {
    id: source.id,
    title: source.title,
    description: `Type: ${source.kind.toUpperCase()} • ${statusLabel}`,
    kind: source.kind,
    visibility: source.visibility,
    extractionStatus: source.extractionStatus,
    questionGenerationStatus: source.questionGenerationStatus,
    questions: mapQuestions(questions),
    mastery: breakdown?.mastery ?? 0,
    lastSession: breakdown?.lastStudiedAt ? new Date(breakdown.lastStudiedAt) : undefined,
    cardCount: source.questionCount,
    icon: guessIcon(source, idx),
    color: guessColor(idx),
    isAutoReview: isAutoReviewSource(source),
  };
}
