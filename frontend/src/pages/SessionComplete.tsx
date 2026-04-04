import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RefreshCw, 
  Play, 
  Lightbulb
} from 'lucide-react';
import { SessionResult } from '../types';

interface SessionCompleteProps {
  result: SessionResult;
  onBack: () => void;
  onRetry: () => void;
  onNew: () => void;
}

export const SessionComplete = ({ result, onBack, onRetry, onNew }: SessionCompleteProps) => {
  const attempts = result.correctCount + result.incorrectCount;
  const weakCount = result.weakQuestions.length;

  const insight = weakCount > 0
    ? `You missed ${weakCount} item${weakCount === 1 ? '' : 's'} in this session. Run a short focused retry to lock these in.`
    : 'No weak items detected. Start a new session to keep momentum and expand coverage.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-12"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full mb-4 tracking-widest uppercase">Success</span>
          <h1 className="text-4xl md:text-6xl font-black text-on-surface tracking-tighter">Session Complete</h1>
          <p className="text-on-surface-variant mt-2 text-lg">You reached today&apos;s review milestone.</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Accuracy */}
        <div className="md:col-span-4 bg-surface-container rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border border-outline-variant/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-on-surface-variant font-bold text-sm uppercase tracking-widest mb-4">Accuracy</p>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-surface-container-highest" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                <circle 
                  className="text-secondary" 
                  cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" 
                  strokeWidth="8"
                  strokeDasharray="364.4"
                  strokeDashoffset={364.4 * (1 - result.accuracy / 100)}
                ></circle>
              </svg>
              <span className="absolute text-3xl font-black text-on-surface">{result.accuracy}%</span>
            </div>
            <p className="mt-4 text-on-surface-variant text-sm">
              This reflects your performance in this completed session.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-8 bg-surface-container rounded-2xl p-8 grid grid-cols-2 gap-8 border border-outline-variant/5">
          <div className="flex flex-col justify-center border-r border-outline-variant/20">
            <CheckCircle2 className="text-4xl text-secondary mb-2 w-10 h-10 fill-secondary/10" />
            <h3 className="text-5xl font-black text-on-surface">{result.correctCount}</h3>
            <p className="text-on-surface-variant font-bold text-sm uppercase tracking-tight">Correct Answers</p>
          </div>
          <div className="flex flex-col justify-center">
            <XCircle className="text-4xl text-tertiary mb-2 w-10 h-10 fill-tertiary/10" />
            <h3 className="text-5xl font-black text-on-surface">{result.incorrectCount}</h3>
            <p className="text-on-surface-variant font-bold text-sm uppercase tracking-tight">Incorrect Answers</p>
          </div>
          <div className="col-span-2 pt-4 border-t border-outline-variant/20">
            <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Session Summary
            </p>
            <p className="text-on-surface-variant mt-1 text-sm">
              {attempts} total responses • Duration: {result.duration}
            </p>
          </div>
        </div>

        {/* Weak Items */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <RefreshCw className="text-tertiary w-5 h-5" />
              Weak Questions for Review
            </h2>
            <span className="text-xs font-bold text-on-surface-variant/50">{result.weakQuestions.length} ITEMS REQUIRING FOCUS</span>
          </div>
          
          {weakCount === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
              <p className="text-on-surface font-semibold">No weak questions in this run.</p>
              <p className="text-on-surface-variant text-sm mt-1">Start another session to keep the streak.</p>
            </div>
          ) : (
            result.weakQuestions.map((item, i) => (
              <div key={i} className="bg-surface-container-low hover:bg-surface-container transition-all p-6 rounded-2xl border border-outline-variant/5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-tertiary/10 flex-shrink-0 flex items-center justify-center">
                    <span className="text-tertiary font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-on-surface font-semibold mb-3">{item.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-surface-container-lowest rounded-xl text-xs border border-error/20">
                        <span className="block text-error font-bold uppercase mb-1">Your Answer</span>
                        {item.userAnswer}
                      </div>
                      <div className="p-3 bg-secondary/5 rounded-xl text-xs border border-secondary/20">
                        <span className="block text-secondary font-bold uppercase mb-1">Correct Answer</span>
                        {item.correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="md:col-span-4">
          <div className="bg-surface-container-high rounded-2xl p-8 sticky top-28 border border-outline-variant/10">
            <h3 className="text-xl font-bold mb-6">Next Steps</h3>
            <div className="space-y-4">
              <Button className="w-full py-4" onClick={onRetry}>
                <RefreshCw className="w-5 h-5" />
                Retry Weak Items
              </Button>
              <Button variant="outline" className="w-full py-4" onClick={onNew}>
                <Play className="w-5 h-5" />
                Start New Session
              </Button>
            </div>
            <div className="mt-8 pt-8 border-t border-outline-variant/10">
              <p className="text-sm text-on-surface-variant italic leading-relaxed">
                Repetition turns weak recall into automatic recall.
              </p>
            </div>
            <div className="mt-8 p-4 bg-tertiary/10 rounded-xl border border-tertiary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="text-tertiary w-5 h-5" />
                <div>
                  <h4 className="text-tertiary font-bold text-sm">Flow Insight</h4>
                  <p className="text-xs text-on-surface-variant mt-1">{insight}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
