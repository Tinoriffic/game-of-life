import React from 'react';

/**
 * GitHub-style streak grid on the home surface — the ripples replacement,
 * living where it's seen daily, not buried in a stats tab.
 */
const MiniHeatmap = ({ heatmap, weeks = 17 }) => {
    if (!heatmap?.days?.length) return null;

    const days = heatmap.days.slice(-weeks * 7);
    // Pad so columns align to weeks ending today.
    const columns = [];
    for (let i = 0; i < days.length; i += 7) {
        columns.push(days.slice(i, i + 7));
    }

    const cellClass = (day) => {
        if (day.status === 'complete') return 'hm-cell hm-complete';
        if (day.status === 'partial') return 'hm-cell hm-partial';
        if (day.count > 0) return 'hm-cell hm-some';
        return 'hm-cell';
    };

    return (
        <div className="mini-heatmap">
            <div className="hm-header">
                <span className="section-label">LAST {Math.round(days.length / 7)} WEEKS</span>
                <span className="hm-legend">
                    <span className="hm-cell" /> none
                    <span className="hm-cell hm-some" /> logged
                    <span className="hm-cell hm-partial" /> partial
                    <span className="hm-cell hm-complete" /> complete
                </span>
            </div>
            <div className="hm-grid">
                {columns.map((column, ci) => (
                    <div className="hm-column" key={ci}>
                        {column.map((day) => (
                            <div
                                key={day.date}
                                className={cellClass(day)}
                                title={`${day.date}: ${day.count} log${day.count === 1 ? '' : 's'}${day.status !== 'none' ? ` · ${day.status}` : ''}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MiniHeatmap;
