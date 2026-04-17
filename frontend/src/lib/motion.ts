export const snapletDurations = {
  fast: 0.18,
  medium: 0.28,
} as const;

export const snapletEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const routeSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: snapletDurations.medium, ease: snapletEase },
} as const;
