import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts';
import './WeightProgress.css';

const DAY_MS = 86400000;
const EWMA_ALPHA = 0.1; // Hacker's Diet standard: ~10-day effective window

const shortDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

/**
 * Weight the way trend apps (Happy Scale / Libra / MacroFactor) read it:
 * the EWMA trend is your weight, raw weigh-ins are noise around it, and a
 * dashed projection at the current rate answers "when do I hit my goal?"
 */
const WeightProgress = ({ data }) => {
  const model = useMemo(() => {
    if (!data?.history?.length) return null;

    // One entry per calendar day (last log wins), ascending.
    const byDay = new Map();
    for (const entry of data.history) {
      const day = String(entry.date).slice(0, 10);
      byDay.set(day, entry.weight);
    }
    const days = [...byDay.entries()]
      .map(([day, weight]) => ({ ts: new Date(`${day}T12:00:00`).getTime(), weight }))
      .sort((a, b) => a.ts - b.ts);

    // Gap-adjusted EWMA (skipped days smooth as if interpolated).
    let trend = days[0].weight;
    let prevTs = days[0].ts;
    const rows = days.map((d, i) => {
      if (i > 0) {
        const gapDays = Math.max(1, Math.round((d.ts - prevTs) / DAY_MS));
        const k = 1 - Math.pow(1 - EWMA_ALPHA, gapDays);
        trend += k * (d.weight - trend);
        prevTs = d.ts;
      }
      return { ts: d.ts, weight: d.weight, trend: Math.round(trend * 10) / 10 };
    });

    // Rate: least-squares slope over the last 14 days of trend points.
    const lastTs = rows[rows.length - 1].ts;
    const recent = rows.filter((r) => r.ts >= lastTs - 14 * DAY_MS);
    let ratePerDay;
    if (recent.length >= 3) {
      const n = recent.length;
      const meanX = recent.reduce((s, r) => s + r.ts, 0) / n;
      const meanY = recent.reduce((s, r) => s + r.trend, 0) / n;
      const num = recent.reduce((s, r) => s + (r.ts - meanX) * (r.trend - meanY), 0);
      const den = recent.reduce((s, r) => s + (r.ts - meanX) ** 2, 0);
      ratePerDay = den > 0 ? (num / den) * DAY_MS : 0;
    } else if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      ratePerDay = (last.trend - first.trend) / Math.max(1, (last.ts - first.ts) / DAY_MS);
    } else {
      ratePerDay = 0;
    }

    const trendNow = rows[rows.length - 1].trend;
    const goal = data.goal ?? null;
    const weeklyRate = Math.round(ratePerDay * 7 * 10) / 10;

    // Projection: only when actually moving toward the goal at a real rate.
    let etaTs = null;
    const towardGoal = goal != null && ratePerDay !== 0
      && Math.sign(ratePerDay) === Math.sign(goal - trendNow);
    if (towardGoal && Math.abs(weeklyRate) >= 0.1) {
      const daysToGoal = (goal - trendNow) / ratePerDay;
      if (daysToGoal <= 90) {
        etaTs = lastTs + daysToGoal * DAY_MS;
        rows[rows.length - 1].projection = trendNow;
        rows.push({ ts: etaTs, projection: goal });
      }
    }

    return { rows, trendNow, weeklyRate, goal, etaTs, lastTs };
  }, [data]);

  if (!model) return null;
  const { rows, trendNow, weeklyRate, goal, etaTs } = model;

  const weights = rows.filter((r) => r.weight != null).map((r) => r.weight);
  const yMin = Math.floor(Math.min(...weights, goal ?? Infinity)) - 2;
  const yMax = Math.ceil(Math.max(...weights, goal ?? -Infinity)) + 2;
  const toGoal = goal != null ? Math.round(Math.abs(trendNow - goal) * 10) / 10 : null;

  return (
    <div className="stats-card weight-progress">
      <div className="wp-header">
        <span className="wp-title">⚖️ WEIGHT</span>
        {etaTs && <span className="wp-eta">on pace for {shortDate(etaTs)}</span>}
      </div>

      <div className="wp-tiles">
        <div className="wp-tile">
          <span className="wp-tile-value">{trendNow}</span>
          <span className="wp-tile-label">trend</span>
        </div>
        <div className="wp-tile">
          <span className="wp-tile-value">{data.current}</span>
          <span className="wp-tile-label">last weigh-in</span>
        </div>
        <div className="wp-tile">
          <span className="wp-tile-value">
            {weeklyRate > 0 ? '+' : ''}{weeklyRate}
          </span>
          <span className="wp-tile-label">lbs / week</span>
        </div>
        <div className="wp-tile">
          <span className="wp-tile-value">{toGoal != null ? toGoal : '—'}</span>
          <span className="wp-tile-label">{goal != null ? `to goal (${goal})` : 'no goal set'}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={rows} margin={{ top: 10, right: 12 }}>
          <CartesianGrid stroke="#333" vertical={false} />
          <XAxis
            dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            tickFormatter={shortDate} stroke="#888" tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis domain={[yMin, yMax]} stroke="#888" width={36} tick={{ fontSize: 10 }} />
          <Tooltip
            labelFormatter={shortDate}
            formatter={(value, key) => [
              `${value} lbs`,
              { trend: 'Trend', weight: 'Scale', projection: 'Projected' }[key] || key,
            ]}
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,215,0,0.5)', color: '#f8f8f2' }}
          />
          {goal != null && (
            <ReferenceLine
              y={goal} stroke="#06D6A0" strokeDasharray="5 4"
              label={{ value: `goal ${goal}`, fill: '#b8b8b8', fontSize: 11, position: 'insideTopRight' }}
            />
          )}
          <Scatter dataKey="weight" fill="rgba(255, 215, 0, 0.35)" isAnimationActive={false} />
          <Line
            type="monotone" dataKey="trend" stroke="#FFD700" strokeWidth={2}
            dot={false} activeDot={{ r: 5, stroke: '#1D1F20', strokeWidth: 2 }}
          />
          <Line
            type="linear" dataKey="projection" stroke="rgba(255, 215, 0, 0.55)"
            strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls
            isAnimationActive={false}
          />
          {etaTs && goal != null && (
            <ReferenceDot
              x={etaTs} y={goal} r={4} fill="#06D6A0" stroke="#1D1F20" strokeWidth={2}
              label={{ value: `est. ${shortDate(etaTs)}`, fill: '#b8b8b8', fontSize: 11, position: 'top' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <span className="wp-caption">dots = scale readings · line = trend</span>
    </div>
  );
};

export default WeightProgress;
