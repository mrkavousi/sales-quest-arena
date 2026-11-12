import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

export type InstallPlatform = 'android' | 'ios' | 'other';

/** iPadOS can identify itself as a touch-capable Mac. */
export function getInstallPlatform(userAgent: string, platform: string, maxTouchPoints: number): InstallPlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) return 'ios';
  return 'other';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function supportsPwa(): boolean {
  // The file:// single-file build and the dev server deliberately have no worker/manifest.
  return import.meta.env.PROD && import.meta.env.MODE !== 'standalone' &&
    window.isSecureContext && 'serviceWorker' in navigator;
}

interface PwaContextValue {
  canInstall: boolean;
  platform: InstallPlatform;
  promptInstall: () => Promise<boolean>;
  updateAvailable: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const enabled = supportsPwa();
  const platform = getInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const [installed, setInstalled] = useState(isStandalone);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updatingRef = useRef(false);
  const hadControllerRef = useRef(enabled && !!navigator.serviceWorker.controller);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    const observed = new Map<ServiceWorker, () => void>();
    const serviceWorker = navigator.serviceWorker;
    const displayMode = window.matchMedia('(display-mode: standalone)');

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
      setHasNativePrompt(true);
    };
    const onInstalled = () => {
      promptRef.current = null;
      setHasNativePrompt(false);
      setInstalled(true);
    };
    const onDisplayModeChange = () => setInstalled(isStandalone());
    const onControllerChange = () => {
      if (updatingRef.current) {
        updatingRef.current = false;
        window.location.reload();
      } else if (hadControllerRef.current) {
        // Another tab activated the new worker: let this player reload when ready.
        setUpdateAvailable(true);
      }
      hadControllerRef.current = !!serviceWorker.controller;
    };
    const observe = (worker: ServiceWorker | null) => {
      if (!worker || observed.has(worker)) return;
      const onStateChange = () => {
        if (worker.state === 'installed' && registration?.active) setUpdateAvailable(true);
      };
      observed.set(worker, onStateChange);
      worker.addEventListener('statechange', onStateChange);
      onStateChange();
    };
    const onUpdateFound = () => observe(registration?.installing ?? null);
    const checkForUpdates = (force = false) => {
      if (!registration || !navigator.onLine || document.visibilityState !== 'visible') return;
      if (!force && Date.now() - lastCheckRef.current < 60_000) return;
      lastCheckRef.current = Date.now();
      void registration.update().catch(() => { /* Still playable using the cached version. */ });
    };
    const onVisible = () => checkForUpdates();
    const onOnline = () => checkForUpdates(true);

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (displayMode.addEventListener) displayMode.addEventListener('change', onDisplayModeChange);
    else displayMode.addListener(onDisplayModeChange);
    serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    void serviceWorker.register(new URL('./sw.js', document.baseURI), { updateViaCache: 'none' }).then((result) => {
      if (disposed) return;
      registration = result;
      registrationRef.current = result;
      lastCheckRef.current = Date.now();
      if (result.waiting && result.active) setUpdateAvailable(true);
      result.addEventListener('updatefound', onUpdateFound);
      observe(result.installing);
    }).catch(() => { /* The game still runs online if service workers are blocked. */ });

    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (displayMode.removeEventListener) displayMode.removeEventListener('change', onDisplayModeChange);
      else displayMode.removeListener(onDisplayModeChange);
      serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      registration?.removeEventListener('updatefound', onUpdateFound);
      for (const [worker, listener] of observed) worker.removeEventListener('statechange', listener);
      if (registrationRef.current === registration) registrationRef.current = null;
    };
  }, [enabled]);

  const promptInstall = useCallback(async () => {
    const event = promptRef.current;
    if (!event) return false;
    promptRef.current = null;
    setHasNativePrompt(false);
    try {
      // Called directly from the player's click, as required by Chromium.
      await event.prompt();
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    updatingRef.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);
  const dismissUpdate = useCallback(() => setUpdateAvailable(false), []);
  const canInstall = enabled && !installed && (platform !== 'other' || hasNativePrompt);
  const value = useMemo(() => ({ canInstall, platform, promptInstall, updateAvailable, applyUpdate, dismissUpdate }),
    [canInstall, platform, promptInstall, updateAvailable, applyUpdate, dismissUpdate]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext);
  if (!context) throw new Error('usePwa must be used inside <PwaProvider>');
  return context;
}
