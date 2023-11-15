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
}```