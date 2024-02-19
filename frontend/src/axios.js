import axios from 'axios';
import { baseUrl } from './config/apiConfig';

const axiosInstance = axios.create({
    baseURL: baseUrl
});

axiosInstance.interceptors.response.use(response => {
    return response;
}, async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
        console.log('401 error caught in interceptor', error.response);
        originalRequest._retry = true;
        console.log('Attempting to refresh token');
        const accessToken = await refreshAccessToken();
        console.log('New access token received:', accessToken);
        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
        return axiosInstance(originalRequest);
    }
    return Promise.reject(error);
});

async function refreshAccessToken() {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('Current refresh token:', refreshToken);
        const response = await axiosInstance.post('/refresh-token', { refresh_token : refreshToken });
        const { access_token } = response.data;
        console.log("Response Data: ", response.data)
        console.log('New access token from refresh:', access_token);
        localStorage.setItem('accessToken', access_token);
        return access_token;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        // TODO: Handle token refresh failure (e.g., redirect to login)
    }
}

export default axiosInstance;
