import axiosInstance from '../axios';
import { baseUrl } from '../config/apiConfig';

export const userService = {
    async updateTimezone(timezone) {
        try {
            const response = await axiosInstance.put(`${baseUrl}/users/me/timezone`, {
                timezone: timezone
            });
            return response.data;
        } catch (error) {
            console.error('Error updating timezone:', error);
            throw error;
        }
    },

    getBrowserTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
            console.error('Error detecting timezone:', error);
            return 'UTC'; // Fallback to UTC
        }
    },

    async detectAndSaveTimezone() {
        try {
            const today = new Date().toDateString();
            const lastCheck = localStorage.getItem('lastTimezoneCheck');
            
            // Only check timezone once per day
            if (lastCheck === today) {
                console.log('Timezone already checked today, skipping');
                return;
            }
            
            const detectedTimezone = this.getBrowserTimezone();
            console.log('Detecting timezone for today:', detectedTimezone);
            
            await this.updateTimezone(detectedTimezone);
            console.log('Timezone updated successfully:', detectedTimezone);
            
            // Mark as checked for today
            localStorage.setItem('lastTimezoneCheck', today);
            
            return detectedTimezone;
        } catch (error) {
            console.error('Failed to detect and save timezone:', error);
            return 'UTC';
        }
    }
};

export default userService;