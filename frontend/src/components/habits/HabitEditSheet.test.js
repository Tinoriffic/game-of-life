import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HabitEditSheet from './HabitEditSheet';
import { habitService } from '../../services/habitService';

jest.mock('../../services/habitService', () => ({
    habitService: { updateHabit: jest.fn() }
}));

jest.mock('../feedback/FeedbackContext', () => ({
    useFeedback: () => ({ pushToast: jest.fn() })
}));

const workout = {
    id: 7, name: 'PPL', icon: '🏋️', habit_type: 'standard',
    cadence_type: 'weekly', times_per_week: 6, weekdays: null, target_value: null
};

const weighIn = {
    id: 12, name: 'Daily weigh-in', icon: '⚖️', habit_type: 'measurement',
    measurement_unit: 'lbs', cadence_type: 'daily', times_per_week: null,
    weekdays: null, target_value: 185
};

const renderSheet = (habit, props = {}) => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    render(<HabitEditSheet habit={habit} onSaved={onSaved} onClose={onClose} {...props} />);
    return { onSaved, onClose };
};

beforeEach(() => {
    habitService.updateHabit.mockReset();
    habitService.updateHabit.mockResolvedValue({});
});

test('drops a workout habit from 6× to 4× per week', async () => {
    const { onSaved } = renderSheet(workout);
    expect(screen.getByText('6× per week')).toBeInTheDocument();

    fireEvent.click(screen.getByText('−'));
    fireEvent.click(screen.getByText('−'));
    expect(screen.getByText('4× per week')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(habitService.updateHabit).toHaveBeenCalledWith(7, {
        name: 'PPL', cadence_type: 'weekly', times_per_week: 4, weekdays: null
    });
});

test('the times-per-week stepper is clamped to 1..7', () => {
    renderSheet({ ...workout, times_per_week: 7 });

    fireEvent.click(screen.getByText('＋'));
    expect(screen.getByText('7× per week')).toBeInTheDocument();

    for (let i = 0; i < 8; i += 1) fireEvent.click(screen.getByText('−'));
    expect(screen.getByText('1× per week')).toBeInTheDocument();
});

test('switching a weekly habit to daily clears its weekly target', async () => {
    const { onSaved } = renderSheet(workout);

    fireEvent.click(screen.getByText('Daily'));
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(habitService.updateHabit).toHaveBeenCalledWith(7, {
        name: 'PPL', cadence_type: 'daily', times_per_week: null, weekdays: null
    });
});

test('specific days are sent as weekday indices', async () => {
    const { onSaved } = renderSheet(workout);

    fireEvent.click(screen.getByText('Set days'));
    // Defaults to Mon-Fri; drop Monday, add Saturday.
    fireEvent.click(screen.getAllByText('M')[0]);
    fireEvent.click(screen.getAllByText('S')[0]);
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(habitService.updateHabit).toHaveBeenCalledWith(7, {
        name: 'PPL', cadence_type: 'weekdays', times_per_week: null, weekdays: [1, 2, 3, 4, 5]
    });
});

test('a weekday habit with no days selected is not saved', () => {
    renderSheet(workout);

    fireEvent.click(screen.getByText('Set days'));
    ['M', 'T', 'W', 'T', 'F'].forEach((label, index) => {
        fireEvent.click(screen.getAllByText(label)[index === 3 ? 1 : 0]);
    });
    fireEvent.click(screen.getByText('Save changes'));

    expect(habitService.updateHabit).not.toHaveBeenCalled();
});

test('a measurement habit edits its goal alongside its cadence', async () => {
    const { onSaved } = renderSheet(weighIn);

    const goal = screen.getByLabelText('GOAL (lbs)');
    fireEvent.change(goal, { target: { value: '175.5' } });
    fireEvent.change(screen.getByLabelText('NAME'), { target: { value: 'Weigh-in' } });
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(habitService.updateHabit).toHaveBeenCalledWith(12, {
        name: 'Weigh-in', cadence_type: 'daily', times_per_week: null,
        weekdays: null, target_value: 175.5
    });
});

test('a standard habit has no goal field', () => {
    renderSheet(workout);
    expect(screen.queryByText(/^GOAL/)).not.toBeInTheDocument();
});

test('an empty name is not saved', () => {
    renderSheet(workout);

    fireEvent.change(screen.getByLabelText('NAME'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save changes'));

    expect(habitService.updateHabit).not.toHaveBeenCalled();
});

test('escape closes the sheet without saving', () => {
    const { onClose } = renderSheet(workout);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(habitService.updateHabit).not.toHaveBeenCalled();
});
