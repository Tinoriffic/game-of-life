import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser } from '../../player/UserContext';
import axiosInstance from '../../../axios';
import { habitService } from '../../../services/habitService';
import { hasClickTracking } from '../../../services/focusService';
import ClicksCard from '../../focus/ClicksCard';
import MiniHeatmap from '../../today/MiniHeatmap';
import SkillsProgress from './components/SkillsProgress';

/**
 * The Overall tab: the consistency story. The test for every surface here
 * is "can you look at it and feel whether you're making progress?"
 */
const OverallTab = () => {
  const { user } = useUser();
  const [overview, setOverview] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [skills, setSkills] = useState(null);
  const [showAttributes, setShowAttributes] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      habitService.getStatsOverview(),
      habitService.getHeatmap(364)
    ]).then(([overviewData, heatmapData]) => {
      setOverview(overviewData);
      setHeatmap(heatmapData);
    }).catch((err) => {
      console.error('Error fetching stats:', err);
      setError('Failed to load stats. Please try again later.');
    });
  }, []);

  // Attribute XP history is demoted detail — fetch only when expanded.
  useEffect(() => {
    if (!showAttributes || skills || !user?.id) return;
    axiosInstance.get(`/users/${user.id}/stats`)
      .then((response) => setSkills(response.data.skills))
      .catch((err) => console.error('Error fetching attribute stats:', err));
  }, [showAttributes, skills, user?.id]);

  if (error) return <div className="error">{error}</div>;
  if (!overview) return <div className="loading">Loading stats…</div>;

  const { consistency } = overview;
  const trendHabits = overview.habits.filter((h) =>
    h.pace || h.measurement || h.total_duration_minutes > 0 || h.total_completions > 0);

  return (
    <>
      {/* Consistency: the numbers that ARE the product */}
      <div className="consistency-grid">
        <ConsistencyStat value={`🔥 ${consistency.day_streak}`} label="day streak" />
        <ConsistencyStat value={consistency.best_day_streak} label="best streak" />
        <ConsistencyStat value={consistency.total_days_logged} label="days logged" />
        <ConsistencyStat
          value={consistency.day_complete_rate_30d != null
            ? `${Math.round(consistency.day_complete_rate_30d * 100)}%`
            : '—'}
          label="complete rate (30d)"
        />
      </div>

      {/* Clicks: compact this-week card (flag-gated) → the Clicks tab */}
      {hasClickTracking(user) && <ClicksCard />}

      {/* Streak heatmap, front and center — as many weeks as the screen fits */}
      <section className="stats-card">
        {heatmap && heatmap.days.some((d) => d.count > 0) ? (
          <MiniHeatmap heatmap={heatmap} responsive showMonths />
        ) : (
          <p className="stats-empty">Log your first habit → this grid starts filling in.</p>
        )}
      </section>

      {/* Performance trends — the payoff for detail logging */}
      <h2 className="stats-section-title">Habits</h2>
      {trendHabits.length === 0 && (
        <p className="stats-empty">
          No habit data yet. <Link to="/">Log something today</Link> and these charts come alive.
        </p>
      )}
      {trendHabits.map((habit) => <HabitTrendCard key={habit.id} habit={habit} />)}

      {/* Demoted: attribute levels live on the profile; XP-over-time is vanity */}
      <button className="attributes-toggle" onClick={() => setShowAttributes(!showAttributes)}>
        {showAttributes ? '▾ Hide attribute details' : '▸ Attribute details'}
      </button>
      {showAttributes && skills && <SkillsProgress data={skills} />}
    </>
  );
};

const ConsistencyStat = ({ value, label }) => (
  <div className="consistency-stat">
    <span className="cs-value">{value}</span>
    <span className="cs-label">{label}</span>
  </div>
);

const HabitTrendCard = ({ habit }) => {
  const streakUnit = habit.cadence_type === 'weekly' ? 'wk' : 'd';
  return (
    <div className="stats-card habit-trend-card" style={{ '--bucket-color': habit.bucket_color }}>
      <div className="htc-header">
        <span className="htc-name">{habit.icon} {habit.name}</span>
        <span className="htc-streaks">
          🔥 {habit.current_streak}{streakUnit}
          <span className="htc-best"> · best {habit.best_streak}{streakUnit}</span>
        </span>
      </div>
      <div className="htc-numbers">
        <span>{habit.total_completions} total</span>
        <span>{habit.completions_30d} in last 30d</span>
        {habit.total_duration_minutes > 0 && (
          <span>{Math.round(habit.total_duration_minutes / 60 * 10) / 10}h logged</span>
        )}
        {habit.total_distance > 0 && <span>{habit.total_distance.toFixed(1)} mi</span>}
        {habit.total_quantity > 0 && <span>{habit.total_quantity} reps/items</span>}
      </div>

      {habit.pace?.history?.length > 1 && (
        <TrendChart
          data={habit.pace.history}
          dataKey="pace"
          label={`Pace — best ${habit.pace.best_pace_min_per_mile} min/mi`}
          invert
        />
      )}
      {habit.measurement?.history?.length > 1 && (
        <TrendChart
          data={habit.measurement.history}
          dataKey="value"
          label={`Latest ${habit.measurement.latest}${habit.measurement_unit ? ` ${habit.measurement_unit}` : ''}`
            + (habit.measurement.delta_30d != null
              ? ` · 30d ${habit.measurement.delta_30d > 0 ? '+' : ''}${habit.measurement.delta_30d}`
              : '')}
        />
      )}
    </div>
  );
};

const TrendChart = ({ data, dataKey, label, invert = false }) => (
  <div className="htc-chart">
    <span className="htc-chart-label">{label}</span>
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" hide />
        <YAxis
          domain={['auto', 'auto']}
          reversed={invert}
          stroke="#888"
          width={36}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,215,0,0.5)', color: '#f8f8f2' }}
        />
        <Line type="monotone" dataKey={dataKey} stroke="#FFD700" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default OverallTab;
