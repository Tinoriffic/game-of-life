/** Human-readable stat formats shared by the stats surfaces. */

/** 8.99 (decimal minutes per mile) → "8:59" */
export const formatPace = (minPerMile) => {
    if (minPerMile == null || !isFinite(minPerMile) || minPerMile <= 0) return '—';
    const totalSeconds = Math.round(minPerMile * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** 534 (minutes) → "8h 54m"; 45 → "45m"; 120 → "2h" */
export const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return '0m';
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (hours === 0) return `${mins}m`;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};
