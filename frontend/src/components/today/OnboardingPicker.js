import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../axios';
import { habitService } from '../../services/habitService';
import { useUser } from '../player/UserContext';
import { useFeedback } from '../feedback/FeedbackContext';
import ProgramBuilder from '../workout/ProgramBuilder';
import './OnboardingPicker.css';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const defaultCadence = (template) => ({
    cadence_type: template?.default_cadence_type || 'daily',
    times_per_week: template?.default_times_per_week || 3,
    weekdays: template?.default_weekdays || [0, 1, 2, 3, 4]
});

/**
 * Empty Today view -> onboarding: pick your first ~5 habits from the library.
 * Never a dead end. Also reused as the "add habit" picker (single mode).
 * The slot limit forces the right question: which habits actually matter right now?
 */
const OnboardingPicker = ({ onCreated, slots, single = false, onClose }) => {
    const [buckets, setBuckets] = useState(null);
    const [picks, setPicks] = useState([]);            // {key, bucket, name, template, cadence, isMeasurement, programId, targetValue}
    const [customNames, setCustomNames] = useState({}); // bucketId -> draft text
    const [saving, setSaving] = useState(false);
    const [programBucket, setProgramBucket] = useState(null); // bucket whose program builder is open
    const [existingBucket, setExistingBucket] = useState(null); // bucket whose "existing program" chooser is open
    const [existingPrograms, setExistingPrograms] = useState(null); // cached active programs (null = not loaded)
    const { user } = useUser();
    const { pushToast } = useFeedback();

    useEffect(() => {
        habitService.getBuckets().then(setBuckets).catch((err) => {
            console.error('Error loading habit library:', err);
            pushToast({ kind: 'partial', text: 'Could not load the habit library' });
        });
    }, [pushToast]);

    const slotLimit = slots?.available ?? slots?.total ?? 6;
    const standardPicks = useMemo(() => picks.filter((p) => !p.isMeasurement), [picks]);

    const togglePick = (bucket, template) => {
        const key = `t${template.id}`;
        const existing = picks.find((p) => p.key === key);
        if (existing) {
            setPicks(picks.filter((p) => p.key !== key));
            return;
        }
        addPick({
            key,
            bucket,
            template,
            name: template.name,
            isMeasurement: Boolean(template.measurement_kind) || bucket.key === 'measurement',
            cadence: defaultCadence(template)
        });
    };

    const addCustom = (bucket) => {
        const name = (customNames[bucket.id] || '').trim();
        if (!name) return;
        addPick({
            key: `c${bucket.id}:${name.toLowerCase()}`,
            bucket,
            template: null,
            name,
            isMeasurement: bucket.key === 'measurement',
            cadence: defaultCadence(null)
        });
        setCustomNames({ ...customNames, [bucket.id]: '' });
    };

    const addPick = (pick) => {
        if (single && picks.length >= 1) {
            setPicks([pick]);
            return;
        }
        if (!pick.isMeasurement && standardPicks.length >= slotLimit) {
            pushToast({
                kind: 'partial',
                text: `That's all ${slotLimit} slots — focus beats hoarding`,
                sub: 'Level up to earn more room'
            });
            return;
        }
        setPicks((current) => [...current, pick]);
    };

    const updateCadence = (key, changes) => {
        setPicks((current) => current.map((p) =>
            p.key === key ? { ...p, cadence: { ...p.cadence, ...changes } } : p));
    };

    const updatePick = (key, changes) => {
        setPicks((current) => current.map((p) => (p.key === key ? { ...p, ...changes } : p)));
    };

    // Flagship Strength action: ProgramBuilder saves the program, then we add the linked habit as a pick.
    const onProgramSaved = (program) => {
        const bucket = programBucket;
        setProgramBucket(null);
        addPick({
            key: `prog${program.program_id}`,
            bucket,
            template: null,
            name: program.name,
            isMeasurement: false,
            programId: program.program_id,
            cadence: { cadence_type: 'weekly', times_per_week: 3, weekdays: [0, 1, 2, 3, 4] },
        });
        pushToast({ kind: 'daycomplete', text: `Program "${program.name}" created — set its cadence below` });
    };

    // Link a habit to a program the user already built (e.g. one orphaned when an
    // old workout habit was archived). Avoids the "name already exists" collision
    // from re-creating the same program. Active programs only.
    const openExisting = (bucket) => {
        setExistingBucket(bucket);
        if (existingPrograms == null) {
            axiosInstance.get(`/users/${user.id}/workout-programs`)
                .then((r) => setExistingPrograms(r.data?.programs || []))
                .catch(() => {
                    setExistingPrograms([]);
                    pushToast({ kind: 'partial', text: 'Could not load your programs' });
                });
        }
    };

    const linkExisting = (program) => {
        const bucket = existingBucket;
        setExistingBucket(null);
        if (picks.some((p) => p.programId === program.program_id)) {
            pushToast({ kind: 'partial', text: 'That program is already in your picks' });
            return;
        }
        addPick({
            key: `prog${program.program_id}`,
            bucket,
            template: null,
            name: program.name,
            isMeasurement: false,
            programId: program.program_id,
            cadence: { cadence_type: 'weekly', times_per_week: 3, weekdays: [0, 1, 2, 3, 4] },
        });
        pushToast({ kind: 'daycomplete', text: `Linked "${program.name}" — set its cadence below` });
    };

    const toggleWeekday = (pick, day) => {
        const current = new Set(pick.cadence.weekdays || []);
        if (current.has(day)) current.delete(day); else current.add(day);
        updateCadence(pick.key, { weekdays: [...current].sort() });
    };

    const createAll = async () => {
        setSaving(true);
        let created = 0;
        for (const pick of picks) {
            try {
                await habitService.createHabit({
                    bucket_id: pick.bucket.id,
                    name: pick.name,
                    template_id: pick.template?.id || null,
                    cadence_type: pick.cadence.cadence_type,
                    times_per_week: pick.cadence.cadence_type === 'weekly' ? pick.cadence.times_per_week : null,
                    weekdays: pick.cadence.cadence_type === 'weekdays' ? pick.cadence.weekdays : null,
                    habit_type: pick.isMeasurement ? 'measurement' : 'standard',
                    measurement_kind: pick.template?.measurement_kind || null,
                    measurement_unit: pick.template?.measurement_unit || null,
                    program_id: pick.programId || null,
                    target_value: pick.targetValue != null && pick.targetValue !== '' ? parseFloat(pick.targetValue) : null,
                });
                created += 1;
            } catch (err) {
                pushToast({
                    kind: 'partial',
                    text: `Couldn't add "${pick.name}"`,
                    sub: err.response?.data?.detail
                });
            }
        }
        setSaving(false);
        if (created > 0) {
            pushToast({ kind: 'daycomplete', text: `${created} habit${created > 1 ? 's' : ''} added — go log one!` });
            onCreated?.();
            onClose?.();
        }
    };

    if (!buckets) {
        return <div className="onboarding-page"><div className="today-skeleton">Loading the habit library…</div></div>;
    }

    return (
        <div className={`onboarding-page ${single ? 'picker-mode' : ''}`}>
            {!single && (
                <header className="onboarding-header">
                    <h1>Build the second version of you</h1>
                    <p>
                        Pick the habits that actually matter right now — you have{' '}
                        <strong>{slotLimit} slots</strong>. Start small; you'll earn more room as you level.
                    </p>
                </header>
            )}
            {single && (
                <header className="onboarding-header">
                    <h1>Add a habit</h1>
                    {onClose && <button className="picker-close" onClick={onClose}>×</button>}
                </header>
            )}

            <div className="bucket-list">
                {buckets.map((bucket) => (
                    <section className="bucket-card" key={bucket.id} style={{ '--bucket-color': bucket.color }}>
                        <div className="bucket-head">
                            <span className="bucket-icon">{bucket.icon}</span>
                            <div>
                                <h3>{bucket.name}</h3>
                                <p className="bucket-desc">{bucket.description}</p>
                            </div>
                            {bucket.attribute && <span className="bucket-attr">{bucket.attribute}</span>}
                        </div>
                        {bucket.key === 'strength_training' && (
                            <div className="program-ctas">
                                <button className="program-cta" onClick={() => setProgramBucket(bucket)}>
                                    ⭐ Create a workout program
                                    <span className="program-cta-sub">build days &amp; exercises, log per-set</span>
                                </button>
                                <button className="program-cta secondary" onClick={() => openExisting(bucket)}>
                                    📋 Use an existing program
                                    <span className="program-cta-sub">link a habit to one you already built</span>
                                </button>
                            </div>
                        )}
                        <div className="template-chips">
                            {bucket.templates.map((template) => {
                                const selected = picks.some((p) => p.key === `t${template.id}`);
                                return (
                                    <button
                                        key={template.id}
                                        className={`template-chip ${selected ? 'selected' : ''}`}
                                        onClick={() => togglePick(bucket, template)}
                                    >
                                        {selected ? '✓ ' : ''}{template.name}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="custom-row">
                            <input
                                type="text"
                                placeholder="name your own…"
                                value={customNames[bucket.id] || ''}
                                maxLength={60}
                                onChange={(e) => setCustomNames({ ...customNames, [bucket.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addCustom(bucket)}
                            />
                            <button onClick={() => addCustom(bucket)} disabled={!(customNames[bucket.id] || '').trim()}>
                                Add
                            </button>
                        </div>
                    </section>
                ))}
            </div>

            {picks.length > 0 && (
                <div className="picks-tray">
                    <div className="picks-header">
                        <strong>Your picks</strong>
                        <span>{standardPicks.length}/{slotLimit} slots</span>
                    </div>
                    {picks.map((pick) => (
                        <div className="pick-row" key={pick.key}>
                            <div className="pick-name">
                                {pick.bucket.icon} {pick.name}
                                {pick.isMeasurement && <span className="pick-tag">measurement</span>}
                            </div>
                            {pick.isMeasurement && (
                                <input
                                    className="pick-goal"
                                    type="number"
                                    step="0.1"
                                    inputMode="decimal"
                                    placeholder={`goal${pick.template?.measurement_unit ? ` (${pick.template.measurement_unit})` : ''}`}
                                    value={pick.targetValue ?? ''}
                                    onChange={(e) => updatePick(pick.key, { targetValue: e.target.value })}
                                />
                            )}
                            <div className="cadence-editor">
                                <select
                                    value={pick.cadence.cadence_type}
                                    onChange={(e) => updateCadence(pick.key, { cadence_type: e.target.value })}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">N× per week</option>
                                    <option value="weekdays">Specific days</option>
                                </select>
                                {pick.cadence.cadence_type === 'weekly' && (
                                    <span className="times-stepper">
                                        <button onClick={() => updateCadence(pick.key, {
                                            times_per_week: Math.max(1, pick.cadence.times_per_week - 1)
                                        })}>−</button>
                                        {pick.cadence.times_per_week}×/wk
                                        <button onClick={() => updateCadence(pick.key, {
                                            times_per_week: Math.min(7, pick.cadence.times_per_week + 1)
                                        })}>＋</button>
                                    </span>
                                )}
                                {pick.cadence.cadence_type === 'weekdays' && (
                                    <span className="weekday-toggles">
                                        {WEEKDAY_LABELS.map((label, day) => (
                                            <button
                                                key={day}
                                                className={pick.cadence.weekdays?.includes(day) ? 'wd active' : 'wd'}
                                                onClick={() => toggleWeekday(pick, day)}
                                            >{label}</button>
                                        ))}
                                    </span>
                                )}
                                <button className="pick-remove" onClick={() => setPicks(picks.filter((p) => p.key !== pick.key))}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                    <button className="picks-confirm" onClick={createAll} disabled={saving}>
                        {saving ? 'Setting up…' : single ? 'Add habit' : `Start with ${picks.length} habit${picks.length > 1 ? 's' : ''}`}
                    </button>
                </div>
            )}

            {programBucket && (
                <ProgramBuilder
                    mode="create"
                    onSaved={onProgramSaved}
                    onClose={() => setProgramBucket(null)}
                />
            )}

            {existingBucket && (
                <div className="existing-overlay" onClick={() => setExistingBucket(null)}>
                    <div className="existing-sheet" onClick={(e) => e.stopPropagation()}>
                        <h2 className="existing-title">Your workout programs</h2>
                        {existingPrograms == null && <p className="existing-hint">Loading…</p>}
                        {existingPrograms && existingPrograms.length === 0 && (
                            <p className="existing-hint">No programs yet — use “Create a workout program” above.</p>
                        )}
                        {existingPrograms && existingPrograms.map((p) => {
                            const dayCount = (p.workout_days || []).length;
                            return (
                                <button key={p.program_id} className="existing-row" onClick={() => linkExisting(p)}>
                                    <span className="existing-name">{p.name}</span>
                                    <span className="existing-meta">{dayCount} day{dayCount === 1 ? '' : 's'}</span>
                                </button>
                            );
                        })}
                        <button className="existing-close" onClick={() => setExistingBucket(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingPicker;
