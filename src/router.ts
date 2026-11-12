import { useSyncExternalStore } from 'react';

/**
 * Tiny hash router — enough for the MVP, zero dependencies, works on any static host.
 * The route lives in memory and is mirrored to the URL hash on a best-effort basis,
 * so the game keeps working inside sandboxed embeds where URL updates are restricted.
 */
export type RouteName = 'arena' | 'missions' | 'store' | 'history' | 'profile' | 'play' | 'result' | 'result-special';

export interface Route {
  name: RouteName;
  param: string | null;
}

const NAMES: Record<string, RouteName> = {
  '': 'arena',
  missions: 'missions',
  store: 'store',
  history: 'history',
  profile: 'profile',
  play: 'play',
  result: 'result',
  'result-special': 'result-special',
};

export function parseRoute(hash: string): Route {
  const [first = '', second] = hash.replace(/^#\/?/, '').split('/');
  const name = NAMES[first] ?? 'arena';
  return { name, param: second ? decodeURIComponent(second) : null };
}

let current: Route = parseRoute(typeof window === 'undefined' ? '' : window.location.hash);
const listeners = new Set<() => void>();

function setCurrent(next: Route): void {
  if (next.name === current.name && next.param === current.param) return;
  current = next;
  window.scrollTo(0, 0);
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => setCurrent(parseRoute(window.location.hash)));
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const hash = `#${path}`;
  setCurrent(parseRoute(hash));
  try {
    if (options.replace) window.history.replaceState(null, '', hash);
    else if (window.location.hash !== hash) window.location.hash = path;
  } catch {
    /* URL could not be updated (sandboxed embed) — the in-memory route still applies. */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}
