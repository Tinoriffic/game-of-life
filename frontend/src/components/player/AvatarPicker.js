import React, { useState } from 'react';
import axiosInstance from '../../axios';
import './AvatarPicker.css';

// Self-contained SVG presets (data URIs): no uploads, no external service.
const preset = (emoji, from, to) => `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>`
    + `</linearGradient></defs>`
    + `<rect width="120" height="120" fill="url(#g)"/>`
    + `<text x="60" y="78" font-size="58" text-anchor="middle">${emoji}</text></svg>`
)}`;

const PRESETS = [
    preset('⚔️', '#1a1a2e', '#3d2c8d'),
    preset('🐉', '#0f3d3e', '#145214'),
    preset('🦅', '#2c2c54', '#40407a'),
    preset('🐺', '#232526', '#414345'),
    preset('🦁', '#7b4397', '#dc2430'),
    preset('🥷', '#141e30', '#243b55'),
    preset('🧙', '#42275a', '#734b6d'),
    preset('⚡', '#16222a', '#3a6073'),
    preset('🔥', '#8e0e00', '#1f1c18'),
    preset('🌊', '#1a2980', '#26d0ce'),
    preset('🌙', '#0f2027', '#2c5364'),
    preset('👑', '#493240', '#b8860b'),
];

/**
 * Pick a preset avatar or paste an https image URL. Presets are inline SVGs,
 * so they work offline and need no storage bucket.
 */
const AvatarPicker = ({ current, onSaved, onClose }) => {
    const [selected, setSelected] = useState(current || null);
    const [customUrl, setCustomUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const save = async () => {
        const url = customUrl.trim() || selected;
        if (!url || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await axiosInstance.put('/users/me/avatar', { avatar_url: url });
            onSaved(res.data.avatar_url);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not update avatar');
            setBusy(false);
        }
    };

    return (
        <div className="avatar-overlay" onClick={onClose}>
            <div className="avatar-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="avatar-heading">Choose your avatar</h3>
                {error && <div className="avatar-error">{error}</div>}

                <div className="avatar-grid">
                    {PRESETS.map((url) => (
                        <button
                            key={url}
                            className={`avatar-option ${selected === url && !customUrl.trim() ? 'active' : ''}`}
                            onClick={() => { setSelected(url); setCustomUrl(''); }}
                        >
                            <img src={url} alt="Avatar preset" />
                        </button>
                    ))}
                </div>

                <label className="avatar-custom">
                    <span>Or paste an image URL</span>
                    <input
                        type="url" placeholder="https://…" value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                    />
                </label>

                <div className="avatar-actions">
                    <button className="avatar-cancel" onClick={onClose}>Cancel</button>
                    <button className="avatar-save" onClick={save}
                            disabled={busy || (!customUrl.trim() && !selected)}>
                        {busy ? 'Saving…' : 'Save avatar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarPicker;
