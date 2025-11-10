import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './RunningProgress.css';

const RunningProgress = ({ data }) => {
  const runningHistory = useMemo(() => data?.history || [], [data]);

  const { weeklyStats, pacePR, distancePR, progressMessage } = useMemo(() => {
    if (!data || runningHistory.length === 0) {
      return { weeklyStats: {}, pacePR: null, distancePR: null, progressMessage: '' };
    }

    const sortedHistory = [...runningHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const currentDate = new Date(sortedHistory[0].date);
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyRuns = sortedHistory.filter(run => new Date(run.date) >= oneWeekAgo);
    const weeklyStats = {
      runCount: weeklyRuns.length,
      totalDistance: weeklyRuns.reduce((sum, run) => sum + run.distance, 0).toFixed(2),
      totalDuration: weeklyRuns.reduce((sum, run) => sum + run.duration, 0)
    };

    const pacePR = Math.min(...runningHistory.map(run => run.duration / run.distance)).toFixed(2);
    const distancePR = Math.max(...runningHistory.map(run => run.distance)).toFixed(2);

    const totalDistance = runningHistory.reduce((sum, run) => sum + run.distance, 0);
    const progressMessage = `${totalDistance.toFixed(2)} MILES TOTAL`;

    return { weeklyStats, pacePR, distancePR, progressMessage };
  }, [data, runningHistory]);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const dateFormatter = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!data) return <div className="arcade-text">NO RUNNING DATA AVAILABLE</div>;

  return (
    <div className="arcade-card running-progress">
      <div className="arcade-header">RUNNING</div>
      <div className="arcade-stats">
        <div className="stat-item">
          <span className="stat-label">TOTAL DISTANCE</span>
          <span className="stat-value">{data.totalDistance.toFixed(2)} MI</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">TOTAL TIME</span>
          <span className="stat-value">{formatDuration(data.totalDuration)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">DISTANCE PR</span>
          <span className="stat-value">{distancePR} MI</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">PACE PR</span>
          <span className="stat-value">{pacePR} MIN/MI</span>
        </div>
      </div>
      <div className="arcade-highlight">
        <div className="highlight-item">
          <span className="highlight-label">WEEKLY RUNS</span>
          <span className="highlight-value">{weeklyStats.runCount}</span>
        </div>
        <div className="highlight-item">
          <span className="highlight-label">WEEKLY DISTANCE</span>
          <span className="highlight-value">{weeklyStats.totalDistance} MI</span>
        </div>
        <div className="highlight-item">
          <span className="highlight-label">WEEKLY TIME</span>
          <span className="highlight-value">{formatDuration(weeklyStats.totalDuration)}</span>
        </div>
      </div>
      {/* <div className="progress-bar">
        <div className="progress-fill" style={{ width: '100%' }}></div>
        <span className="progress-text">{progressMessage}</span>
      </div> */}
      <div className="arcade-chart">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={runningHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="date"
              stroke="#B8B8B8"
              tickFormatter={dateFormatter}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="left" stroke="#B8B8B8" />
            <YAxis yAxisId="right" orientation="right" stroke="#B8B8B8" />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#F8F8F2' }}
              labelFormatter={dateFormatter}
            />
            <Line yAxisId="left" type="monotone" dataKey="distance" name="Distance (mi)" stroke="#FFD700" strokeWidth={2} dot={{ fill: '#FFD700', r: 4 }} activeDot={{ r: 8, fill: '#4caf50' }} />
            <Line yAxisId="right" type="monotone" dataKey="duration" name="Duration (min)" stroke="#2196F3" strokeWidth={2} dot={{ fill: '#2196F3', r: 4 }} activeDot={{ r: 8, fill: '#4caf50' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RunningProgress;