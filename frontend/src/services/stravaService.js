import axiosInstance from '../axios';
import { Native } from '../native/nativeBridge';

/**
 * Strava import client. Connecting is an OAuth hop: web navigates the page to
 * Strava; native opens the system browser (the backend redirects back to the
 * `mev2://` scheme, handled in nativeAuth.js).
 */
export const stravaService = {
    async getStatus() {
        const response = await axiosInstance.get('/strava/status');
        return response.data;
    },

    async connect() {
        const platform = Native.isNative() ? 'ios' : '';
        const response = await axiosInstance.get('/strava/connect', { params: { platform } });
        const { authorize_url } = response.data;
        if (Native.isNative()) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: authorize_url });
        } else {
            window.location.href = authorize_url;
        }
    },

    async sync() {
        const response = await axiosInstance.post('/strava/sync');
        return response.data;
    },

    async updateSettings(changes) {
        const response = await axiosInstance.patch('/strava/settings', changes);
        return response.data;
    },

    async disconnect() {
        const response = await axiosInstance.post('/strava/disconnect');
        return response.data;
    }
};

export default stravaService;
