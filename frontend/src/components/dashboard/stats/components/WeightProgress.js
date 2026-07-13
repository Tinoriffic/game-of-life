import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './WeightProgress.css';

const WeightProgress = ({ data }) => {
  // Bucket entries by calendar day, keeping the last log of each day —
  // multiple same-day entries used to duplicate x-axis dates.
  const weightHistory = useMemo(() => {
    const byDay = new Map();
    for (const entry of data?.history || []) {
      const day = String(entry.date).slice(0, 10);
      byDay.set(day, { ...entry, date: day });
    }
    return [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [data]);

  const { minWeight, maxWeight, weeklyChange, progressMessage, onTrack } = useMemo(() => {
    if (!data || weightHistory.length === 0) {
      return { minWeight: 0, maxWeight: 0, weeklyChange: null, progressMessage: '', onTrack: false };
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

    // Lost vs gained is only "progress" relative to the goal's direction.
    const onTrack = goalWeight != null && data.change !== 0
      && Math.sign(data.change) === Math.sign(goalWeight - startWeight);

    return { minWeight, maxWeight, weeklyChange, progressMessage, onTrack };
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
          <span className="highlight-label">TOTAL {data.change <= 0 ? 'LOST' : 'GAINED'}</span>
          <span className={`highlight-value ${onTrack ? 'on-track' : ''}`}>
            {Math.abs(data.change).toFixed(1)} LBS
          </span>
        </div>
        {data.goal != null && (
          <div className="highlight-item">
            <span className="highlight-label">TO GOAL</span>
            <span className="highlight-value">{Math.abs(data.current - data.goal).toFixed(1)} LBS</span>
          </div>
        )}
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
              stroke="#B8B8B8"
              tickFormatter={dateFormatter}
              interval="preserveStartEnd"
            />
            <YAxis domain={[yAxisMin, yAxisMax]} stroke="#B8B8B8" />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#F8F8F2' }}
              labelFormatter={dateFormatter}
            />
            {data.goal != null && (
              <ReferenceLine y={data.goal} stroke="#06D6A0" strokeDasharray="5 4"
                label={{ value: `Goal ${data.goal}`, fill: '#06D6A0', fontSize: 11, position: 'insideTopRight' }} />
            )}
            <Line type="monotone" dataKey="weight" stroke="#FFD700" strokeWidth={2} dot={{ fill: '#FFD700', r: 4 }} activeDot={{ r: 8, fill: '#4caf50' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeightProgress;