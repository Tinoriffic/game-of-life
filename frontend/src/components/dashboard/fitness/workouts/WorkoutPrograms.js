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
  const [hasArchived, setHasArchived] = useState(false);
  const [archivedPrograms, setArchivedPrograms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    fetchWorkoutPrograms();
  }, [showArchived]);

  const fetchWorkoutPrograms = async () => {
    try {
      const response = await axiosInstance.get(`/users/${user.id}/workout-programs?include_archived=${showArchived}`);
      setPrograms(response.data.programs);
      setHasArchived(response.data.has_archived);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch workout programs', error);
      setError('Failed to fetch workout programs. Please try again.');
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
      await fetchWorkoutPrograms();
      setIsModalOpen(false);
      setError(null);
      console.log("Successfully saved workout program");
    } catch (error) {
      console.error('Failed to save workout program', error.response?.data);
      throw error;
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

  // const handleDeleteProgram = async (programId) => {
  //   try {
  //     await axiosInstance.delete(`/workout-programs/${programId}`);
  //     fetchWorkoutPrograms();
  //     setIsModalOpen(false);
  //     setError(null);
  //     console.log("Successfully deleted workout program");
  //   } catch (error) {
  //     console.error('Failed to delete workout program', error);
  //     if (error.response && error.response.status === 404) {
  //       setError('Workout program not found or already deleted.');
  //     } else {
  //       setError('Failed to delete workout program. Please try again.');
  //     }
  //     setIsModalOpen(false);
  //   }
  // };

  const handleArchiveProgram = async (programId) => {
    try {
      await axiosInstance.put(`/workout-programs/${programId}/archive`);
      fetchWorkoutPrograms();
      setIsModalOpen(false);
      setError(null);
    } catch (error) {
      console.error('Failed to archive workout program', error);
      setError('Failed to archive workout program. Please try again.');
    }
  };

  const handleUnarchiveProgram = async (programId) => {
    try {
      await axiosInstance.put(`/workout-programs/${programId}/unarchive`);
      fetchWorkoutPrograms();
      setError(null);
    } catch (error) {
      console.error('Failed to unarchive workout program', error);
      setError('Failed to unarchive workout program. Please try again.');
    }
  };

  return (
    <div className="workout-programs-container">
      <h1>Fitness Activities</h1>
      {error && <div className="error-message">{error}</div>}
      {hasArchived && (
        <button onClick={() => setShowArchived(!showArchived)} className="toggle-archived-button">
          {showArchived ? 'Hide Archived Programs' : 'Show Archived Programs'}
        </button>
      )}
      <button onClick={handleCreateProgram} className="create-program-button">
        Create New Program
      </button>
      {programs.length > 0 ? (
        programs.map((program) => (
          <div 
            key={program.program_id} 
            className={`program-card ${program.status === 'archived' ? 'archived' : ''}`}
            onClick={() => handleProgramClick(program)}
          >
            <button
              className="settings-icon-button"
              onClick={(event) => handleEditProgram(program, event)}
            >
              <img src={settingsIcon} alt="settings" className="settings-icon" />
            </button>
            <h3>{program.name}</h3>
            {program.status === 'archived' && <p className="archived-label">Archived</p>}
          </div>
        ))
      ) : (
        <p className="no-programs-message">You don't have any workout programs yet. Click 'Create New Program' to get started!</p>
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
              onArchive={handleArchiveProgram}
              onUnarchive={handleUnarchiveProgram}
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