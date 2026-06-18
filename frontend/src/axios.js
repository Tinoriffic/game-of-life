import axios from 'axios';
import { baseUrl } from './config/apiConfig';

/**
 * Auth/session layer:
 *  1. Request interceptor attaches the token from localStorage on EVERY
 *     request.
 *  2. Token refresh is single-flight: concurrent 401s share one in-flight
 *     refresh promise instead of racing /refresh-token.
 *  3. Refresh failure clears tokens and redirects to login — never
 *     "Bearer undefined".
 *  4. A rotated refresh token (if the backend returns one) is persisted.
 */

const axiosInstance = axios.create({
    baseURL: baseUrl
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
    // Single-flight: all concurrent 401s await the same refresh.
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }
            // Use a bare axios call so a 401 here can't recurse into the interceptor.
            const response = await axios.post(`${baseUrl}/refresh-token`, {
                refresh_token: refreshToken
            });
            const { access_token, refresh_token: rotatedRefreshToken } = response.data;
            if (!access_token) {
                throw new Error('Refresh response missing access token');
            }
            localStorage.setItem('accessToken', access_token);
            if (rotatedRefreshToken) {
                localStorage.setItem('refreshToken', rotatedRefreshToken);
            }
            return access_token;
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

function clearSessionAndRedirect() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const accessToken = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Token refresh failed — clearing session:', refreshError);
                clearSessionAndRedirect();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
