import axiosInstance from '../axios';

/**
 * Click tracking + focus sessions API client. All routes 403 unless the
 * user's click_tracking feature flag is on - gate UI with hasClickTracking.
 */

export const hasClickTracking = (user) => Boolean(user?.feature_flags?.click_tracking);

// Clicks are derived from raw minutes, quarter-rounded for display only.
export const minutesToClicks = (minutes) => Math.round(((minutes || 0) / 60) * 4) / 4;

export const formatClicks = (minutes) => {
    const clicks = minutesToClicks(minutes);
    return Number.isInteger(clicks) ? String(clicks) : String(clicks).replace(/0+$/, '');
};

export const focusService = {
    async getState() {
        const response = await axiosInstance.get('/focus/state');
        return response.data;
    },

    async getSummary(days = 105) {
        const response = await axiosInstance.get('/focus/summary', { params: { days } });
        return response.data;
    },

    async getCategories(includeArchived = false) {
        const response = await axiosInstance.get('/focus/categories', {
            params: { include_archived: includeArchived }
        });
        return response.data;
    },

    async createCategory(category) {
        const response = await axiosInstance.post('/focus/categories', category);
        return response.data;
    },

    async updateCategory(categoryId, changes) {
        const response = await axiosInstance.patch(`/focus/categories/${categoryId}`, changes);
        return response.data;
    },

    async getActive() {
        const response = await axiosInstance.get('/focus/active');
        return response.data;
    },

    async startSession(categoryId) {
        const response = await axiosInstance.post('/focus/sessions/start', { category_id: categoryId });
        return response.data;
    },

    async pauseSession(sessionId) {
        const response = await axiosInstance.post(`/focus/sessions/${sessionId}/pause`);
        return response.data;
    },

    async resumeSession(sessionId) {
        const response = await axiosInstance.post(`/focus/sessions/${sessionId}/resume`);
        return response.data;
    },

    async addCapture(sessionId, text) {
        const response = await axiosInstance.post(`/focus/sessions/${sessionId}/capture`, { text });
        return response.data;
    },

    async stopSession(sessionId, payload = {}) {
        const response = await axiosInstance.post(`/focus/sessions/${sessionId}/stop`, payload);
        return response.data;
    },

    async logManual(payload) {
        const response = await axiosInstance.post('/focus/sessions', payload);
        return response.data;
    },

    async getSessions(date) {
        const response = await axiosInstance.get('/focus/sessions', { params: { date } });
        return response.data;
    },

    async updateSession(sessionId, changes) {
        const response = await axiosInstance.patch(`/focus/sessions/${sessionId}`, changes);
        return response.data;
    },

    async deleteSession(sessionId) {
        const response = await axiosInstance.delete(`/focus/sessions/${sessionId}`);
        return response.data;
    },

    async upsertDayNote(date, note) {
        const response = await axiosInstance.put('/focus/day-note', { date, note });
        return response.data;
    },

    async updateSettings(changes) {
        const response = await axiosInstance.patch('/focus/settings', changes);
        return response.data;
    }
};

export default focusService;
