import React, { useLayoutEffect, useState } from 'react';

const CELL_PX = 13;
const GAP_PX = 3;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * GitHub-style streak grid on the home surface — the ripples replacement,
 * living where it's seen daily, not buried in a stats tab.
 *
 * Fixed `weeks` wide by default (Today view). With `responsive`, renders as
 * many full weeks as fit the container — no horizontal scroll, newest week
 * always on screen (Stats view).
 */
const MiniHeatmap = ({ heatmap, weeks = 17, responsive = false, showMonths = false }) => {
    const [wrapEl, setWrapEl] = useState(null);
    const [fitWeeks, setFitWeeks] = useState(null);

    useLayoutEffect(() => {
        if (!responsive || !wrapEl) return undefined;
        const compute = () =>
            setFitWeeks(Math.max(4, Math.floor((wrapEl.clientWidth + GAP_PX) / (CELL_PX + GAP_PX))));
        compute();
        const observer = new ResizeObserver(compute);
        observer.observe(wrapEl);
        return () => observer.disconnect();
    }, [responsive, wrapEl]);

    if (!heatmap?.days?.length) return null;

    const windowWeeks = responsive ? Math.min(fitWeeks || weeks, 52) : weeks;
    const days = heatmap.days.slice(-windowWeeks * 7);
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

    const monthOf = (column) => new Date(`${column[0].date}T12:00:00`).getMonth();

    return (
        <div className={`mini-heatmap${responsive ? ' hm-responsive' : ''}`} ref={setWrapEl}>
            <div className="hm-header">
                <span className="section-label">LAST {Math.round(days.length / 7)} WEEKS</span>
                <span className="hm-legend">
                    <span className="hm-cell" /> none
                    <span className="hm-cell hm-some" /> logged
                    <span className="hm-cell hm-partial" /> partial
                    <span className="hm-cell hm-complete" /> complete
                </span>
            </div>
            {showMonths && columns.length > 1 && (
                <div className="hm-months">
                    {columns.map((column, ci) => (
                        <span className="hm-month" key={column[0].date}>
                            {ci > 0 && monthOf(column) !== monthOf(columns[ci - 1])
                                ? MONTHS[monthOf(column)]
                                : ''}
                        </span>
                    ))}
                </div>
            )}
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
