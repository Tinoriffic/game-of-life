import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './WeightProgress.css';

const WeightProgress = ({ data }) => {
  const weightHistory = useMemo(() => data?.history || [], [data]);

  const { minWeight, maxWeight, weeklyChange, progressMessage } = useMemo(() => {
    if (!data || weightHistory.length === 0) {
      return { minWeight: 0, maxWeight: 0, weeklyChange: null, progressMessage: '' };
    }

    const minWeight = Math.min(...weightHistory.map(entry => entry.weight));
    const maxWeight = Math.max(...weightHistory.map(entry => entry.weight));

    // Calculate weekly change
    let weeklyChange = null;
    const sortedHistory = [...weightHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const currentEntry = sortedHistory[0];
    const currentDate = new Date(currentEntry.date);
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekAgoEntry = sortedHistory.find(entry => new Date(entry.date) <= oneWeekAgo);
    
    if (weekAgoEntry) {
      weeklyChange = (currentEntry.weight - weekAgoEntry.weight).toFixed(1);
    }

    // Calculate progress towards goal
    let progressMessage = '';
    const startWeight = sortedHistory[sortedHistory.length - 1].weight;
    const currentWeight = data.current;
    const goalWeight = data.goal;

    if (startWeight === goalWeight) {
      progressMessage = "GOAL ACHIEVED!";
    } else {
      const totalChange = Math.abs(goalWeight - startWeight);
      const currentChange = Math.abs(currentWeight - startWeight);
      const progressPercentage = (currentChange / totalChange) * 100;
      progressMessage = `${progressPercentage.toFixed(1)}% TO GOAL`;
    }

    return { minWeight, maxWeight, weeklyChange, progressMessage };
  }, [data, weightHistory]);

  const yAxisMin = Math.floor(minWeight - 5);
  const yAxisMax = Math.ceil(maxWeight + 5);

  const dateFormatter = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!data) return <div className="arcade-text">NO WEIGHT DATA AVAILABLE</div>;

  return (
    <div className="arcade-card weight-progress">
      <div className="arcade-header">WEIGHT</div>
      <div className="arcade-stats">
        <div className="stat-item">
          <span className="stat-label">CURRENT</span>
          <span className="stat-value">{data.current} LBS</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">GOAL</span>
          <span className="stat-value">{data.goal} LBS</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">LOWEST</span>
          <span className="stat-value">{data.lowest} LBS</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">HIGHEST</span>
          <span className="stat-value">{data.highest} LBS</span>
        </div>
      </div>
      <div className="arcade-highlight">
        <div className="highlight-item">
          <span className="highlight-label">TOTAL CHANGE</span>
          <span className="highlight-value">{data.change > 0 ? '+' : ''}{data.change.toFixed(1)} LBS</span>
        </div>
        {weeklyChange !== null && (
          <div className="highlight-item">
            <span className="highlight-label">WEEKLY CHANGE</span>
            <span className="highlight-value">{weeklyChange > 0 ? '+' : ''}{weeklyChange} LBS</span>
          </div>
        )}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: progressMessage.split('%')[0] + '%' }}></div>
        <span className="progress-text">{progressMessage}</span>
      </div>
      <div className="arcade-chart">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weightHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey="date" 
              stroke="#00ff00" 
              tickFormatter={dateFormatter}
              interval="preserveStartEnd"
            />
            <YAxis domain={[yAxisMin, yAxisMax]} stroke="#00ff00" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #00ff00' }}
              labelFormatter={dateFormatter}
            />
            <Line type="monotone" dataKey="weight" stroke="#ff00ff" strokeWidth={2} dot={{ fill: '#ff00ff', r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeightProgress;