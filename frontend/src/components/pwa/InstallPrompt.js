import React, { useCallback, useEffect, useState } from 'react';
import './InstallPrompt.css';
import { Native } from '../../native/nativeBridge';

/**
 * The PWA install moment (§9): Android/desktop Chrome get the real install
 * prompt; iOS Safari needs guided Share -> Add to Home Screen.
 */

let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        listeners.forEach((notify) => notify());
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        localStorage.setItem('pwaInstalled', '1');
        listeners.forEach((notify) => notify());
    });
}

const isIOSDevice = () =>
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !window.navigator.standalone;

// The native app is already "the whole app" — no install prompt belongs there,
// so treat it like an installed standalone PWA (suppresses every install path).
const isStandalone = () =>
    Native.isNative() ||
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

// Install UI is mobile-only. Desktop Chrome also fires beforeinstallprompt, but
// "add to home screen" isn't the experience we're selling on a laptop.
const isMobileDevice = () =>
    /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent) ||
    (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 820);

export function useInstallPrompt() {
    const [, force] = useState(0);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        const notify = () => force((n) => n + 1);
        listeners.add(notify);
        return () => listeners.delete(notify);
    }, []);

    const promptInstall = useCallback(async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            force((n) => n + 1);
        } else if (isIOSDevice()) {
            setShowIOSGuide(true);
        }
    }, []);

    return {
        canInstall: Boolean(deferredPrompt) && !isStandalone() && isMobileDevice(),
        isIOS: isIOSDevice() && !isStandalone(),
        promptInstall,
        showIOSGuide,
        closeIOSGuide: () => setShowIOSGuide(false)
    };
}

/** Slim dismissable banner for the Today view — the in-app install moment. */
export const InstallBanner = () => {
    const { canInstall, isIOS, promptInstall, showIOSGuide, closeIOSGuide } = useInstallPrompt();
    const [dismissed, setDismissed] = useState(localStorage.getItem('installBannerDismissed') === '1');

    const dismiss = () => {
        localStorage.setItem('installBannerDismissed', '1');
        setDismissed(true);
    };

    if (dismissed || isStandalone() || (!canInstall && !isIOS)) {
        return showIOSGuide ? <IOSGuide onClose={closeIOSGuide} /> : null;
    }

    return (
        <>
            <div className="install-banner">
                <span>📲 Add Me v2 to your home screen — it's the whole app, no store needed.</span>
                <div className="install-banner-actions">
                    <button className="install-yes" onClick={promptInstall}>Install</button>
                    <button className="install-no" onClick={dismiss}>Later</button>
                </div>
            </div>
            {showIOSGuide && <IOSGuide onClose={closeIOSGuide} />}
        </>
    );
};

const IOSGuide = ({ onClose }) => (
    <div className="sheet-backdrop" onClick={onClose}>
        <div className="detail-sheet ios-guide" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Install on iPhone</h3>
            <ol>
                <li>Tap the <strong>Share</strong> button <span className="ios-icon">⬆</span> in Safari's toolbar</li>
                <li>Scroll and tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong> — Me v2 opens full-screen like a real app</li>
            </ol>
            <button className="sheet-submit" onClick={onClose}>Got it</button>
        </div>
    </div>
);

export default InstallBanner;
