import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import './DailyActivities.css';

const DailyActivities = ({ data }) => {
  if (!data || data.length === 0) return <div>No daily activities data available</div>;

  const heatmapData = data.map(day => ({
    date: day.date,
    count: Object.values(day.activities).reduce((a, b) => a + b, 0)
  }));

  const startDate = new Date(data[0].date);
  startDate.setDate(startDate.getDate() - 1);  // Start one day earlier for better visual
  const endDate = new Date(data[data.length - 1].date);

  return (
    <div className="stats-card daily-activities">
      <h2>Daily Activities</h2>
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={heatmapData}
        classForValue={(value) => {
          if (!value) {
            return 'color-empty';
          }
          return `color-scale-${Math.min(value.count, 4)}`;
        }}
        tooltipDataAttrs={(value) => {
          if (!value || !value.date) {
            return null;
          }
          return {
            'data-tip': `${value.date}: ${value.count} activities`,
          };
        }}
      />
    </div>
  );
};

export default DailyActivities;