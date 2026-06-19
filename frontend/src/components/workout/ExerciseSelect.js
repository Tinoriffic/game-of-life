import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ExerciseSelect.css';

/**
 * Searchable + scrollable exercise picker. Replaces the native <select>, which
 * on mobile opens a wheel picker you can't type-search. Here you can either
 * type to filter or just scroll the alphabetical list — both work without a
 * keyboard. Options are always sorted A–Z.
 */
const ExerciseSelect = ({ value, options, onChange, placeholder = 'Select exercise…' }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    const sorted = useMemo(
        () => [...(options || [])].sort((a, b) => a.name.localeCompare(b.name)),
        [options]
    );
    const selected = sorted.find((o) => String(o.exercise_id) === String(value));
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter((o) => o.name.toLowerCase().includes(q));
    }, [sorted, query]);

    // Close on outside tap (mouse + touch so it works on the phone too).
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, [open]);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const pick = (id) => { onChange(id); setOpen(false); setQuery(''); };

    return (
        <div className={`exsel ${open ? 'open' : ''}`} ref={wrapRef}>
            <button type="button" className="exsel-trigger" onClick={() => setOpen((o) => !o)}>
                <span className={selected ? 'exsel-value' : 'exsel-placeholder'}>
                    {selected ? selected.name : placeholder}
                </span>
                <span className="exsel-caret">▾</span>
            </button>
            {open && (
                <div className="exsel-panel">
                    <input
                        ref={inputRef}
                        className="exsel-search"
                        type="text"
                        placeholder="Search exercises…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="exsel-list">
                        {filtered.map((o) => (
                            <button
                                type="button"
                                key={o.exercise_id}
                                className={`exsel-option ${String(o.exercise_id) === String(value) ? 'sel' : ''}`}
                                onClick={() => pick(o.exercise_id)}
                            >
                                {o.name}
                            </button>
                        ))}
                        {filtered.length === 0 && <div className="exsel-empty">No matches</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExerciseSelect;
