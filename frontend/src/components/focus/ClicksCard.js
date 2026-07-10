import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { focusService, formatClicks, minutesToClicks } from '../../services/focusService';
import './Focus.css';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The compact this-week clicks card on the Stats landing (flag-gated by the
 * parent). Seven day-columns against the daily target; tap → Clicks page.
 */
const ClicksCard = () => {
    const [state, setState] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        focusService.getState().then(setState).catch(() => {});
    }, []);

    if (!state) return null;

    const target = state.settings.daily_target_clicks;
    const targetMinutes = target * 60;
    // Scale bars so the target line sits at 70% of the column height.
    const scaleMax = Math.max(targetMinutes / 0.7, ...state.week_days.map((d) => d.minutes));

    return (
        <button className="clicks-card" onClick={() => navigate('/clicks')}>
            <div className="clicks-card-head">
                <span className="clicks-card-title">⚡ CLICKS · THIS WEEK</span>
                <span className="clicks-card-total">
                    {formatClicks(state.week_minutes)} / {state.settings.weekly_target_clicks} clicks
                </span>
            </div>
            <div className="clicks-card-bars">
                {DAY_LETTERS.map((letter, i) => {
                    const day = state.week_days[i];
                    const minutes = day ? day.minutes : null;
                    const hit = minutes != null && minutesToClicks(minutes) >= target;
                    return (
                        <div className="ccb-col" key={i}>
                            <div className="ccb-track">
                                <div className="ccb-target" style={{ bottom: '70%' }} />
                                {minutes != null && minutes > 0 && (
                                    <div
                                        className={`ccb-fill ${hit ? 'hit' : ''}`}
                                        style={{ height: `${Math.min(100, (minutes / scaleMax) * 100)}%` }}
                                    />
                                )}
                            </div>
                            <span className={`ccb-label ${day && i === state.week_days.length - 1 ? 'today' : ''}`}>
                                {letter}
                            </span>
                        </div>
                    );
                })}
            </div>
        </button>
    );
};

export default ClicksCard;
