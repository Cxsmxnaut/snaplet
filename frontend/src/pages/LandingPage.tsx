import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { CheckCircle, Zap, Brain, MousePointer2, ArrowRight, ShieldCheck } from 'lucide-react';

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [previewAnswer, setPreviewAnswer] = useState('');
  const [previewResult, setPreviewResult] = useState<null | 'correct' | 'incorrect'>(null);

  const evaluatePreviewAnswer = () => {
    const normalized = previewAnswer.trim().toLowerCase().replace(/[.!?,]/g, '');
    const accepted = new Set([
      '7',
      'seven',
      'there are 7',
      'there are seven',
      'it is 7',
      'it is seven',
      'a rainbow has 7 colors',
      'a rainbow has seven colors',
    ]);

    setPreviewResult(accepted.has(normalized) ? 'correct' : 'incorrect');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex justify-between items-center px-4 sm:px-6 lg:px-10 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-on-primary font-black">S</div>
          <span className="text-xl font-black text-primary tracking-tighter font-headline">Snaplet AI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button onClick={onGetStarted} className="hidden sm:inline text-on-surface-variant font-bold hover:text-on-surface transition-colors">Sign In</button>
          <Button onClick={onGetStarted} size="sm" className="sm:px-6 sm:py-2.5">Get Started</Button>
        </div>
      </nav>

      <main className="pt-28 pb-24 px-6 lg:px-10 max-w-7xl mx-auto">
        <section className="grid lg:grid-cols-2 gap-16 items-center mb-28">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="inline-flex self-start bg-surface-container-high px-4 py-2 rounded-full text-primary text-xs font-semibold tracking-[0.16em] uppercase">
              Optimized Learning
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-headline text-on-surface tracking-tight leading-[1.05]">
              Master Any Subject with <span className="text-primary">AI Precision</span>
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-xl leading-relaxed">
              Transform notes, documents, and source material into intelligent study kits built for active recall, precision feedback, and real retention.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={onGetStarted}>Get Started for Free</Button>
              <Button size="lg" variant="outline">View Methodology</Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50"></div>
            <div className="relative glass-panel rounded-2xl border border-outline-variant/20 overflow-hidden ambient-shadow p-8">
              <div className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                  <p className="text-xs text-primary uppercase tracking-[0.2em] font-bold">Active Session</p>
                  <h3 className="text-2xl font-headline font-bold text-on-surface">Biology: Molecular Basics</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-on-surface-variant">4 / 25 Questions</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-surface-container-high p-4 rounded-lg border border-outline-variant/10">
                  <p className="text-sm text-primary mb-2 font-bold uppercase tracking-tighter">Question</p>
                  <p className="text-on-surface font-medium mb-4">How many colors are in a rainbow?</p>
                  <div className="space-y-3">
                    <input
                      value={previewAnswer}
                      onChange={(e) => setPreviewAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          evaluatePreviewAnswer();
                        }
                      }}
                      placeholder="Type your answer (try: 7 or seven)"
                      className="w-full bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={evaluatePreviewAnswer} disabled={!previewAnswer.trim()}>
                        Check Answer
                      </Button>
                      {previewResult === 'correct' ? <p className="text-secondary text-sm font-semibold">Correct. AI verified your understanding.</p> : null}
                      {previewResult === 'incorrect' ? <p className="text-tertiary text-sm font-semibold">Not quite. Try 7 or seven.</p> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-28">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tight text-on-surface">Built for Focused Performance</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Snaplet blends editorial clarity, active recall, and intelligent curation into a workflow that feels rigorous and calm.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-primary" />}
              title="AI-Powered Kits"
              description="Turn any material—lecture notes, PDFs, or messy scribbles—into high-quality questions in seconds."
            />
            <FeatureCard 
              icon={<Brain className="text-secondary" />}
              title="Adaptive Learning"
              description="Our algorithm identifies your knowledge gaps and focuses on what you're struggling with most."
            />
            <FeatureCard 
              icon={<MousePointer2 className="text-tertiary" />}
              title="Active Recall"
              description="Master everything through typed answers and smart validation that understands context, not just keywords."
            />
          </div>
        </section>

        <section className="mt-28 rounded-[28px] gradient-primary p-12 lg:p-20 text-center text-on-primary">
          <h2 className="text-5xl md:text-6xl font-black font-headline tracking-tighter mb-8">Start Studying Smarter Today</h2>
          <p className="text-primary-container text-xl mb-12 max-w-3xl mx-auto">Create a study system that feels organized, precise, and fast enough to keep up with serious learning.</p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button onClick={onGetStarted} className="bg-white text-primary px-10 py-4 rounded-xl font-headline font-extrabold text-lg ambient-shadow">Create Your Free Account</button>
            <div className="flex items-center gap-2 text-primary-container font-medium"><ShieldCheck className="w-5 h-5" />No credit card required</div>
          </div>
        </section>

      </main>

      <footer className="bg-surface-container-low py-12 px-8 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-black text-primary font-headline">Snaplet</span>
            <p className="text-on-surface-variant text-sm">© 2026 Kinetic Intelligence Inc.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-on-surface-variant">
            <a href="/legal/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="/legal/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/legal/methodology" className="hover:text-primary transition-colors">Methodology</a>
            <a href="/legal/contact" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="group bg-surface-container-lowest p-8 rounded-2xl ghost-border hover:ambient-shadow transition-all">
    <div className="w-14 h-14 bg-surface-container-high rounded-xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-2xl font-headline font-bold mb-4">{title}</h3>
    <p className="text-on-surface-variant leading-relaxed">{description}</p>
  </div>
);
