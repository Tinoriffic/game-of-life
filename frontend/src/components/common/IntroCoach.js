import React, { useEffect, useState } from 'react';
import { useUser } from '../player/UserContext';
import './IntroCoach.css';

const seenKey = (userId, topic) => `intro_seen:${userId || 'anon'}:${topic}`;

export const introSeen = (userId, topic) => Boolean(localStorage.getItem(seenKey(userId, topic)));

/**
 * One-time feature intro, shown at the moment of first use and never again
 * (per user + topic, tracked in localStorage). Concise by design: a lead
 * sentence, at most three steps, a tip or two, one button.
 */
const IntroCoach = ({ topic, icon, title, lead, steps = [], tips = [], cta = 'Got it', onDismiss }) => {
    const { user } = useUser();
    const [open, setOpen] = useState(() => !introSeen(user?.id, topic));

    // The user hydrates async; re-check once the real id is known.
    useEffect(() => { setOpen(!introSeen(user?.id, topic)); }, [user?.id, topic]);

    if (!open) return null;

    const dismiss = () => {
        localStorage.setItem(seenKey(user?.id, topic), '1');
        setOpen(false);
        onDismiss?.();
    };

    return (
        <div className="coach-overlay" onClick={dismiss}>
            <div className="coach-card" onClick={(e) => e.stopPropagation()}>
                <div className="coach-icon">{icon}</div>
                <h3 className="coach-title">{title}</h3>
                <p className="coach-lead">{lead}</p>
                {steps.length > 0 && (
                    <ol className="coach-steps">
                        {steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                )}
                {tips.map((tip) => <p className="coach-tip" key={tip}>💡 {tip}</p>)}
                <button className="coach-cta" onClick={dismiss}>{cta}</button>
            </div>
        </div>
    );
};

export default IntroCoach;
