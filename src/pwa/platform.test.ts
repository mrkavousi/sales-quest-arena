import { describe, expect, it } from 'vitest';
import { getInstallPlatform } from './PwaContext';

describe('install platform guidance', () => {
  it('recognizes Android browsers', () => {
    expect(getInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/149 Mobile', 'Linux armv8l', 5)).toBe('android');
  });
  it('recognizes iPhone and iPad, including desktop-mode iPadOS', () => {
    expect(getInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5)).toBe('ios');
    expect(getInstallPlatform('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'iPad', 5)).toBe('ios');
    expect(getInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe('ios');
  });
  it('does not mistake an ordinary Mac or desktop for an iPad', () => {
    expect(getInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0)).toBe('other');
    expect(getInstallPlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0)).toBe('other');
  });
});
