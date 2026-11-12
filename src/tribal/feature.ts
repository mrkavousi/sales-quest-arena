/** A build-time presentation gate only; this is not authentication or authorization. */
export function isTribalEnabled(): boolean {
  return import.meta.env.VITE_TRIBAL_ENABLED === 'true';
}
