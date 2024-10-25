import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import axiosInstance from '../../../../axios';

const CreateExerciseForm = ({ onSave, onCancel, exerciseLibrary, userId }) => {
    const [formData, setFormData] = useState({/* ... */});
    const [lookupData, setLookupData] = useState({
      categories: [],
      muscleGroups: [],
      equipment: [],
      difficultyLevels: [],
      exerciseTypes: []
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLookupData = async () => {
        try {
          const response = await axiosInstance.get('/exercises/lookup-data');
          setLookupData({
            categories: response.data.categories.map(cat => ({
              value: cat.id,
              label: cat.name
            })),
            muscleGroups: response.data.muscleGroups.map(mg => ({
              value: mg.id,
              label: mg.name
            })),
            equipment: response.data.equipment.map(eq => ({
              value: eq.id,
              label: eq.name
            })),
            difficultyLevels: response.data.difficultyLevels.map(dl => ({
              value: dl.id,
              label: dl.level
            })),
            exerciseTypes: response.data.exerciseTypes.map(et => ({
              value: et.id,
              label: et.type
            }))
          });
        } catch (error) {
          console.error('Failed to fetch lookup data:', error);
        }
      };
  
      fetchLookupData();
    }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (selectedOption, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: selectedOption ? selectedOption.value : null
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
        await onSave(formData);
        setSuccess('Exercise created successfully!');
        // Wait a brief moment to show success message before closing
        setTimeout(() => {
          onCancel();
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to create exercise. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#333',
      borderColor: '#555',
      color: '#f8f8f2',
      marginBottom: '10px'
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1d1f20',
      color: '#f8f8f2'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4caf50' : state.isFocused ? '#333' : '#1d1f20',
      color: '#f8f8f2',
      cursor: 'pointer'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#f8f8f2'
    }),
    input: (provided) => ({
      ...provided,
      color: '#f8f8f2'
    })
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Create New Exercise</h2>
      
      {/* Show error message if exists */}
      {error && (
        <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-500">
          {error}
        </div>
      )}

      {/* Show success message if exists */}
      {success && (
        <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded text-green-500">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1">Category</label>
          <Select
          options={lookupData.categories}
          onChange={(option) => handleSelectChange(option, 'category_id')}
          styles={customStyles}
          placeholder="Select category..."
        />
        </div>

        <div>
          <label className="block mb-1">Muscle Group</label>
          <Select
          options={lookupData.muscleGroups}
          onChange={(option) => handleSelectChange(option, 'muscle_group_id')}
          styles={customStyles}
          placeholder="Select muscle group..."
        />
        </div>

        <div>
          <label className="block mb-1">Equipment</label>
          <Select
          options={lookupData.equipment}
          onChange={(option) => handleSelectChange(option, 'equipment_id')}
          styles={customStyles}
          placeholder="Select equipment..."
        />
        </div>

        <div>
          <label className="block mb-1">Difficulty Level</label>
          <Select
          options={lookupData.difficultyLevels}
          onChange={(option) => handleSelectChange(option, 'difficulty_level_id')}
          styles={customStyles}
          placeholder="Select difficulty level..."
        />
        </div>

        <div>
          <label className="block mb-1">Exercise Type</label>
          <Select
          options={lookupData.exerciseTypes}
          onChange={(option) => handleSelectChange(option, 'exercise_type_id')}
          styles={customStyles}
          placeholder="Select exercise type..."
        />
        </div>

        <div>
          <label className="block mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
          />
        </div>

        <div>
          <label className="block mb-1">Instructions</label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 h-24"
            placeholder="Step-by-step instructions for performing the exercise..."
          />
        </div>

        <div>
          <label className="block mb-1">Primary Muscles</label>
          <input
            type="text"
            name="primary_muscles"
            value={formData.primary_muscles}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
            placeholder="e.g., Biceps Brachii"
          />
        </div>

        <div>
          <label className="block mb-1">Secondary Muscles</label>
          <input
            type="text"
            name="secondary_muscles"
            value={formData.secondary_muscles}
            onChange={handleInputChange}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
            placeholder="e.g., Forearms, Brachialis"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Save Exercise'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExerciseForm;