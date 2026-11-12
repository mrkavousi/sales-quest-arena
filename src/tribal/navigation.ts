import type { MouseEvent } from 'react';
import { navigate, type Route } from '../router';

/** Preserve normal modified-click behavior while retaining the router's embed fallback. */
export function followHash(event: MouseEvent<HTMLAnchorElement>, path: string): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(path);
}

/** The previous route is always a game route, never a Tribal route. */
export function gameRoutePath(route: Route): string {
  const base = route.name === 'arena' ? '/' : `/${route.name}`;
  return route.param ? `${base}/${encodeURIComponent(route.param)}` : base;
}
