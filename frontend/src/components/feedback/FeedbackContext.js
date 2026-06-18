import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import './Feedback.css';

/**
 * The feedback layer (§6): every log pays out *visibly* at the moment of
 * action. XP toasts, streak flames, day-complete celebration, level-up
 * takeover, challenge ticks — the difference between "database UI" and "game".
 */

const FeedbackContext = createContext(null);

export const useFeedback = () => useContext(FeedbackContext);

const ATTRIBUTE_SHORT = {
    Strength: 'STR', Endurance: 'END', Awareness: 'AWA', Intelligence: 'INT',
    Wisdom: 'WIS', Charisma: 'CHA', Resilience: 'RES', Creativity: 'CRE'
};

let toastSeq = 0;

export const FeedbackProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [overlay, setOverlay] = useState(null);
    const overlayQueue = useRef([]);

    const dismissToast = useCallback((id) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const pushToast = useCallback((toast) => {
        const id = ++toastSeq;
        setToasts((current) => [...current.slice(-3), { id, ...toast }]);
        setTimeout(() => dismissToast(id), toast.duration || 3200);
    }, [dismissToast]);

    const showNextOverlay = useCallback(() => {
        const next = overlayQueue.current.shift();
        setOverlay(next || null);
    }, []);

    const pushOverlay = useCallback((data) => {
        overlayQueue.current.push(data);
        setOverlay((current) => current || overlayQueue.current.shift());
    }, []);

    /** Parse a /habits/{id}/logs payout and fire everything it earned. */
    const celebrateLogResult = useCallback((result, { isBackfill = false } = {}) => {
        if (!result || result.already_logged) return;

        // 1. XP toast — +18 END flies toward the attribute
        if (result.xp && result.attribute && result.xp.total > 0) {
            const short = ATTRIBUTE_SHORT[result.attribute] || result.attribute;
            const mult = result.xp.multiplier > 1 ? ` ×${result.xp.multiplier}` : '';
            pushToast({
                kind: 'xp',
                attribute: result.attribute,
                text: `+${result.xp.total} ${short}${mult}`,
                sub: result.xp.capped ? 'daily cap reached' : null
            });
        } else if (result.log && result.log.player_xp > 0) {
            pushToast({ kind: 'xp', text: `+${result.log.player_xp} XP`, sub: 'measurement logged' });
        }

        // 2. Streak milestone celebrations at 7 / 30 / 100
        if (result.streak?.milestone) {
            pushToast({
                kind: 'milestone',
                text: `🔥 ${result.streak.milestone.streak}-day streak!`,
                sub: `+${result.streak.milestone.bonus} player XP`,
                duration: 4200
            });
        }

        // 3. Challenge progress ticks inline — connecting the islands
        if (result.challenge?.progressed) {
            pushToast({
                kind: 'challenge',
                text: `⚔ ${result.challenge.title}`,
                sub: `Day ${result.challenge.completed_days}/${result.challenge.duration_days} complete`,
                duration: 4000
            });
            if (result.challenge.challenge_completed) {
                pushOverlay({
                    type: 'challenge_complete',
                    title: result.challenge.title
                });
            }
        }

        // 4. Attribute level-ups (small) and player level-ups (big)
        if (result.attribute_state?.leveled_up) {
            pushToast({
                kind: 'levelup',
                text: `${result.attribute} leveled up!`,
                sub: `Now level ${result.attribute_state.level}`,
                duration: 4200
            });
        }
        if (result.player?.leveled_up) {
            pushOverlay({ type: 'player_level_up', level: result.player.level });
        }

        // 5. Day-complete — the dopamine anchor of the whole app
        if (result.day?.became_complete) {
            if (isBackfill) {
                pushToast({
                    kind: 'daycomplete',
                    text: '✅ Day completed — streak restored!',
                    sub: `+${result.day.bonus_paid} player XP`,
                    duration: 4200
                });
            } else {
                pushOverlay({
                    type: 'day_complete',
                    bonus: result.day.bonus_paid,
                    dayStreak: result.day.day_streak,
                    scheduled: result.day.scheduled
                });
            }
        } else if (result.day?.became_partial) {
            pushToast({
                kind: 'partial',
                text: `Almost there — ${result.day.completed}/${result.day.scheduled} done`,
                sub: result.day.bonus_paid ? `+${result.day.bonus_paid} player XP` : null,
                duration: 4000
            });
        }
    }, [pushToast, pushOverlay]);

    return (
        <FeedbackContext.Provider value={{ pushToast, celebrateLogResult }}>
            {children}

            <div className="toast-stack" aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast-${toast.kind}`}
                         onClick={() => dismissToast(toast.id)}>
                        <span className="toast-text">{toast.text}</span>
                        {toast.sub && <span className="toast-sub">{toast.sub}</span>}
                    </div>
                ))}
            </div>

            {overlay && (
                <div className="celebration-backdrop" onClick={showNextOverlay}>
                    {overlay.type === 'day_complete' && (
                        <div className="celebration-card">
                            <div className="celebration-ring">
                                <span className="celebration-check">✓</span>
                            </div>
                            <h2>DAY COMPLETE</h2>
                            <p className="celebration-detail">
                                All {overlay.scheduled} habits done
                            </p>
                            <p className="celebration-bonus">+{overlay.bonus} player XP</p>
                            {overlay.dayStreak > 1 && (
                                <p className="celebration-streak">🔥 {overlay.dayStreak}-day streak</p>
                            )}
                            <button className="celebration-dismiss" onClick={showNextOverlay}>
                                Keep going
                            </button>
                        </div>
                    )}
                    {overlay.type === 'player_level_up' && (
                        <div className="celebration-card levelup-card">
                            <div className="levelup-burst">⬆</div>
                            <h2>LEVEL UP</h2>
                            <p className="levelup-level">{overlay.level}</p>
                            <p className="celebration-detail">The second version of you, leveling up.</p>
                            <button className="celebration-dismiss" onClick={showNextOverlay}>
                                Onward
                            </button>
                        </div>
                    )}
                    {overlay.type === 'challenge_complete' && (
                        <div className="celebration-card">
                            <div className="levelup-burst">🏆</div>
                            <h2>CHALLENGE COMPLETE</h2>
                            <p className="celebration-detail">{overlay.title}</p>
                            <button className="celebration-dismiss" onClick={showNextOverlay}>
                                Claim it
                            </button>
                        </div>
                    )}
                </div>
            )}
        </FeedbackContext.Provider>
    );
};

export default FeedbackProvider;
