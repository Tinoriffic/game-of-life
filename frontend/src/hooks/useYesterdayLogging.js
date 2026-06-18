import { useState, useEffect } from 'react';
import axiosInstance from '../axios';
import { baseUrl } from '../config/apiConfig';

/**
 * Custom hook to manage "Forgot to log yesterday?" functionality for activity loggers.
 *
 * @param {number} userId - The current user's ID
 * @param {string} activityType - The type of activity (e.g., "meditate", "journal", "socialize")
 * @returns {object} - { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry }
 */
export const useYesterdayLogging = (userId, activityType) => {
    const [logForYesterday, setLogForYesterday] = useState(false);
    const [canLogYesterday, setCanLogYesterday] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkIfYesterdayLogged();
    }, [userId, activityType]);

    const checkIfYesterdayLogged = async () => {
        try {
            // Fetch recent activities (last 7 days)
            const response = await axiosInstance.get(`${baseUrl}/users/${userId}/daily-activities`);
            const activities = response.data;

            // Calculate yesterday's date (in local timezone)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if user logged this activity type yesterday
            const loggedYesterday = activities.some(activity => {
                const activityDate = new Date(activity.date).toISOString().split('T')[0];
                return activity.activity_type === activityType && activityDate === yesterdayDateStr;
            });

            setCanLogYesterday(!loggedYesterday);
        } catch (error) {
            console.error('Error checking yesterday activities:', error);
            // On error, allow the option (fail open)
            setCanLogYesterday(true);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Adds the date field to the log entry if logging for yesterday
     */
    const getLogEntry = (baseEntry) => {
        if (logForYesterday) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return {
                ...baseEntry,
                date: yesterday.toISOString()
            };
        }
        return baseEntry;
    };

    return {
        canLogYesterday,
        logForYesterday,
        setLogForYesterday,
        loading,
        getLogEntry,
        recheckYesterday: checkIfYesterdayLogged // Expose function to manually re-check
    };
};

/**
 * Utility function to parse API errors for display
 * Handles both string errors and 422 validation error arrays
 */
export const parseApiError = (error, defaultMessage = 'Failed to log activity. Please try again.') => {
    let errorMessage = defaultMessage;

    if (error.response?.data?.detail) {
        // Handle string error messages
        if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail;
        }
        // Handle validation error arrays (422 errors)
        else if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail
                .map(err => err.msg || JSON.stringify(err))
                .join(', ');
        }
    }

    return errorMessage;
};
