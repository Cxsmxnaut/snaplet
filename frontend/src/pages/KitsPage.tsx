import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Plus, 
  Zap, 
  Book, 
  Brain, 
  Edit3,
  Filter
} from 'lucide-react';
import { Button } from '../components/Button';
import { Kit } from '../types';
import { cn } from '../lib/utils';

interface KitsPageProps {
  kits: Kit[];
  onStudyKit: (id: string) => void;
  onCreateKit: () => void;
  onEditKit: (id: string) => void;
}

export const KitsPage = ({ kits, onStudyKit, onCreateKit, onEditKit }: KitsPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'mastered'>('all');

  const filteredKits = [...kits]
    .filter((kit) => {
      const matchesSearch = kit.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'mastered') return matchesSearch && kit.mastery === 100;
      if (filter === 'recent') return matchesSearch && Boolean(kit.lastSession);
      return matchesSearch;
    })
    .sort((a, b) => {
      if (filter === 'recent') {
        const aTime = a.lastSession ? a.lastSession.getTime() : 0;
        const bTime = b.lastSession ? b.lastSession.getTime() : 0;
        return bTime - aTime;
      }
      return 0;
    });

  const recommendation = (() => {
    const candidates = [...kits].sort((a, b) => a.mastery - b.mastery);
    const target = candidates[0];
    if (!target) {
      return null;
    }

    const text = `${target.title} ${target.description}`.toLowerCase();
    const topic = text.includes('spanish')
      ? 'Spanish'
      : text.includes('chem') || text.includes('bio') || text.includes('physics') || text.includes('science')
      ? 'Science'
      : text.includes('math') || text.includes('algebra') || text.includes('calculus')
      ? 'Math'
      : text.includes('history')
      ? 'History'
      : 'General';

    return {
      kitId: target.id,
      topic,
      title: `Strengthen ${topic} with a focused review kit`,
      description: `This recommendation is based on your lowest-mastery kit: ${target.title}.`,
      cta: 'Open Kit',
    };
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface">My Kits</h2>
            <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-primary">
              {kits.length} Kits
            </span>
          </div>
          <div className="relative group max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors w-5 h-5" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border-none text-on-surface rounded-full py-4 pl-12 pr-6 focus:ring-2 focus:ring-primary/40 text-sm transition-all placeholder:text-on-surface-variant/30"
              placeholder="Search your kits..."
            />
          </div>
        </div>
        <div className="flex items-center">
          <Button onClick={onCreateKit} className="rounded-full px-8">
            <Plus className="w-5 h-5" />
            New Kit
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section className="flex items-center gap-3">
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
          label="All"
        />
        <FilterButton 
          active={filter === 'recent'} 
          onClick={() => setFilter('recent')}
          label="Recent"
        />
        <FilterButton 
          active={filter === 'mastered'} 
          onClick={() => setFilter('mastered')}
          label="Mastered"
        />
      </section>

      {/* Kits Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredKits.map((kit) => (
          <KitCard 
            key={kit.id} 
            kit={kit} 
            onStudy={() => onStudyKit(kit.id)}
            onEdit={() => onEditKit(kit.id)}
          />
        ))}

        {/* Create New Empty State */}
        <button 
          onClick={onCreateKit}
          className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/20 rounded-2xl p-8 hover:border-primary/50 hover:bg-surface-container-low transition-all duration-300 flex flex-col items-center justify-center text-center group min-h-[280px]"
        >
          <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center mb-4 text-on-surface-variant/50 group-hover:text-primary group-hover:scale-110 transition-all">
            <Plus className="w-8 h-8" />
          </div>
          <p className="font-headline font-bold text-on-surface-variant/50 group-hover:text-on-surface transition-colors">Create New Kit</p>
        </button>
      </section>

      {/* Recommended Section */}
      <section className="bg-surface-container-low rounded-3xl p-10 flex flex-col md:flex-row items-center gap-12 border border-outline-variant/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
        <div className="flex-1 relative z-10">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4 block">Recommended for you</span>
          <h3 className="text-4xl font-headline font-black text-on-surface mb-6 leading-tight">
            {recommendation?.title ?? 'Create your first focused review kit'}
          </h3>
          <p className="text-on-surface-variant text-lg mb-8 leading-relaxed max-w-xl">
            {recommendation?.description ?? 'Once you have kits, recommendations will adapt by topic and mastery.'}
          </p>
          <Button
            size="lg"
            className="rounded-full px-10"
            onClick={() => {
              if (recommendation?.kitId) {
                onEditKit(recommendation.kitId);
                return;
              }
              onCreateKit();
            }}
          >
            {recommendation?.cta ?? 'Create Kit'}
          </Button>
        </div>
        <div className="w-full md:w-5/12 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative group border border-outline-variant/20">
          <img 
            className="w-full h-full object-cover opacity-60" 
            src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=800" 
            alt="Study workspace"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
        </div>
      </section>
    </div>
  );
};

const FilterButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-8 py-2.5 rounded-full text-sm font-bold transition-all border",
      active 
        ? "bg-primary/20 text-primary border-primary/30" 
        : "text-on-surface-variant hover:text-on-surface border-transparent hover:bg-surface-container-high"
    )}
  >
    {label}
  </button>
);

const KitCard = ({ kit, onStudy, onEdit }: { kit: Kit; onStudy: () => void; onEdit: () => void; key?: string | number }) => {
  const Icon = kit.icon === 'science' ? Zap : kit.icon === 'translate' ? Book : Brain;
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-surface-container-low rounded-2xl p-6 hover:bg-surface-container-high transition-all duration-300 flex flex-col group border border-outline-variant/5 shadow-sm"
    >
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-5", kit.color)}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-xl font-headline font-bold mb-1 text-on-surface group-hover:text-primary transition-colors line-clamp-1">{kit.title}</h4>
      <p className="text-xs text-on-surface-variant font-medium mb-8">
        {kit.cardCount} Questions • {kit.lastSession ? kit.lastSession.toLocaleDateString() : 'No sessions yet'}
      </p>
      
      <div className="mb-8 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary">
          <span>Mastery</span>
          <span>{kit.mastery}%</span>
        </div>
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${kit.mastery}%` }}
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
          />
        </div>
      </div>

      <div className="mt-auto flex gap-3">
        <button 
          onClick={onStudy}
          className={cn(
            "flex-1 py-3 px-4 rounded-full font-bold text-sm transition-all",
            kit.mastery === 100 
              ? "bg-secondary text-on-secondary hover:brightness-110" 
              : "bg-surface-container-highest text-on-surface hover:bg-primary hover:text-on-primary"
          )}
        >
          {kit.mastery === 100 ? 'Mastered' : 'Study Now'}
        </button>
        <button 
          onClick={onEdit}
          className="p-3 bg-surface-container-highest rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all border border-outline-variant/10"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
