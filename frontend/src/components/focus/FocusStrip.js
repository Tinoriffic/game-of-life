import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { focusService, formatClicks } from '../../services/focusService';
import './Focus.css';

const BASE_TITLE = document.title;

/**
 * The one-line clicks presence on Today (flag-gated by the parent):
 * progress + start button, or the live timer when a session is running.
 * Deliberately quiet - no XP, no celebration; this surface is private.
 */
const FocusStrip = ({ onState }) => {
    const [state, setState] = useState(null);
    const [now, setNow] = useState(Date.now());
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        focusService.getState()
            .then((data) => {
                if (!mounted) return;
                setState(data);
                onState?.(data);
            })
            .catch(() => { /* flag off or transient - the strip just doesn't render */ });
        return () => { mounted = false; };
    }, [onState]);

    const active = state?.active_session;

    useEffect(() => {
        if (!active || active.paused) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active]);

    // Focused time comes from the server (pauses excluded); the client only
    // advances the clock while the session is running.
    const anchor = useMemo(() => (active ? {
        baseMs: (active.elapsed_minutes || 0) * 60000,
        at: Date.now(),
        paused: Boolean(active.paused),
    } : null), [active]);

    const liveLabel = useMemo(() => {
        if (!anchor) return '';
        const ms = anchor.baseMs + (anchor.paused ? 0 : Math.max(0, now - anchor.at));
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }, [anchor, now]);

    // Live session timer in the tab title, wherever in the app the user is.
    useEffect(() => {
        if (!active) return undefined;
        document.title = `${active.paused ? '⏸ ' : ''}${liveLabel} · Focus`;
        return () => { document.title = BASE_TITLE; };
    }, [active, liveLabel]);

    if (!state) return null;

    if (active) {
        const category = state.categories.find((c) => c.id === active.category_id);
        return (
            <button className="focus-strip live" onClick={() => navigate('/focus')}>
                <span className={`strip-live-dot ${active.paused ? 'paused' : ''}`} />
                <span className="strip-timer">{active.paused ? '⏸ ' : ''}{liveLabel}</span>
                <span className="strip-cat">{category?.name || 'Focus'}</span>
                <span className="strip-hint">tap to open</span>
            </button>
        );
    }

    return (
        <div className="focus-strip">
            <button className="strip-progress" onClick={() => navigate('/clicks')}>
                ⚡ <b>{formatClicks(state.today_minutes)} / {state.settings.daily_target_clicks}</b> clicks
            </button>
            <button className="strip-start" onClick={() => navigate('/focus')}>▶ Start focus</button>
        </div>
    );
};

export default FocusStrip;
