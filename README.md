# Training Tracker

Mobile-first Next.js workout tracker using Google Sheets as the database.

## Current V1 features

- Loads Push/Pull/Leg A or B from `Workout Templates`
- Reads exercise settings from `Exercise Library`
- Finds latest performance by Exercise ID, including Session 0 baseline
- Calculates a deterministic next target
- Allows same-group replacements, exercise additions, removals and reordering
- Logs up to four sets per exercise
- Saves session metadata to `Sessions`
- Saves exercise results to `Workout Log`

## Required Google Sheet tabs and headers

### Exercise Library

`Exercise ID | Exercise Name | Group | Equipment | Default Sets | Min Reps | Max Reps | Increment KG | Progression Type | Active | Tracking Type`

`Tracking Type` can be `Reps`, `Seconds`, `Minutes`, or `Distance`. If omitted, the app defaults to `Reps`.

### Workout Templates

`Workout Type | Variant | Order | Slot Name | Group | Default Exercise ID | Required`

### Workout Log

`Session ID | Date | Workout Type | Variant | Order | Slot Name | Exercise ID | Exercise Name | Set 1 KG | Set 1 Reps | Set 2 KG | Set 2 Reps | Set 3 KG | Set 3 Reps | Set 4 KG | Set 4 Reps | RPE | Notes`

### Sessions

The app writes these columns in order:

`Session ID | Date | Workout Type | Variant | Bodyweight KG | Duration Min | Watch Calories | Energy | Sleep Hours | Notes`

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add your Google service-account values and spreadsheet ID.
3. Share the Google Sheet with the service-account email as Editor.
4. Install and run:

```bash
npm install
npm run dev
```

5. Open `http://localhost:3000`.

## Deploy

Push the repository to GitHub, import it into Vercel, and add the same environment variables in Vercel Project Settings.

## Progression logic

- `Double Progression`: when every working set reaches Max Reps, add Increment KG and reset target values to Min Reps. Otherwise add one unit to the weakest set.
- `Rep Progression`: add one unit to the weakest set. If all sets reach Max Reps and Increment KG is greater than zero, add weight and reset to Min Reps.
- `Fixed`: repeat the last target.

The logic is intentionally deterministic. AI coaching can be added later as an optional plan-adjustment layer.
