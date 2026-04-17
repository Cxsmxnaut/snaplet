import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoveRight, PhoneCall } from 'lucide-react';

import { Button } from '@/components/ui/button';

type HeroProps = {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  badgeLabel?: string;
  titleLead?: string;
  titleWords?: string[];
  description?: string;
  secondaryLabel?: string;
  primaryLabel?: string;
};

function Hero({
  onPrimaryAction,
  onSecondaryAction,
  badgeLabel = 'Read our launch article',
  titleLead = 'Build something',
  titleWords = ['smarter', 'clearer', 'faster', 'calmer', 'better'],
  description = 'Turn notes, readings, and raw source material into study kits, review AI-generated questions, and run focused sessions that surface what still needs work.',
  secondaryLabel = 'Jump on a call',
  primaryLabel = 'Get started',
}: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => titleWords, [titleWords]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 py-20 lg:py-32">
        <div>
          <Button variant="secondary" size="sm" className="gap-4 rounded-full px-4" onClick={onSecondaryAction}>
            {badgeLabel} <MoveRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="max-w-4xl text-center font-headline text-5xl font-black tracking-[-0.06em] text-on-surface md:text-7xl">
            <span className="text-primary-strong">{titleLead}</span>
            <span className="relative flex w-full justify-center overflow-hidden pb-2 pt-2 md:pb-4">
              &nbsp;
              {titles.map((title, index) => (
                <motion.span
                  key={title}
                  className="absolute font-semibold text-on-surface"
                  initial={{ opacity: 0, y: -100 }}
                  transition={{ type: 'spring', stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? {
                          y: 0,
                          opacity: 1,
                        }
                      : {
                          y: titleNumber > index ? -150 : 150,
                          opacity: 0,
                        }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed tracking-tight text-muted-foreground md:text-xl">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="gap-4 rounded-full px-7" variant="outline" onClick={onSecondaryAction}>
            {secondaryLabel} <PhoneCall className="h-4 w-4" />
          </Button>
          <Button size="lg" className="gap-4 rounded-full px-7" onClick={onPrimaryAction}>
            {primaryLabel} <MoveRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { Hero };

type AnimatedWordProps = {
  words: string[];
  className?: string;
  suffix?: string;
  suffixClassName?: string;
};

function AnimatedWord({ words, className, suffix, suffixClassName }: AnimatedWordProps) {
  const [index, setIndex] = useState(0);
  const titles = useMemo(() => words, [words]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIndex((current) => (current === titles.length - 1 ? 0 : current + 1));
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [index, titles]);

  return (
    <span className={`relative inline-block align-baseline leading-[0.95] ${className ?? ''}`}>
      <span className="invisible block text-left">
        {titles.reduce((longest, word) => (word.length > longest.length ? word : longest), '')}
        {suffix ?? ''}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={titles[index]}
          className="absolute inset-x-0 top-0 block whitespace-nowrap text-left font-[inherit]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {titles[index]}
          {suffix ? <span className={suffixClassName}>{suffix}</span> : null}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export { AnimatedWord };
