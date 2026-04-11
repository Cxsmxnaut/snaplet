import { BackendQuestion, BackendSource } from '../../../lib/api';
import { Kit, Question } from '../../../types';

function guessIcon(source: BackendSource, idx: number): string {
  const text = `${source.title} ${source.content}`.toLowerCase();
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
  masteryMap: Record<string, number>,
  lastSessionMap: Record<string, number>,
): Kit {
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
    extractionStatus: source.extractionStatus,
    questionGenerationStatus: source.questionGenerationStatus,
    questions: mapQuestions(questions),
    mastery: masteryMap[source.id] ?? 0,
    lastSession: lastSessionMap[source.id] ? new Date(lastSessionMap[source.id]) : undefined,
    cardCount: source.questionCount,
    icon: guessIcon(source, idx),
    color: guessColor(idx),
  };
}
