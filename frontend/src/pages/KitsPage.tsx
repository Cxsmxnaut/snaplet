import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronDown,
  Plus,
  Search,
  Zap,
  Book,
  Brain,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Kit } from '../types';
import { cn } from '../lib/utils';

interface KitsPageProps {
  kits: Kit[];
  initialSearchQuery?: string;
  onStudyKit: (id: string) => void;
  onCreateKit: () => void;
  onEditKit: (id: string) => void;
}

export const KitsPage = ({ kits, initialSearchQuery = '', onStudyKit, onCreateKit, onEditKit }: KitsPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'mastered'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'mastery' | 'title' | 'questions'>('recent');

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const filteredKits = useMemo(() => {
    return [...kits]
      .filter((kit) => {
        const matchesSearch = kit.title.toLowerCase().includes(searchQuery.toLowerCase());
        if (filter === 'mastered') return matchesSearch && kit.mastery === 100;
        if (filter === 'recent') return matchesSearch && Boolean(kit.lastSession);
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'mastery') {
          return b.mastery - a.mastery || a.title.localeCompare(b.title);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'questions') {
          return b.cardCount - a.cardCount || a.title.localeCompare(b.title);
        }

        const aTime = a.lastSession ? a.lastSession.getTime() : 0;
        const bTime = b.lastSession ? b.lastSession.getTime() : 0;
        return bTime - aTime || a.title.localeCompare(b.title);
      });
  }, [filter, kits, searchQuery, sortBy]);

  const sortLabel =
    sortBy === 'mastery'
      ? 'Mastery'
      : sortBy === 'title'
      ? 'Title'
      : sortBy === 'questions'
      ? 'Question count'
      : 'Most recent';

  return (
    <div className="knowt-page-shell">
      <header className="max-w-4xl px-1 mb-10">
        <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface">Your study kits</h1>
      </header>

      <section className="mb-8 border-b border-outline-variant/70">
        <div className="flex items-center gap-8 overflow-x-auto pb-0.5">
          <LibraryTab active={filter === 'all'} onClick={() => setFilter('all')} label="All kits" />
          <LibraryTab active={filter === 'recent'} onClick={() => setFilter('recent')} label="Recent" />
          <LibraryTab active={filter === 'mastered'} onClick={() => setFilter('mastered')} label="Mastered" />
        </div>
      </section>

      <section className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface-variant">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none rounded-full bg-surface-container-low px-4 py-2 pr-9 text-sm font-bold text-on-surface focus:outline-none"
              aria-label="Sort study kits"
            >
              <option value="recent">Most recent</option>
              <option value="mastery">Mastery</option>
              <option value="title">Title</option>
              <option value="questions">Question count</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-on-surface-variant" />
          </div>
          <span className="text-on-surface-variant/40">•</span>
          <span>{sortLabel}</span>
          <span className="text-on-surface-variant/40">•</span>
          <span>{filter === 'recent' ? 'Recent' : filter === 'mastered' ? 'Mastered' : 'All kits'}</span>
          <span>{filteredKits.length} {filteredKits.length === 1 ? 'kit' : 'kits'}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[260px] max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/55" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kits"
              className="w-full rounded-full border border-outline-variant/25 bg-surface-container-low px-11 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/45 focus:outline-none"
            />
          </div>
          <Button onClick={onCreateKit} className="rounded-full px-6 shrink-0">
            <Plus className="w-4 h-4" />
            Create kit
          </Button>
        </div>
      </section>

      {filteredKits.length === 0 ? (
        <EmptyLibraryState hasSearch={searchQuery.trim().length > 0} onCreateKit={onCreateKit} />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          {filteredKits.map((kit) => (
            <KitLibraryCard
              key={kit.id}
              kit={kit}
              onStudy={() => onStudyKit(kit.id)}
              onEdit={() => onEditKit(kit.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
};

const LibraryTab = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'relative whitespace-nowrap pb-4 text-base font-bold transition-colors',
      active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
    )}
  >
    {label}
    {active ? <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-primary" /> : null}
  </button>
);

const EmptyLibraryState = ({
  hasSearch,
  onCreateKit,
}: {
  hasSearch: boolean;
  onCreateKit: () => void;
}) => (
  <section className="min-h-[480px] rounded-[28px] bg-surface-container-low flex items-center justify-center px-8">
    <div className="text-center max-w-sm">
      <div className="mx-auto mb-8 h-28 w-28 rounded-[28px] bg-surface flex items-center justify-center ambient-shadow rotate-[-6deg]">
        <div className="h-20 w-20 rounded-[22px] bg-[#E9F6FF] rotate-[10deg] flex items-center justify-center">
          <div className="space-y-2">
            <div className="h-2 w-10 rounded-full bg-[#B5C2D8]" />
            <div className="h-2 w-14 rounded-full bg-[#E5EC57]" />
            <div className="h-2 w-8 rounded-full bg-[#2E2E38]" />
            <div className="h-2 w-12 rounded-full bg-[#D78BFF]" />
          </div>
        </div>
      </div>
      <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface mb-3">
        {hasSearch ? 'No matching kits yet' : 'You have no kits yet'}
      </h2>
      <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
        {hasSearch
          ? 'Try a different search or create a new kit from notes or a file.'
          : 'Create a kit from notes or a file and it will show up here.'}
      </p>
      <div className="flex justify-center">
        <Button className="rounded-full px-8" onClick={onCreateKit}>
          Create a kit
        </Button>
      </div>
    </div>
  </section>
);

interface KitLibraryCardProps {
  key?: string;
  kit: Kit;
  onStudy: () => void;
  onEdit: () => void;
}

function KitLibraryCard({ kit, onStudy, onEdit }: KitLibraryCardProps) {
  const Icon = kit.icon === 'science' ? Zap : kit.icon === 'translate' ? Book : Brain;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="knowt-panel bg-surface-container-low p-6 transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', kit.color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {kit.visibility === 'public' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
              <Globe2 className="w-3.5 h-3.5" />
              Public
            </span>
          ) : null}
          {kit.isAutoReview ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-secondary">
              <Sparkles className="w-3.5 h-3.5" />
              Auto Review
            </span>
          ) : null}
        </div>
        <h3 className="text-2xl font-headline font-bold tracking-tight text-on-surface mb-2 line-clamp-2">{kit.title}</h3>
        <p className="text-sm text-on-surface-variant">
          {kit.cardCount} questions
          <span className="mx-2 text-on-surface-variant/40">•</span>
          {kit.lastSession ? kit.lastSession.toLocaleDateString() : 'Ready to review'}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.16em] text-on-surface-variant mb-2">
          <span>Mastery</span>
          <span>{kit.mastery}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface">
          <div className="h-full rounded-full bg-primary" style={{ width: `${kit.mastery}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onStudy} className="rounded-full px-6 flex-1">
          Study
        </Button>
        <button
          onClick={onEdit}
          className="rounded-full px-4 py-3 bg-surface text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Review
        </button>
      </div>
    </motion.article>
  );
}
