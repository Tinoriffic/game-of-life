import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Native } from './nativeBridge';
import { baseUrl } from '../config/apiConfig';

/**
 * OAuth handoff for the native iOS wrapper.
 *
 * Google blocks its login page inside embedded WebViews, so on native we open
 * the system browser at the backend's `/login?platform=ios` (which 302s to
 * Google). The backend carries `platform` through the OAuth `state` and, at the
 * end, redirects to our custom scheme `mev2://…` instead of the web URL. iOS
 * hands that URL to us via `appUrlOpen`; we parse the tokens exactly like
 * `TokenReceiver.js` does and route into the app.
 *
 * All of this no-ops on web - `Native.isNative()` is false there, the Google
 * `<a href>` in LoginPage stays the web path, and the listener is never
 * registered.
 */

// Open the system browser to start Google login. Native only.
export const startNativeLogin = () =>
  Browser.open({ url: `${baseUrl}/login?platform=ios` });

let handoffRegistered = false;

// Register the deep-link listener once, on native only.
export const initNativeAuthHandoff = () => {
  if (!Native.isNative() || handoffRegistered) return;
  handoffRegistered = true;

  CapApp.addListener('appUrlOpen', ({ url }) => {
    // url is e.g. mev2://auth/callback?accessToken=…&refreshToken=…
    //          or mev2://user-setup?token=…
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      console.error('appUrlOpen: could not parse', url, e);
      return;
    }

    // For a custom scheme, the first path segment is the URL host.
    const route = `${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
    const params = parsed.searchParams;

    // Close the system browser now that we're back in the app.
    Browser.close().catch(() => {});

    if (route === 'auth/callback') {
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');
      if (accessToken && refreshToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        // Full reload so the user context hydrates fresh, matching TokenReceiver.
        window.location.href = '/';
      }
    } else if (route === 'user-setup') {
      const token = params.get('token');
      if (token) {
        window.location.href = `/user-setup?token=${encodeURIComponent(token)}`;
      }
    }
  });
};
