### Sample Endpoint Requests

#### Creating a workout program
```
{
  "name": "3-Day PPL Workout",
  "workout_days": [
    {
      "day_name": "Pull",
      "exercises": [
        {
          "name": "Pull-up",
          "sets": 3
        },
        {
          "name": "Hammer Curl",
          "sets": 3
        },
        {
          "name": "Ring-Inverted Row",
          "sets": 3
        },
        {
          "name": "Jack-Knife Sit-up",
          "sets": 3
        }
      ]
    },
    {
      "day_name": "Push",
      "exercises": [
        {
          "name": "Ring Dip",
          "sets": 3
        },
        {
          "name": "Lateral Raise",
          "sets": 3
        },
        {
          "name": "Diamond Pushup",
          "sets": 3
        },
        {
          "name": "Twisting Crunch",
          "sets": 3
        }
      ]
    },
    {
      "day_name": "Legs",
      "exercises": [
        {
          "name": "Pistol Squat",
          "sets": 3
        },
        {
          "name": "Calf Raise",
          "sets": 3
        },
        {
          "name": "Nordic Curl",
          "sets": 3
        },
        {
          "name": "Planks",
          "sets": 3
        }
      ]
    }
  ]
}
```

#### Logging a meditation session
```
{
  "activity_type": "meditate",
  "description": "breath focus",
  "duration": 15,
  "counts_towards_streak": false,
  "date": "2023-11-15T03:50:06.672Z"
}
```

#### Logging a run
```
{
  "activity_type": "run",
  "description": "5K",
  "duration": 30,
  "distance": 3.5,
  "counts_towards_streak": false,
  "date": "2023-11-17T00:41:18.360Z"
}
```

#### Logging a social interaction
```
{
  "activity_type": "socialize",
  "description": "approach_stranger",
  "date": "2023-11-17T00:41:18.360Z"
}

description can be any of the following: "social_gathering", "presentation", "approach_stranger", "give_compliment", "tell_story", "make_laugh"
```

#### Logging taking a course
```
{
  "activity_type": "take_class",
  "description": "Python for Dummies Online Course",
  "duration": 30,
  "date": "2023-11-17T00:41:18.360Z"
}
```

#### Logging a journal entry
```
{
  "activity_type": "journal",
  "description": "diary",
  "date": "2023-11-17T00:41:18.360Z"
}
```

#### Logging a workout
```
{
  "program_id": 15,
  "date": "2023-11-15T04:09:40.946Z",
  "exercises": [
    {
      "program_exercise_id": 181,
      "sets": [
        {
          "performed_reps": 9,
          "performed_weight": 30
        },
        {
          "performed_reps": 8,
          "performed_weight": 30
        },
        {
          "performed_reps": 8,
          "performed_weight": 30
        }
      ]
    },
    {
      "program_exercise_id": 182,
      "sets": [
        {
          "performed_reps": 9,
          "performed_weight": 35
        },
        {
          "performed_reps": 9,
          "performed_weight": 35
        },
        {
          "performed_reps": 6,
          "performed_weight": 35
        }
      ]
    },
    {
      "program_exercise_id": 183,
      "sets": [
        {
          "performed_reps": 10,
          "performed_weight": 30
        },
        {
          "performed_reps": 10,
          "performed_weight": 30
        },
        {
          "performed_reps": 7,
          "performed_weight": 30
        }
      ]
    },
    {
      "program_exercise_id": 184,
      "sets": [
        {
          "performed_reps": 20,
          "performed_weight": 0
        },
        {
          "performed_reps": 20,
          "performed_weight": 0
        },
        {
          "performed_reps": 16,
          "performed_weight": 0
        }
      ]
    }
  ]
}
```