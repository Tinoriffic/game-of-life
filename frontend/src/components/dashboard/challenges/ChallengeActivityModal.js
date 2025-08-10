import React, { useState } from 'react';
import Modal from '../../common/Modal';
import './ChallengeActivityModal.css';

const ChallengeActivityModal = ({ challenge, onComplete, onCancel }) => {
    const [activityData, setActivityData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getActivityFields = () => {
        const activityType = challenge.activity_type;
        
        switch (activityType) {
            case 'cardio':
                return [
                    { key: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
                    { key: 'distance', label: 'Distance (miles)', type: 'number', required: false },
                    { key: 'activity', label: 'Activity Type', type: 'text', placeholder: 'Running, cycling, etc.', required: false }
                ];
            case 'meditation':
                return [
                    { key: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
                    { key: 'type', label: 'Meditation Type', type: 'text', placeholder: 'Mindfulness, focused, etc.', required: false }
                ];
            case 'learning':
                return [
                    { key: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
                    { key: 'subject', label: 'Subject', type: 'text', required: false },
                    { key: 'notes', label: 'Notes', type: 'textarea', required: false }
                ];
            case 'social':
                return [
                    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe your social interaction...', required: true },
                    { key: 'people_count', label: 'Number of People', type: 'number', required: false }
                ];
            default:
                return [
                    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any additional notes...', required: false }
                ];
        }
    };

    const handleInputChange = (key, value) => {
        setActivityData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const fields = getActivityFields();
        const requiredFields = fields.filter(field => field.required);
        
        for (const field of requiredFields) {
            if (!activityData[field.key] || activityData[field.key].toString().trim() === '') {
                alert(`${field.label} is required`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onComplete(activityData);
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    const renderField = (field) => {
        const { key, label, type, placeholder, required } = field;
        
        if (type === 'textarea') {
            return (
                <div key={key} className="form-group">
                    <label htmlFor={key}>
                        {label}
                        {required && <span className="required">*</span>}
                    </label>
                    <textarea
                        id={key}
                        value={activityData[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        required={required}
                    />
                </div>
            );
        }
        
        return (
            <div key={key} className="form-group">
                <label htmlFor={key}>
                    {label}
                    {required && <span className="required">*</span>}
                </label>
                <input
                    type={type}
                    id={key}
                    value={activityData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    min={type === 'number' ? 0 : undefined}
                    step={type === 'number' ? 'any' : undefined}
                />
            </div>
        );
    };

    const getModalTitle = () => {
        const activityType = challenge.activity_type;
        const typeNames = {
            cardio: 'Log Your Cardio Activity',
            meditation: 'Log Your Meditation Session',
            learning: 'Log Your Learning Session',
            social: 'Log Your Social Activity',
        };
        
        return typeNames[activityType] || 'Log Your Activity';
    };

    return (
        <Modal onClose={onCancel}>
            <div className="challenge-activity-modal">
                <h3>{getModalTitle()}</h3>
                <p>Complete the form below to mark today's challenge as complete.</p>
                
                <form onSubmit={handleSubmit}>
                    {getActivityFields().map(renderField)}
                    
                    <div className="modal-actions">
                        <button type="button" onClick={onCancel} className="cancel-btn">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="submit-btn"
                        >
                            {isSubmitting ? 'Completing...' : 'Complete Challenge'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ChallengeActivityModal;