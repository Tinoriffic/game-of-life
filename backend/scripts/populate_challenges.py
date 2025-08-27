#!/usr/bin/env python3
"""
Script to populate the database with challenge data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.challenge_model import Challenge, Badge

def populate_challenges():
    """Populate the database with challenge and badge data"""
    db: Session = SessionLocal()
    try:
        print("Populating challenges and badges...")
        
        # Create badges first (due to foreign key constraints)
        badges_data = [
            {
                'id': 1,
                'title': 'Road Warrior',
                'description': 'Conquered 30 consecutive days of running at least 1 mile',
                'icon_url': '/images/badges/road-warrior.png'
            },
            {
                'id': 2,
                'title': 'Zen Master',
                'description': 'Built a mind palace through 30 days of consistent meditation',
                'icon_url': '/images/badges/zen-master.png'
            },
            {
                'id': 3,
                'title': 'Knowledge Hoarder',
                'description': 'Hoarded knowledge for 30 days straight',
                'icon_url': '/images/badges/knowledge-hoarder.png'
            },
            {
                'id': 4,
                'title': 'Arctic Survivor',
                'description': 'Survived 30 days of cold showers without flinching',
                'icon_url': '/images/badges/arctic-survivor.png'
            }
        ]
        
        for badge_data in badges_data:
            existing_badge = db.query(Badge).filter_by(id=badge_data['id']).first()
            if not existing_badge:
                badge = Badge(**badge_data)
                db.add(badge)
                print(f"  Added badge: {badge_data['title']}")
            else:
                # Update existing badge with new icon_url
                existing_badge.icon_url = badge_data['icon_url']
                print(f"  Updated badge: {badge_data['title']}")
        
        db.commit()
        
        # Create challenges
        challenges_data = [
            {
                'id': 1,
                'title': 'Road Warrior',
                'description': 'Run at least 1 mile daily for 30 days. Claim your territory one mile at a time and become an unstoppable force.',
                'duration_days': 30,
                'target_stats': [{"stat": "Endurance", "xp": 8}, {"stat": "Resilience", "xp": 5}],
                'completion_xp_bonus': 100,
                'badge_id': 1,
                'activity_type': 'cardio',
                'validation_rules': {"activity_requirements": {"activity": "running", "min_distance": 1.0, "distance_unit": "miles"}},
                'icon': '🏃‍♂️',
                'is_active': True
            },
            {
                'id': 2,
                'title': 'Zen Master',
                'description': 'Meditate for at least 10 minutes daily for 30 days. Construct your inner sanctuary and master the art of mental clarity.',
                'duration_days': 30,
                'target_stats': [{"stat": "Wisdom", "xp": 7}, {"stat": "Resilience", "xp": 6}],
                'completion_xp_bonus': 100,
                'badge_id': 2,
                'activity_type': 'meditation',
                'validation_rules': {"activity_requirements": {"min_duration": 10, "duration_unit": "minutes"}},
                'icon': '🧘‍♀️',
                'is_active': True
            },
            {
                'id': 3,
                'title': 'Knowledge Hoarder',
                'description': 'Read for at least 30 minutes daily for 30 days. Collect wisdom like treasure and expand your mental library.',
                'duration_days': 30,
                'target_stats': [{"stat": "Wisdom", "xp": 8}, {"stat": "Intelligence", "xp": 5}],
                'completion_xp_bonus': 100,
                'badge_id': 3,
                'activity_type': 'learning',
                'validation_rules': {"activity_requirements": {"subject": "reading", "min_duration": 30, "duration_unit": "minutes"}},
                'icon': '📚',
                'is_active': True
            },
            {
                'id': 4,
                'title': 'Arctic Survivor',
                'description': 'Take a cold shower daily for 30 days. Embrace the freeze and forge unbreakable mental toughness.',
                'duration_days': 30,
                'target_stats': [{"stat": "Resilience", "xp": 12}],
                'completion_xp_bonus': 150,
                'badge_id': 4,
                'activity_type': None,
                'validation_rules': None,
                'icon': '🚿',
                'is_active': True
            }
        ]
        
        for challenge_data in challenges_data:
            existing_challenge = db.query(Challenge).filter_by(id=challenge_data['id']).first()
            if not existing_challenge:
                challenge = Challenge(**challenge_data)
                db.add(challenge)
                print(f"  Added challenge: {challenge_data['title']}")
            else:
                print(f"  Challenge already exists: {challenge_data['title']}")
        
        db.commit()
        print("Challenges and badges populated successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error populating challenges: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_challenges()