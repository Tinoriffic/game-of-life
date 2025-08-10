import axiosInstance from '../axios';
import { baseUrl } from '../config/apiConfig';

const CHALLENGE_ENDPOINTS = {
    AVAILABLE: '/challenges/available',
    ACTIVE: '/challenges/active',
    JOIN: '/challenges/join',
    COMPLETE: '/challenges/complete',
    QUIT: '/challenges/quit',
    HISTORY: '/challenges/history',
    BADGES: '/challenges/badges',
    BY_ID: (id) => `/challenges/${id}`
};

export const challengeService = {
    // Get all available challenges
    async getAvailableChallenges() {
        try {
            const response = await axiosInstance.get(`${baseUrl}${CHALLENGE_ENDPOINTS.AVAILABLE}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching available challenges:', error);
            throw error;
        }
    },

    // Get user's active challenge with progress
    async getActiveChallenge() {
        try {
            const response = await axiosInstance.get(`${baseUrl}${CHALLENGE_ENDPOINTS.ACTIVE}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching active challenge:', error);
            throw error;
        }
    },

    // Join a challenge
    async joinChallenge(challengeId) {
        try {
            const response = await axiosInstance.post(`${baseUrl}${CHALLENGE_ENDPOINTS.JOIN}`, {
                challenge_id: challengeId
            });
            return response.data;
        } catch (error) {
            console.error('Error joining challenge:', error);
            throw error;
        }
    },

    // Mark today as complete for active challenge
    async markDayComplete(activityData = null) {
        try {
            const response = await axiosInstance.post(`${baseUrl}${CHALLENGE_ENDPOINTS.COMPLETE}`, {
                activity_data: activityData
            });
            return response.data;
        } catch (error) {
            console.error('Error marking day complete:', error);
            throw error;
        }
    },

    // Quit active challenge
    async quitChallenge() {
        try {
            const response = await axiosInstance.post(`${baseUrl}${CHALLENGE_ENDPOINTS.QUIT}`);
            return response.data;
        } catch (error) {
            console.error('Error quitting challenge:', error);
            throw error;
        }
    },

    // Get challenge history
    async getChallengeHistory(skip = 0, limit = 10) {
        try {
            const response = await axiosInstance.get(
                `${baseUrl}${CHALLENGE_ENDPOINTS.HISTORY}?skip=${skip}&limit=${limit}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching challenge history:', error);
            throw error;
        }
    },

    // Get user badges
    async getUserBadges() {
        try {
            const response = await axiosInstance.get(`${baseUrl}${CHALLENGE_ENDPOINTS.BADGES}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user badges:', error);
            throw error;
        }
    },

    // Get specific challenge by ID
    async getChallengeById(challengeId) {
        try {
            const response = await axiosInstance.get(`${baseUrl}${CHALLENGE_ENDPOINTS.BY_ID(challengeId)}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching challenge:', error);
            throw error;
        }
    }
};

export default challengeService;