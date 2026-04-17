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
        <h1 className="text-4xl font-black font-headline tracking-tight text-on-surface">Building your kit...</h1>
        <p className="text-on-surface-variant font-medium text-lg opacity-80">
          Snaplet is parsing your source material and generating questions now. This usually takes a few seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 w-full max-w-2xl text-left">
        <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="text-secondary w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Source parsed</span>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Your notes or file content have been accepted, cleaned up, and prepared for question generation.
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="text-primary w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Generating questions</span>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            We are turning that material into reviewable questions and will move you straight into the kit as soon as it is ready.
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-2 mt-12">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
          <span>Request status</span>
          <span>Working</span>
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
