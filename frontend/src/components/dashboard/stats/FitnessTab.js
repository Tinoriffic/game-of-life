import React, { useEffect, useState } from 'react';
import { useUser } from '../../player/UserContext';
import axiosInstance from '../../../axios';
import WeightProgress from './components/WeightProgress';
import StrengthProgression from './components/StrengthProgression';

/** The Fitness tab: strength curves + weight vs goal, isolated from the consistency story. */
const FitnessTab = () => {
  const { user } = useUser();
  const [strength, setStrength] = useState(null);
  const [weight, setWeight] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.allSettled([
      axiosInstance.get(`/users/${user.id}/strength-progression`),
      axiosInstance.get(`/users/${user.id}/stats`),
    ]).then(([strengthRes, legacyRes]) => {
      if (strengthRes.status === 'fulfilled') setStrength(strengthRes.value.data);
      else console.error('Error fetching strength progression:', strengthRes.reason);
      if (legacyRes.status === 'fulfilled') setWeight(legacyRes.value.data.weight);
      else console.error('Error fetching weight stats:', legacyRes.reason);
      setLoaded(true);
    });
  }, [user?.id]);

  if (!loaded) return <div className="loading">Loading fitness stats…</div>;

  const hasStrength = strength?.exercises?.length > 0;
  if (!hasStrength && !weight) {
    return (
      <p className="stats-empty">
        Log a workout or a weigh-in and this tab comes alive.
      </p>
    );
  }

  return (
    <>
      <StrengthProgression data={strength} />
      {weight && <WeightProgress data={weight} />}
    </>
  );
};

export default FitnessTab;
