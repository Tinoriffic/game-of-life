import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Native } from '../native/nativeBridge';

/**
 * Runs `onActive` whenever the app comes back to the foreground.
 *
 * The native wrapper is a long-lived WKWebView pointed at the deployed site, so
 * React only mounts once and would otherwise show whatever state it was frozen
 * at when backgrounded (a stale day, or a stuck "Loading…" if a fetch was
 * dropped). This covers both surfaces:
 *   - native: Capacitor `appStateChange` (app resumed from background)
 *   - web / PWA: `visibilitychange` (tab became visible again)
 *
 * Some resumes fire both events, so identical wakes within `debounceMs` are
 * coalesced into one call. In-app sheets/modals don't hide the page or
 * background the app, so they never trigger a refresh.
 */
export function useForegroundRefresh(onActive, { debounceMs = 2000 } = {}) {
    const cbRef = useRef(onActive);
    cbRef.current = onActive;

    useEffect(() => {
        let lastRun = 0;
        const fire = () => {
            const now = Date.now();
            if (now - lastRun < debounceMs) return;
            lastRun = now;
            cbRef.current();
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') fire();
        };
        document.addEventListener('visibilitychange', onVisibility);

        let listener = null;
        if (Native.isNative()) {
            listener = CapApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) fire();
            });
        }

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            if (listener) listener.then((h) => h.remove()).catch(() => {});
        };
    }, [debounceMs]);
}

export default useForegroundRefresh;
