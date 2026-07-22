import axiosInstance from '../axios';

const QUEUE_KEY = 'pendingHabitLogs';

/**
 * Habit API client + a small offline log queue: a failed (network) log is
 * stored locally and retried quietly — the tap always "works". The backend
 * is idempotent per habit+date, so retries are safe.
 */
export const habitService = {
    async getBuckets() {
        const response = await axiosInstance.get('/buckets');
        return response.data;
    },

    async getToday() {
        const response = await axiosInstance.get('/today');
        return response.data;
    },

    async getHabits(includeArchived = false) {
        const response = await axiosInstance.get('/habits', {
            params: { include_archived: includeArchived }
        });
        return response.data;
    },

    async getSlots() {
        const response = await axiosInstance.get('/habits/slots');
        return response.data;
    },

    async createHabit(habit) {
        const response = await axiosInstance.post('/habits', habit);
        return response.data;
    },

    async updateHabit(habitId, changes) {
        const response = await axiosInstance.patch(`/habits/${habitId}`, changes);
        return response.data;
    },

    async archiveHabit(habitId) {
        const response = await axiosInstance.post(`/habits/${habitId}/archive`);
        return response.data;
    },

    async reorderHabits(orderedIds) {
        const response = await axiosInstance.post('/habits/reorder', { ordered_ids: orderedIds });
        return response.data;
    },

    async restoreHabit(habitId) {
        const response = await axiosInstance.post(`/habits/${habitId}/restore`);
        return response.data;
    },

    async logHabit(habitId, payload = {}) {
        const response = await axiosInstance.post(`/habits/${habitId}/logs`, payload);
        return response.data;
    },

    async updateLog(habitId, logDate, changes) {
        const response = await axiosInstance.patch(`/habits/${habitId}/logs/${logDate}`, changes);
        return response.data;
    },

    async deleteLog(habitId, logDate) {
        const response = await axiosInstance.delete(`/habits/${habitId}/logs/${logDate}`);
        return response.data;
    },

    async getHeatmap(days = 182, habitId = null) {
        const response = await axiosInstance.get('/habits/heatmap', {
            params: { days, ...(habitId ? { habit_id: habitId } : {}) }
        });
        return response.data;
    },

    async getHeatmapByHabit(days = 126) {
        const response = await axiosInstance.get('/habits/heatmap-by-habit', { params: { days } });
        return response.data;
    },

    async getStatsOverview() {
        const response = await axiosInstance.get('/habits/stats-overview');
        return response.data;
    },

    // --- Offline log queue (quiet retry; no spinners on the happy path) ---

    queueLog(habitId, payload) {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        queue.push({ habitId, payload, queuedAt: Date.now() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    },

    pendingCount() {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length;
    },

    async flushQueue() {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (!queue.length) return 0;

        const remaining = [];
        let flushed = 0;
        for (const item of queue) {
            try {
                await this.logHabit(item.habitId, item.payload);
                flushed += 1;
            } catch (error) {
                if (error.response) {
                    // Server judged it (e.g. outside the 48h window) — drop it.
                    flushed += 1;
                } else {
                    remaining.push(item); // still offline; keep for next time
                }
            }
        }
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        return flushed;
    }
};

export default habitService;
