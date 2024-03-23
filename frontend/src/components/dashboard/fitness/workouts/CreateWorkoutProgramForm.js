import React, { useState } from 'react';
import './CreateWorkoutProgramForm.css';

const initialProgramState = {
  name: '',
  workout_days: [
    {
      day_name: '',
      exercises: [
        {
          name: '',
          sets: 3,
          recommended_reps: 0,
          recommended_weight: 0,
        },
      ],
    },
  ],
};

const CreateWorkoutProgramForm = ({ onSave, onClose }) => {
  const [program, setProgram] = useState(initialProgramState);

  const handleInputChange = (e, index, exerciseIndex = null) => {
    const { name, value } = e.target;
    if (exerciseIndex !== null) {
      const updatedProgram = { ...program };
      updatedProgram.workout_days[index].exercises[exerciseIndex][name] = value;
      setProgram(updatedProgram);
    } else if (name === 'day_name') {
      const updatedDays = [...program.workout_days];
      updatedDays[index][name] = value;
      setProgram({ ...program, workout_days: updatedDays });
    } else {
      setProgram({ ...program, [name]: value });
    }
  };

  const addDay = () => {
    setProgram({
      ...program,
      workout_days: [...program.workout_days, { day_name: '', exercises: [{ name: '', sets: 3 }] }],
    });
  };

  const addExercise = (dayIndex) => {
    const updatedProgram = { ...program };
    updatedProgram.workout_days[dayIndex].exercises.push({ name: '', sets: 3 });
    setProgram(updatedProgram);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(program);
    setProgram(initialProgramState);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Program Name:
        <input
          type="text"
          name="name"
          value={program.name}
          onChange={handleInputChange}
        />
      </label>
      {program.workout_days.map((day, index) => (
        <div key={index}>
          <label>
            Day Name:
            <input
              type="text"
              name="day_name"
              value={day.day_name}
              onChange={(e) => handleInputChange(e, index)}
            />
          </label>
          {day.exercises.map((exercise, exerciseIndex) => (
            <div key={exerciseIndex}>
              <label>
                Exercise Name:
                <input
                  type="text"
                  name="name"
                  value={exercise.name}
                  onChange={(e) => handleInputChange(e, index, exerciseIndex)}
                />
              </label>
              <label>
                Sets:
                <input
                  type="number"
                  name="sets"
                  value={exercise.sets}
                  onChange={(e) => handleInputChange(e, index, exerciseIndex)}
                />
              </label>
              {/* Include inputs for reps and weight as needed */}
            </div>
          ))}
          <button type="button" onClick={() => addExercise(index)}>Add Exercise</button>
        </div>
      ))}
      <button type="button" onClick={addDay}>Add Day</button>
      <button type="submit" className="save-button">Save Program</button>
      <button type="button" onClick={onClose} className="cancel-button" style={{ backgroundColor: '#f44336' }}>Cancel</button>
    </form>
  );
};

export default CreateWorkoutProgramForm;
