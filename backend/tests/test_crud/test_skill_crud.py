# test_skill_crud.py
#
# Real-DB tests (the `db` fixture lives in conftest.py). get_user_skills'
# behaviour worth covering is the canonical ordering and per-user filtering.
from app.crud.skill_crud import get_user_skills
from app.models import user_model, skill_model


def _make_user(db, uid=1):
    user = user_model.User(id=uid, username=f"u{uid}", email=f"u{uid}@example.com", timezone="UTC")
    db.add(user)
    db.commit()
    return user


def test_get_user_skills_returns_canonical_order(db):
    user = _make_user(db)
    # Insert out of order; get_user_skills should return the defined skill order.
    for name in ["Strength", "Awareness", "Wisdom"]:
        db.add(skill_model.Skill(name=name, user_id=user.id))
    db.commit()

    skills = get_user_skills(db, user.id)
    assert [s.name for s in skills] == ["Awareness", "Strength", "Wisdom"]


def test_get_user_skills_excludes_other_users(db):
    user = _make_user(db, 1)
    other = _make_user(db, 2)
    db.add(skill_model.Skill(name="Awareness", user_id=user.id))
    db.add(skill_model.Skill(name="Strength", user_id=other.id))
    db.commit()

    skills = get_user_skills(db, user.id)
    assert [s.name for s in skills] == ["Awareness"]


def test_get_user_skills_empty_when_none(db):
    user = _make_user(db)
    assert get_user_skills(db, user.id) == []
