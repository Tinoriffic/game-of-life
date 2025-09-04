# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Me v2" is a personal life tracking and gamification application with a React frontend and FastAPI backend. The app allows users to track various activities (fitness, learning, meditation, social) and view progress through stats and analytics.

## Development Setup

### First-time Setup
1. Set up Python virtual environment: `python3 -m venv venv`
2. Activate virtual environment: 
   - Unix: `source venv/bin/activate`
   - Windows: `source venv/Scripts/activate`
3. Install backend dependencies: `cd backend && pip install -r requirements.txt`
4. Configure environment variables:
   - Backend: `cd app && cp .env.template .env` (update as needed)
   - Frontend: `cd frontend && cp .env.example .env.local` (update as needed)
5. Install frontend dependencies: `cd frontend && npm install`

### Development Commands

**Frontend (React):**
- `npm start` (from `frontend/`) - Start development server at http://localhost:3000
- `npm test` - Run tests in watch mode
- `npm run build` - Production build

**Backend (FastAPI):**
- `python -m app.main` (from `backend/` in venv) - Start backend server at http://localhost:8000
- API documentation available at http://localhost:8000/docs
- `pytest` (from root directory in venv) - Run all backend tests

## Architecture

### Backend Structure
- **FastAPI** application with SQLAlchemy ORM and PostgreSQL database
- **Modular architecture** with separate routers, models, schemas, and CRUD operations
- **OAuth2 authentication** with Google integration
- **Database migrations** handled by Alembic
- **Core modules:**
  - `routers/` - API endpoints (activity, skill, user, workout, oauth2)
  - `models/` - SQLAlchemy database models
  - `schemas/` - Pydantic request/response models
  - `crud/` - Database operations
  - `skill_manager.py` & `xp_calculator.py` - Game mechanics

### Frontend Structure
- **React** with React Router for navigation and Axios for API calls
- **Component-based architecture** organized by feature:
  - `auth/` - Login, OAuth callback, user setup
  - `dashboard/` - Main activity logging interface
    - `daily/` - Daily activity loggers (meditation, journal, social, learning)
    - `fitness/` - Workout programs and fitness tracking
    - `stats/` - Charts and progress visualization
  - `player/` - User profile and context
  - `common/` - Shared UI components

### Key Features
- **Activity Tracking:** Multiple categories (fitness, meditation, learning, social, journal)
- **Fitness Module:** Custom workout programs, exercise library, session logging
- **Stats & Analytics:** Progress charts using Chart.js, React-Chartjs-2, and Recharts
- **User Gamification:** XP system and skill progression

### Environment Configuration
- Backend requires: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIRECT_URI`, `SECRET_KEY`, `FRONTEND_URL`, `ALLOWED_ORIGINS`
- CORS configured for cross-origin requests between frontend and backend

### Database
- PostgreSQL with SQLAlchemy ORM
- Models: User, Activity, Skill, Workout, Exercise, Session relationships
- Alembic migrations in `backend/alembic/versions/`

### Important
Whenever running alembic commands, be sure to do it from the virtual environment!

### Useful Alembic Commands
```bash
# Generate a migration script
alembic revision --autogenerate -m "Add <field> to <table>"

# Apply the migration
alembic upgrade head

# Rollback 1 migration version
alembic downgrade -1
```