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
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-md flex justify-between items-center px-4 sm:px-6 lg:px-8 h-20 border-b border-outline-variant/5">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-2xl font-black text-primary tracking-tighter font-headline">Nimble</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button onClick={onGetStarted} className="hidden sm:inline text-on-surface-variant font-bold hover:text-on-surface transition-colors">Sign In</button>
          <Button onClick={onGetStarted} size="sm" className="sm:px-6 sm:py-2.5">Get Started</Button>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="inline-flex self-start bg-surface-container-high px-4 py-1.5 rounded-full border border-outline-variant/20">
              <span className="text-secondary text-sm font-semibold tracking-wide uppercase">New: Flashcard AI 2.0</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black font-headline text-on-surface tracking-tight leading-[1.1]">
              Study Fast.<br />Recall <span className="text-primary italic">Better.</span>
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-xl leading-relaxed">
              Paste your notes. Master them faster. The AI-powered study platform for students who want to master their material in record time.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={onGetStarted}>Get Started</Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50"></div>
            <div className="relative glass-panel rounded-xl border border-outline-variant/20 overflow-hidden deep-bloom p-8">
              <div className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Current Kit</p>
                  <h3 className="text-2xl font-headline font-bold">Molecular Biology</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-headline font-black text-secondary">88%</p>
                  <p className="text-[10px] text-on-surface-variant uppercase">Mastery</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-surface-container-high p-4 rounded-lg border border-outline-variant/10">
                  <p className="text-sm text-primary mb-2 font-bold uppercase tracking-tighter">Question 14</p>
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
                      className="w-full bg-surface-container-low p-3 rounded-lg border border-primary/40 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={evaluatePreviewAnswer} disabled={!previewAnswer.trim()}>
                        Check Answer
                      </Button>
                      {previewResult === 'correct' ? (
                        <p className="text-secondary text-sm font-semibold">Correct. Nice start.</p>
                      ) : null}
                      {previewResult === 'incorrect' ? (
                        <p className="text-tertiary text-sm font-semibold">Not quite. Try 7 or seven.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tight">Built for Performance</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              We've combined cognitive science with modern AI to build a system that adapts to your brain.
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

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 mt-40 text-center">
          <h2 className="text-5xl md:text-6xl font-black font-headline tracking-tighter mb-8 italic">Ready to master your material?</h2>
          <p className="text-on-surface-variant text-xl mb-12">Join 10,000+ students already using Nimble to ace their finals.</p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Button size="xl" onClick={onGetStarted}>Create Your First Kit</Button>
            <div className="flex items-center gap-2 text-on-surface-variant font-medium">
              <ShieldCheck className="text-secondary w-5 h-5" />
              No credit card required
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low py-12 px-8 mt-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-black text-primary font-headline">Nimble</span>
            <p className="text-on-surface-variant text-sm">© 2024 Kinetic Intelligence Inc.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-on-surface-variant">
            <a href="#/help" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#/help" className="hover:text-primary transition-colors">Terms</a>
            <a href="#/help" className="hover:text-primary transition-colors">Methodology</a>
            <a href="#/help" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="group bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 hover:bg-surface-container transition-all hover:scale-[1.02] deep-bloom">
    <div className="w-14 h-14 bg-surface-container-high rounded-xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-2xl font-headline font-bold mb-4">{title}</h3>
    <p className="text-on-surface-variant leading-relaxed">{description}</p>
  </div>
);
