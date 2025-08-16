import React, { useState, useEffect } from 'react';
import { useUser } from '../../player/UserContext';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import './StatsPage.css';

import OverallProgress from './components/OverallProgress';
import WeightProgress from './components/WeightProgress';
import RunningProgress from './components/RunningProgress';
import StrengthProgress from './components/StrengthProgress';
import SkillsProgress from './components/SkillsProgress';
import DailyActivities from './components/DailyActivities';

const StatsPage = () => {
  const { user } = useUser();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get(`${baseUrl}/users/${user.id}/stats`);
        setStatsData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stats data:', err);
        setError('Failed to load stats data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) return <div className="loading">Loading stats...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="stats-page">
      <h1 className="main-header">Your Progress Dashboard</h1>
      <div className="stats-grid">
        <OverallProgress data={statsData.overall} />
        <WeightProgress data={statsData.weight} />
        <RunningProgress data={statsData.running} />
        <StrengthProgress data={statsData.strength} />
        <SkillsProgress data={statsData.skills} />
        {/* <DailyActivities data={statsData.activities} /> */}
      </div>
    </div>
  );
};

export default StatsPage;