import React, { useState } from 'react';
import './Focus.css';

/** Edit the pre-flight ritual, one item per line. Used from the Clicks page
 *  footer and from the "Set the stage" sheet itself. */
const RitualEditor = ({ ritual, onClose, onSave }) => {
    const [text, setText] = useState(ritual.join('\n'));
    return (
        <div className="focus-overlay" onClick={onClose}>
            <div className="focus-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="sheet-heading">Pre-flight ritual</h3>
                <p className="sheet-sub">One item per line - shown before each focus session.</p>
                <textarea
                    className="ritual-textarea" rows={8} value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="sheet-actions">
                    <button className="btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn-gold"
                            onClick={() => onSave(text.split('\n').map((l) => l.trim()).filter(Boolean))}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RitualEditor;
