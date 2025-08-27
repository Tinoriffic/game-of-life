import api from '../axios';

export const adminService = {
  // User management
  async getAllUsers(skip = 0, limit = 100) {
    const response = await api.get(`/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  async makeUserAdmin(userId) {
    const response = await api.post(`/admin/users/${userId}/make-admin`);
    return response.data;
  },

  async revokeAdminRole(userId) {
    const response = await api.post(`/admin/users/${userId}/revoke-admin`);
    return response.data;
  },

  // Challenge management
  async getAllChallenges() {
    const response = await api.get('/admin/challenges');
    return response.data;
  },

  async toggleChallengeActive(challengeId) {
    const response = await api.post(`/admin/challenges/${challengeId}/toggle-active`);
    return response.data;
  },

  async completeChallengeDayForUser(userId) {
    const response = await api.post(`/admin/users/${userId}/complete-challenge-day`);
    return response.data;
  },

  // System stats
  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};