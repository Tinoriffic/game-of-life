"""Add exercise_id to WorkoutSessionExercise

Revision ID: 7b5f44a6e77c
Revises: 0096afbfcf0b
Create Date: 2024-09-22 15:28:24.054628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b5f44a6e77c'
down_revision: Union[str, None] = '0096afbfcf0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS workout_progress_view")
    
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('workout_session_exercises', sa.Column('exercise_id', sa.Integer(), nullable=True))
    op.add_column('workout_session_exercises', sa.Column('sets', sa.Integer(), nullable=True))
    op.add_column('workout_session_exercises', sa.Column('total_volume', sa.Float(), nullable=True))
    op.drop_constraint('workout_session_exercises_program_exercise_id_fkey', 'workout_session_exercises', type_='foreignkey')
    op.create_foreign_key(None, 'workout_session_exercises', 'exercises', ['exercise_id'], ['exercise_id'])
    op.drop_column('workout_session_exercises', 'set_number')
    op.drop_column('workout_session_exercises', 'performed_weight')
    op.drop_column('workout_session_exercises', 'performed_reps')
    op.drop_column('workout_session_exercises', 'program_exercise_id')

    op.execute("""
    CREATE VIEW workout_progress_view AS
    SELECT 
        ws.user_id,
        ws.session_id,
        ws.program_id,
        wp.name AS program_name,
        ws.session_date,
        wse.session_exercise_id,
        wse.exercise_id,
        e.name AS exercise_name,
        es.set_number,
        es.weight,
        es.reps,
        (es.weight * es.reps) AS set_volume,
        wse.total_volume AS exercise_total_volume
    FROM 
        workout_sessions ws
    JOIN 
        workout_programs wp ON ws.program_id = wp.program_id
    JOIN 
        workout_session_exercises wse ON ws.session_id = wse.session_id
    JOIN 
        exercises e ON wse.exercise_id = e.exercise_id
    JOIN 
        exercise_sets es ON wse.session_exercise_id = es.session_exercise_id
    ORDER BY 
        ws.session_date DESC, wse.session_exercise_id, es.set_number
    """)
    # ### end Alembic commands ###


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS workout_progress_view")
    
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('workout_session_exercises', sa.Column('program_exercise_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('workout_session_exercises', sa.Column('performed_reps', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('workout_session_exercises', sa.Column('performed_weight', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('workout_session_exercises', sa.Column('set_number', sa.INTEGER(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'workout_session_exercises', type_='foreignkey')
    op.create_foreign_key('workout_session_exercises_program_exercise_id_fkey', 'workout_session_exercises', 'workout_program_exercises', ['program_exercise_id'], ['program_exercise_id'], ondelete='CASCADE')
    op.drop_column('workout_session_exercises', 'total_volume')
    op.drop_column('workout_session_exercises', 'sets')
    op.drop_column('workout_session_exercises', 'exercise_id')

    op.execute("""
    CREATE VIEW workout_progress_view AS
    SELECT 
        ws.user_id,
        wse.session_id, 
        wse.program_exercise_id, 
        wpe.exercise_id, 
        e.name AS exercise_name,
        wse.set_number, 
        wse.performed_reps, 
        wse.performed_weight, 
        ws.session_date,
        (wse.performed_reps * wse.performed_weight) AS volume
    FROM workout_session_exercises wse
    JOIN workout_program_exercises wpe ON wse.program_exercise_id = wpe.program_exercise_id
    JOIN exercises e ON wpe.exercise_id = e.exercise_id
    JOIN workout_sessions ws ON wse.session_id = ws.session_id
    """)
    # ### end Alembic commands ###
