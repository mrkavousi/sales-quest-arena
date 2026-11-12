import { useSyncExternalStore } from 'react';
import { isTribalEnabled } from './tribal/feature';

/**
 * Tiny hash router — enough for the MVP, zero dependencies, works on any static host.
 * The route lives in memory and is mirrored to the URL hash on a best-effort basis,
 * so the game keeps working inside sandboxed embeds where URL updates are restricted.
 */
export type RouteName = 'arena' | 'missions' | 'history' | 'profile' | 'play' | 'result' | 'tribal';

export interface Route {
  name: RouteName;
  param: string | null;
}

const NAMES: Record<string, RouteName> = {
  '': 'arena',
  missions: 'missions',
  history: 'history',
  profile: 'profile',
  play: 'play',
  result: 'result',
};

export function parseRoute(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/');
  const [first = '', second] = segments;
  // Reserve the gated namespace for the neutral overview, not a unit-detail
  // route. This also lets the game-draft guard cover unknown nested hashes.
  if (first === 'tribal' && isTribalEnabled()) {
    return { name: 'tribal', param: segments.slice(1).join('/') || null };
  }
  const name = NAMES[first] ?? 'arena';
  return { name, param: second ? decodeURIComponent(second) : null };
}

let current: Route = parseRoute(typeof window === 'undefined' ? '' : window.location.hash);
let acceptedHash = typeof window === 'undefined' ? '' : window.location.hash;
const listeners = new Set<() => void>();
const guards = new Set<(previous: Route, next: Route) => boolean>();

/** A guard may veto a transition before the current screen is unmounted. */
export function addRouteGuard(guard: (previous: Route, next: Route) => boolean): () => void {
  guards.add(guard);
  return () => { guards.delete(guard); };
}

function setCurrent(next: Route): boolean {
  if (next.name === current.name && next.param === current.param) return true;
  if ([...guards].some((guard) => !guard(current, next))) return false;
  current = next;
  window.scrollTo(0, 0);
  listeners.forEach((listener) => listener());
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (setCurrent(parseRoute(hash))) {
      acceptedHash = hash;
      return;
    }
    // The browser has already changed its URL. Restore the accepted game hash
    // without adding a history entry; the in-memory screen never changed.
    try { window.history.replaceState(null, '', acceptedHash || '#/'); } catch {
      try { window.location.hash = acceptedHash || '#/'; } catch { /* Sandboxed URL: keep the in-memory route. */ }
    }
  });
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const hash = `#${path}`;
  if (!setCurrent(parseRoute(hash))) return;
  acceptedHash = hash;
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
