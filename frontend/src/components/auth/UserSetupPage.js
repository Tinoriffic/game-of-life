import React, { useMemo, useRef, useState } from 'react';
import axiosInstance from '../../axios';
import debounce from 'lodash/debounce';
import { useLocation, Link } from 'react-router-dom';
import { baseUrl } from '../../config/apiConfig';
import './UserSetupPage.css';

/**
 * Stage 2 + 3 of registration (shared by Google and email sign-ups):
 * claim a username, then fill in the player card basics.
 */
const UserSetupPage = () => {
  const [username, setUsername] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const location = useLocation();
  // Google's redirect delivers the token in the URL; the email flow passes it
  // via router state so the payload never lands in browser history.
  const oAuthValidationToken =
    new URLSearchParams(location.search).get('token') || location.state?.token;

  // null = untouched, 'checking' | 'available' | 'taken' | 'short' | 'expired'
  const [usernameStatus, setUsernameStatus] = useState(null);
  const registrationTokenRef = useRef(null);

  const checkUsername = useMemo(
    () =>
      debounce(async (candidate) => {
        try {
          const response = await axiosInstance.post(`${baseUrl}/set-username`, {
            username: candidate,
            token: oAuthValidationToken,
          });
          registrationTokenRef.current = response.data.registration_token;
          setUsernameStatus('available');
          setError('');
        } catch (err) {
          const detail = err.response?.data?.detail;
          if (detail === 'Username already taken') {
            setUsernameStatus('taken');
          } else if (detail === 'Invalid token') {
            setUsernameStatus('expired');
          } else {
            setUsernameStatus(null);
            setError(detail || 'Could not check that username - try again.');
          }
        }
      }, 400),
    [oAuthValidationToken]
  );

  const handleUsernameChange = (e) => {
    const next = e.target.value;
    setUsername(next);
    registrationTokenRef.current = null;
    setError('');
    if (next.trim().length >= 4) {
      setUsernameStatus('checking');
      checkUsername(next.trim());
    } else {
      checkUsername.cancel();
      setUsernameStatus(next ? 'short' : null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const response = await axiosInstance.post(`${baseUrl}/finalize-oauth-registration`, {
        occupation: occupation.trim(),
        city: city.trim(),
        temp_token: registrationTokenRef.current,
      });
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      // Full reload (like the OAuth TokenReceiver) so the user context
      // hydrates fresh from /users/me.
      window.location.href = '/';
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        detail === 'Invalid registration token'
          ? 'Your session expired - head back to the login page and start again.'
          : detail || 'Could not create your account - try again.'
      );
      setSubmitting(false);
    }
  };

  if (!oAuthValidationToken) {
    return (
      <div className="setup-page">
        <div className="setup-card">
          <div className="setup-logo">ME <span className="setup-logo-v">v2</span></div>
          <h1>Session expired</h1>
          <p className="setup-sub">
            This page only works right after signing up. Head back and start again.
          </p>
          <Link to="/login" className="setup-submit setup-submit-link">Back to login</Link>
        </div>
      </div>
    );
  }

  const usernameHints = {
    checking: { text: 'Checking availability…', cls: 'muted' },
    available: { text: '✓ Available - it’s yours', cls: 'ok' },
    taken: { text: '✗ Taken - try another', cls: 'bad' },
    short: { text: 'At least 4 characters', cls: 'muted' },
    expired: { text: 'Session expired - go back to login and start again', cls: 'bad' },
  };
  const hint = usernameStatus ? usernameHints[usernameStatus] : null;

  const canSubmit =
    usernameStatus === 'available' &&
    occupation.trim().length >= 4 &&
    city.trim().length >= 2 &&
    !submitting;

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-logo">ME <span className="setup-logo-v">v2</span></div>
        <h1>Create your player</h1>
        <p className="setup-sub">Almost there - this is how you'll appear in the game.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="setup-field">
            <span className="setup-label">Username</span>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="e.g. tino"
              autoComplete="username"
              autoFocus
              maxLength={30}
              className={
                usernameStatus === 'available' ? 'valid'
                  : usernameStatus === 'taken' ? 'invalid' : ''
              }
            />
            {hint && <span className={`setup-hint ${hint.cls}`}>{hint.text}</span>}
          </label>

          <label className="setup-field">
            <span className="setup-label">Occupation</span>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="What do you do? (student, engineer, chef…)"
              maxLength={60}
            />
            {occupation.trim().length > 0 && occupation.trim().length < 4 && (
              <span className="setup-hint muted">At least 4 characters</span>
            )}
          </label>

          <label className="setup-field">
            <span className="setup-label">City</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Where are you based?"
              maxLength={60}
            />
          </label>

          {error && <div className="setup-error">{error}</div>}

          <button type="submit" className="setup-submit" disabled={!canSubmit}>
            {submitting ? 'Creating your player…' : 'Enter the game →'}
          </button>
        </form>

        <p className="setup-fineprint">
          You can change your avatar and details later from your profile.
        </p>
      </div>
    </div>
  );
};

export default UserSetupPage;
