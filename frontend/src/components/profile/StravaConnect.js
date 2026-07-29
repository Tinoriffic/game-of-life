import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stravaService } from '../../services/stravaService';
import { useFeedback } from '../feedback/FeedbackContext';
import './StravaConnect.css';

const RETURN_MESSAGES = {
    connected: { kind: 'daycomplete', text: 'Strava connected — syncing your runs' },
    denied: { kind: 'partial', text: 'Strava connection was cancelled' },
    error: { kind: 'partial', text: "Couldn't connect Strava — try again" }
};

/**
 * Profile section: link a Strava account so runs auto-import into a Cardio
 * habit. Hidden entirely when the server has no Strava app configured.
 */
const StravaConnect = () => {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const { pushToast } = useFeedback();

    const load = useCallback(async () => {
        try {
            setStatus(await stravaService.getStatus());
        } catch (err) {
            console.error('Error loading Strava status:', err);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Handle the OAuth return (?strava=connected|denied|error): toast, then
    // auto-sync on a fresh connect so runs show up without a second tap.
    useEffect(() => {
        const outcome = searchParams.get('strava');
        if (!outcome) return;
        const message = RETURN_MESSAGES[outcome];
        if (message) pushToast(message);
        searchParams.delete('strava');
        setSearchParams(searchParams, { replace: true });
        if (outcome === 'connected') {
            load().then(() => sync());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const connect = async () => {
        setBusy(true);
        try {
            await stravaService.connect();   // navigates away (web) / opens browser (native)
        } catch (err) {
            pushToast({ kind: 'partial', text: 'Could not start Strava connect' });
            setBusy(false);
        }
    };

    const sync = async () => {
        setBusy(true);
        try {
            const result = await stravaService.sync();
            if (result.imported > 0) {
                pushToast({
                    kind: 'daycomplete',
                    text: `Imported ${result.imported} activit${result.imported === 1 ? 'y' : 'ies'} across ${result.days_logged} day${result.days_logged === 1 ? '' : 's'}`
                });
            } else {
                pushToast({ kind: 'partial', text: 'No new activities to import' });
            }
            await load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Sync failed' });
        } finally {
            setBusy(false);
        }
    };

    const changeTarget = async (habitId) => {
        try {
            setStatus(await stravaService.updateSettings({ target_habit_id: Number(habitId) }));
            pushToast({ kind: 'daycomplete', text: 'Runs will log to that habit' });
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not update' });
        }
    };

    const toggleRides = async () => {
        try {
            setStatus(await stravaService.updateSettings({ import_rides: !status.import_rides }));
        } catch (err) {
            pushToast({ kind: 'partial', text: 'Could not update' });
        }
    };

    const disconnect = async () => {
        if (!window.confirm('Disconnect Strava? Your imported runs stay; new ones stop syncing.')) return;
        try {
            await stravaService.disconnect();
            pushToast({ kind: 'partial', text: 'Strava disconnected' });
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: 'Could not disconnect' });
        }
    };

    if (!status || !status.configured) return null;

    if (!status.connected) {
        return (
            <div className="strava-card">
                <div className="strava-head">
                    <span className="strava-logo">🟧 Strava</span>
                </div>
                <p className="strava-desc">Auto-import your runs so you never log them by hand.</p>
                <button className="strava-connect-btn" onClick={connect} disabled={busy}>
                    {busy ? 'Opening Strava…' : 'Connect Strava'}
                </button>
            </div>
        );
    }

    const habits = status.cardio_habits || [];
    const lastSynced = status.last_synced_at
        ? new Date(status.last_synced_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'never';

    return (
        <div className="strava-card">
            <div className="strava-head">
                <span className="strava-logo">🟧 Strava</span>
                <span className="strava-connected">connected</span>
            </div>

            <label className="strava-field">
                <span>Runs log to</span>
                {habits.length > 0 ? (
                    <select value={status.target_habit_id || ''} onChange={(e) => changeTarget(e.target.value)}>
                        {!status.target_habit_id && <option value="">Pick a Cardio habit…</option>}
                        {habits.map((h) => (
                            <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
                        ))}
                    </select>
                ) : (
                    <span className="strava-note">Add a Cardio habit first</span>
                )}
            </label>

            <label className="strava-toggle">
                <input type="checkbox" checked={status.import_rides} onChange={toggleRides} />
                <span>Also import rides</span>
            </label>

            <div className="strava-actions">
                <button className="strava-sync-btn" onClick={sync} disabled={busy || !status.target_habit_id}>
                    {busy ? 'Syncing…' : 'Sync now'}
                </button>
                <button className="strava-disconnect" onClick={disconnect}>Disconnect</button>
            </div>
            <p className="strava-lastsync">Last synced: {lastSynced}</p>
        </div>
    );
};

export default StravaConnect;
