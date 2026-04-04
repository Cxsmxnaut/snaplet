import { motion } from 'motion/react';
import { Brain, CheckCircle2, Loader2 } from 'lucide-react';

export const Processing = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-16">
        <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="text-primary w-10 h-10" />
        </div>
        <div className="absolute -inset-4 border border-primary/20 rounded-full animate-pulse"></div>
      </div>

      <div className="space-y-3 max-w-lg">
        <h1 className="text-4xl font-black font-headline tracking-tight text-on-surface">Analyzing your material...</h1>
        <p className="text-on-surface-variant font-medium text-lg opacity-80">Generating high-fidelity active recall questions...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 w-full max-w-2xl text-left">
        <div className="bg-surface-container-low p-6 rounded-2xl deep-bloom border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="text-secondary w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Phase 1 Complete</span>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">Parsing semantic structure and identifying key conceptual anchors from your source files.</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl deep-bloom border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="text-primary w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Phase 2 Active</span>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">Applying intelligence layers to craft high-fidelity active recall challenges and study kits.</p>
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-2 mt-12">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
          <span>Processing</span>
          <span>In progress</span>
        </div>
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: ['20%', '80%', '30%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_12px_rgba(78,222,163,0.3)]"
          />
        </div>
      </div>
    </div>
  );
};
