import { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll, useSpring } from 'framer-motion';

const STEP_BREAKPOINTS = [0.18, 0.4, 0.62, 0.82];

function getActiveStep(progress: number) {
  if (progress < STEP_BREAKPOINTS[0]) {
    return 0;
  }
  if (progress < STEP_BREAKPOINTS[1]) {
    return 1;
  }
  if (progress < STEP_BREAKPOINTS[2]) {
    return 2;
  }
  if (progress < STEP_BREAKPOINTS[3]) {
    return 3;
  }
  return 4;
}

export function useScrollStory() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.36,
  });

  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(progress, 'change', (value) => {
    setActiveStep(getActiveStep(value));
  });

  return { ref, progress, activeStep };
}
