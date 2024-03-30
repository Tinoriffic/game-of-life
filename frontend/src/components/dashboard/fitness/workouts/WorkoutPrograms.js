import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import Modal from '../../../common/Modal';
import CreateWorkoutProgramForm from './CreateWorkoutProgramForm';
import EditWorkoutProgramForm from './EditWorkoutProgramForm';
import LogWorkoutEntry from './LogWorkoutEntry';
import { useUser } from '../../../player/UserContext';
import settingsIcon from '../../../../assets/cog-wheel.png';
import './WorkoutPrograms.css';

const WorkoutPrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    fetchWorkoutPrograms();
  }, []);

  const fetchWorkoutPrograms = async () => {
    try {
      const response = await axiosInstance.get(`/users/${user.id}/workout-programs`);
      setPrograms(response.data);
      console.log("Fetched Programs: ")
      console.log(response.data);
    } catch (error) {
      console.error('Failed to fetch workout programs', error);
    }
  };

  const saveWorkoutProgram = async (programData) => {
    try {
      if (selectedProgram) {
        console.log("Edited Program: ")
        console.log(programData);
        await axiosInstance.put(`/workout-programs/${selectedProgram.program_id}`, programData);
      } else {
        await axiosInstance.post(`/users/${user.id}/workout-programs`, programData);
      }
      fetchWorkoutPrograms();
      setIsModalOpen(false);
      console.log("Successfully saved workout program");
    } catch (error) {
      console.error('Failed to save workout program', error);
    }
  };

  const handleCreateProgram = () => {
    setSelectedProgram(null);
    setModalContent('create');
    setIsModalOpen(true);
  };

  const handleEditProgram = (program, event) => {
    event.stopPropagation();
    setSelectedProgram(program);
    setModalContent('edit');
    setIsModalOpen(true);
  };

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
    setModalContent('log');
    setIsModalOpen(true);
  };

  const handleDeleteProgram = async (programId) => {
    try {
      await axiosInstance.delete(`/workout-programs/${programId}`);
      fetchWorkoutPrograms();
      setIsModalOpen(false);
      console.log("Successfully deleted workout program");
    } catch (error) {
      console.error('Failed to delete workout program', error);
    }
  };

  return (
    <div className="workout-programs-container">
      <h1>Fitness Activities</h1>
      <button onClick={handleCreateProgram} className="create-program-button">
        Create New Program
      </button>
      {programs.length ? (
        programs.map((program) => (
          <div 
            key={program.program_id} 
            className="program-card" 
            onClick={() => handleProgramClick(program)}
          >
            <button
              className="settings-icon-button"
              onClick={(event) => handleEditProgram(program, event)}
            >
              <img src={settingsIcon} alt="settings" className="settings-icon" />
            </button>
            <h3>{program.name}</h3>
          </div>
        ))
      ) : (
        <p>No workout programs found. Create your first one!</p>
      )}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          {modalContent === 'create' && (
            <CreateWorkoutProgramForm
              onSave={saveWorkoutProgram}
              onClose={() => setIsModalOpen(false)}
            />
          )}
          {modalContent === 'edit' && selectedProgram && (
            <EditWorkoutProgramForm
              program={selectedProgram}
              onSave={saveWorkoutProgram}
              onDelete={handleDeleteProgram}
              onClose={() => setIsModalOpen(false)}
            />
          )}
          {modalContent === 'log' && selectedProgram && (
            <LogWorkoutEntry
              program={selectedProgram}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

export default WorkoutPrograms;