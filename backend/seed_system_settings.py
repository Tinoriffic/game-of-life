"""
Seed script to add initial system settings for historical logging feature.

Run this from the backend directory:
    python seed_system_settings.py
"""
from app.database import SessionLocal
from app.models.system_settings_model import SystemSettings

def seed_settings():
    db = SessionLocal()
    try:
        # Check if settings already exist
        existing = db.query(SystemSettings).filter(
            SystemSettings.setting_key.in_([
                'allow_challenge_grace_period',
                'allow_previous_day_logging'
            ])
        ).all()

        existing_keys = {s.setting_key for s in existing}

        settings_to_create = []

        # Challenge grace period setting
        if 'allow_challenge_grace_period' not in existing_keys:
            settings_to_create.append(SystemSettings(
                setting_key='allow_challenge_grace_period',
                setting_value='false',  # Disabled by default
                description='Allow users 24 hours to restore failed challenges by logging the missed activity'
            ))

        # Previous day logging setting
        if 'allow_previous_day_logging' not in existing_keys:
            settings_to_create.append(SystemSettings(
                setting_key='allow_previous_day_logging',
                setting_value='true',
                description='Allow users to log activities for the previous day (24-hour grace period)'
            ))

        if settings_to_create:
            db.add_all(settings_to_create)
            db.commit()
            print(f"[SUCCESS] Created {len(settings_to_create)} system settings:")
            for setting in settings_to_create:
                print(f"   - {setting.setting_key} = {setting.setting_value}")
        else:
            print("[INFO] All system settings already exist. No changes made.")

        # Display all current settings
        all_settings = db.query(SystemSettings).all()
        print(f"\n[CURRENT SETTINGS] {len(all_settings)} total:")
        for setting in all_settings:
            print(f"   {setting.setting_key} = {setting.setting_value}")
            if setting.description:
                print(f"      -> {setting.description}")

    except Exception as e:
        print(f"[ERROR] Error seeding settings: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("[SEED] Seeding system settings...")
    seed_settings()
