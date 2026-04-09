import { StudyMode } from '../../../lib/api';

export const APP_TAB_PATHS: Record<string, string> = {
  dashboard: '/app/dashboard',
  kits: '/app/kits',
  progress: '/app/progress',
  help: '/app/help',
  settings: '/app/settings',
  create: '/app/create',
  processing: '/app/create/processing',
};

export type AppView = 'landing' | 'auth' | 'app';

export type AppRoute = {
  view: AppView;
  tab: string;
  kitId: string | null;
  sessionId: string | null;
};

export function deriveRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '') {
    return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
  }
  if (pathname === '/auth') {
    return { view: 'auth', tab: 'dashboard', kitId: null, sessionId: null };
  }
  if (pathname.startsWith('/legal/')) {
    return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
  }

  const reviewMatch = pathname.match(/^\/app\/kits\/([^/]+)\/review$/);
  if (reviewMatch) {
    return { view: 'app', tab: 'review', kitId: reviewMatch[1], sessionId: null };
  }

  const modeMatch = pathname.match(/^\/app\/kits\/([^/]+)\/study-mode$/);
  if (modeMatch) {
    return { view: 'app', tab: 'study-mode', kitId: modeMatch[1], sessionId: null };
  }

  const studyMatch = pathname.match(/^\/app\/kits\/([^/]+)\/study$/);
  if (studyMatch) {
    return { view: 'app', tab: 'study', kitId: studyMatch[1], sessionId: null };
  }

  const completeMatch = pathname.match(/^\/app\/session\/([^/]+)\/complete$/);
  if (completeMatch) {
    return { view: 'app', tab: 'complete', kitId: null, sessionId: completeMatch[1] };
  }

  const staticTab = Object.entries(APP_TAB_PATHS).find(([, value]) => value === pathname)?.[0] ?? null;
  if (staticTab) {
    return { view: 'app', tab: staticTab, kitId: null, sessionId: null };
  }

  return { view: 'landing', tab: 'dashboard', kitId: null, sessionId: null };
}

export function buildAppPath(tab: string, kitId: string | null, sessionId: string | null, mode: StudyMode): string {
  if (tab === 'review' && kitId) {
    return `/app/kits/${kitId}/review`;
  }
  if (tab === 'study-mode' && kitId) {
    return `/app/kits/${kitId}/study-mode`;
  }
  if (tab === 'study' && kitId) {
    return `/app/kits/${kitId}/study?mode=${mode}`;
  }
  if (tab === 'complete' && sessionId) {
    return `/app/session/${sessionId}/complete`;
  }
  return APP_TAB_PATHS[tab] ?? '/app/dashboard';
}
