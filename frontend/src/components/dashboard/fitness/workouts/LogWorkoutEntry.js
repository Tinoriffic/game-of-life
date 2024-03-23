import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import './LogWorkoutEntry.css';
import { useUser } from '../../../player/UserContext';

const LogWorkoutEntry = ({ program, onClose }) => {
  const [workoutDays, setWorkoutDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loggedExercises, setLoggedExercises] = useState([]);
  const { user } = useUser();

  useEffect(() => {
    if (program) {
      fetchWorkoutProgramDetails();
    }
  }, [program]);

  const fetchWorkoutProgramDetails = async () => {
    try {
      const response = await axiosInstance.get(`/workout-programs/${program.program_id}/program-details`);
      const groupedData = response.data.reduce((acc, item) => {
        if (!acc[item.day_name]) {
          acc[item.day_name] = {
            day_id: item.day_id,
            day_name: item.day_name,
            exercises: [],
          };
        }
        acc[item.day_name].exercises.push({
          program_exercise_id: item.program_exercise_id,
          exercise_name: item.exercise_name,
          sets: item.sets,
        });
        return acc;
      }, {});

      setWorkoutDays(Object.values(groupedData));
      setSelectedDay(Object.values(groupedData)[0]?.day_name || null);
    } catch (error) {
      console.error('Failed to fetch workout program details', error);
    }
  };

  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
  };

  const handleExerciseChange = (programExerciseId, setIndex, field, value) => {
    const updatedExercises = [...loggedExercises];
    const exerciseIndex = updatedExercises.findIndex((exercise) => exercise.program_exercise_id === programExerciseId);
  
    if (exerciseIndex !== -1) {
      updatedExercises[exerciseIndex].sets[setIndex] = {
        ...updatedExercises[exerciseIndex].sets[setIndex],
        [field]: value,
      };
    } else {
      const newExercise = {
        program_exercise_id: programExerciseId,
        sets: Array(setIndex + 1)
          .fill()
          .map((_, index) => (index === setIndex ? { [field]: value } : {})),
      };
      updatedExercises.push(newExercise);
    }
  
    setLoggedExercises(updatedExercises);
  };

  const handleSubmit = async () => {
    try {
      await axiosInstance.post(`/users/${user.id}/workout-sessions`, {
        program_id: program.program_id,
        date: new Date().toISOString(),
        exercises: loggedExercises,
      });
      onClose();
    } catch (error) {
      console.error('Failed to log workout entry', error);
    }
  };

  return (
    <div className="log-workout-entry">
      <h2>Log Workout Entry</h2>
      {workoutDays.length > 0 ? (
        <>
          <div>
            <label htmlFor="day-select">Select Workout Day:</label>
            <select id="day-select" value={selectedDay} onChange={handleDayChange}>
              {workoutDays.map((day) => (
                <option key={day.day_id} value={day.day_name}>
                  {day.day_name}
                </option>
              ))}
            </select>
          </div>
          {selectedDay && (
            <div>
              {workoutDays
                .find((day) => day.day_name === selectedDay)
                ?.exercises?.map((exercise) => (
                  <div key={exercise.program_exercise_id} className="exercise-entry">
                    <h3>{exercise.exercise_name}</h3>
                    {Array.from({ length: exercise.sets }, (_, setIndex) => (
                      <div key={setIndex} className="set-entry">
                        <label>
                          Set {setIndex + 1} Weight:
                          <input
                            type="number"
                            value={loggedExercises.find((e) => e.program_exercise_id === exercise.program_exercise_id)?.sets[setIndex]?.performed_weight || ''}
                            onChange={(e) => handleExerciseChange(exercise.program_exercise_id, setIndex, 'performed_weight', parseInt(e.target.value))}
                          />
                        </label>
                        <label>
                          Set {setIndex + 1} Reps:
                          <input
                            type="number"
                            value={loggedExercises.find((e) => e.program_exercise_id === exercise.program_exercise_id)?.sets[setIndex]?.performed_reps || ''}
                            onChange={(e) => handleExerciseChange(exercise.program_exercise_id, setIndex, 'performed_reps', parseInt(e.target.value))}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
          <button onClick={handleSubmit}>Log Workout</button>
          <button onClick={onClose}>Cancel</button>
        </>
      ) : (
        <p>No workout days found for this program.</p>
      )}
    </div>
  );
};

export default LogWorkoutEntry;