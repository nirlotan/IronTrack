# UI/UX Refactoring Plan for IronTrack

## Overview
This plan outlines the refactoring needed to transform IronTrack into an iOS-optimized workout tracker with separated template creation and active workout tracking flows.

---

## Phase 1: Navigation Restructure

### 1.1 Reduce to 4 Tabs
**Files to modify:**
- `app/(tabs)/_layout.tsx`

**Changes:**
- Remove the separate `workout` tab entirely
- Rename `Workouts` tab to `Home` (currently at `index.tsx`)
- Keep: `Home`, `Library`, `History`, `Settings`
- Update tab titles in translations
- Ensure Large Titles are enabled for iOS (`headerShown: true`, `largeTitle`)

### 1.2 Active Workout Modal Architecture
**New files to create:**
- `app/(modals)/workout-tracker.tsx` - Full-screen modal for active workouts

**Changes:**
- Move workout tracking UI from `workout.tsx` to new modal
- Implement iOS-style modal presentation with `pageSheet`
- Add swipe-down-to-dismiss gesture handler
- Add discard confirmation if workout has progress
- Export modal from `app/_layout.tsx` with proper stack configuration

### 1.3 Persistent "Now Training" Mini-Bar
**New files to create:**
- `src/components/ActiveWorkoutBar.tsx` - Persistent mini-bar component

**Changes:**
- Display above bottom tab bar when active workout exists
- Translucent iOS-style appearance
- Tap to re-maximize workout modal
- Shows: workout name, elapsed time, quick "Finish" button
- Hook into `useAppStore` to detect `activeWorkout` state

---

## Phase 2: Template Management in Home Tab

### 2.1 Home Tab Refactor
**Files to modify:**
- `app/(tabs)/index.tsx`

**Changes:**
- Remove workout tracking from Home
- Add template creation/editing UI:
  - "Create New Template" button
  - Template list with swipe-to-delete
  - "Start Workout" button (launches modal, not navigation)
- Template editing should be a separate modal/page
- No timers or "Finish Workout" in template editor
- Standard iOS "Save" button in header

### 2.2 Template Editor Modal
**New files to create:**
- `app/(modals)/template-editor.tsx`

**Changes:**
- Move template creation from `create-template.tsx`
- Move template editing from `edit-template.tsx`
- Unified modal with:
  - Template name input
  - Exercise picker (modal bottom sheet)
  - Target sets/reps inputs
  - Header "Save" button
  - No workout timers

---

## Phase 3: Template Weight Memory

### 3.1 Update Schema
**Files to modify:**
- `src/types/index.ts` - `TemplateExercise` interface

**Changes:**
```typescript
export interface TemplateExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  lastWeight?: number;  // Already exists
  lastReps?: number;    // Already exists
  weight?: number;      // NEW: Save weight to pre-fill
}
```

### 3.2 Update Active Workout Initialization
**Files to modify:**
- `src/store/appStore.ts` - `startWorkoutFromTemplate`

**Changes:**
- When creating sets from template, pre-fill weight:
```typescript
const sets: SetRecord[] = template.exercises.map((te) => ({
  exerciseId: te.exerciseId,
  weight: te.weight ?? null,  // Pre-fill from template
  reps: te.lastReps ?? te.targetReps,
  isCompleted: false,
}));
```

### 3.3 Update Template on Save
**Files to modify:**
- `src/store/appStore.ts` - `saveActiveWorkout`

**Changes:**
- When saving template, capture final weight:
```typescript
exercises: aw.exercises.map((ex) => {
  const lastSet = ex.sets[ex.sets.length - 1];
  return {
    exerciseId: ex.exerciseId,
    targetSets: ex.sets.length,
    targetReps: lastSet?.reps ?? 10,
    weight: lastSet?.weight ?? undefined,  // Save weight
    lastWeight: lastSet?.weight ?? undefined,
    lastReps: lastSet?.reps ?? undefined,
  };
})
```

---

## Phase 4: Home Screen Progress Widget

### 4.1 Progress Chart Component
**New files to create:**
- `src/components/ProgressChart.tsx`

**Features:**
- Total volume lifted over last 30 days
- Bar chart using `react-native-gifted-charts` (already installed)
- iOS-style: rounded corners, subtle shadow, clean background
- Data source: `sessions` from store, filtered by date

**Implementation:**
```typescript
// Filter sessions from last 30 days
// Group by week or day
// Calculate totalVolume per period
// Render bar chart
```

### 4.2 Integrate into Home Tab
**Files to modify:**
- `app/(tabs)/index.tsx`

**Changes:**
- Add ProgressChart at top of Home screen
- Above template list
- Tap to expand/collapse or navigate to History

---

## Phase 5: UX/UI Refinements

### 5.1 Rest Timer Auto-Start Toggle
**Files to modify:**
- `src/store/appStore.ts` - Add `autoStartRestTimer` boolean
- `app/(tabs)/settings.tsx` - Add toggle switch
- `app/(tabs)/workout.tsx` - Conditional timer logic

**Changes:**
- Add setting: "Auto-Start Rest Timer"
- If disabled: show tap-to-start icon next to completed sets
- If enabled: timer starts automatically on set completion

### 5.2 Undo Toast for Accidental Set Check
**Files to modify:**
- `app/(tabs)/workout.tsx` - `handleComplete`

**Changes:**
- After toggling set complete, show temporary undo toast
- "Set marked complete" with "Undo" button
- Toast dismisses after 5 seconds or on undo tap
- Use `react-native-paper` Snackbar or custom implementation

### 5.3 RTL-Aware Swipe Gestures
**Files to modify:**
- `app/(tabs)/library.tsx` - Template card swipeable
- `app/(tabs)/workout.tsx` - Set deletion swipeable

**Changes:**
- Detect `isRTL` from translation hook
- Reverse swipe direction based on language:
```typescript
<Swipeable
  renderRightActions={isRTL ? null : renderDeleteAction}
  renderLeftActions={isRTL ? renderDeleteAction : null}
  rightThreshold={isRTL ? 0 : 40}
/>
```

### 5.4 "See All" History Button
**Files to modify:**
- `app/(tabs)/index.tsx` - Recent workouts section
- `app/(tabs)/history.tsx`

**Changes:**
- Replace hidden tap on "Recent Workouts" header
- Add explicit "See All" button to trailing edge
- Navigate to History tab on tap
- Consistent with iOS standard patterns

---

## Implementation Order

| Order | Phase | Files |
|-----|-------|-------|
| 1 | Navigation Restructure | `_layout.tsx`, `workout.tsx` (modal), `ActiveWorkoutBar.tsx` |
| 2 | Template Management | `index.tsx`, `template-editor.tsx` |
| 3 | Weight Memory | `types/index.ts`, `appStore.ts` |
| 4 | Progress Widget | `ProgressChart.tsx`, `index.tsx` |
| 5 | UX Refinements | `settings.tsx`, `workout.tsx`, `library.tsx` |

---

## Dependencies to Install

```bash
# Already installed
react-native-gifted-charts

# May need for toasts
# react-native-paper (optional, or use custom implementation)
```

---

## Migration Notes

1. **Backward Compatibility**: Keep `workout.tsx` as fallback during transition
2. **Data Migration**: Existing templates will automatically use `weight: undefined`
3. **Testing**: Verify RTL gestures work in both languages
4. **iOS Modal**: Test swipe-dismiss with and without workout progress

---

## Success Criteria

- [ ] 4-tab navigation (Home, Library, History, Settings)
- [ ] Active workout launches as iOS modal
- [ ] "Now Training" mini-bar persists during navigation
- [ ] Templates pre-fill saved weights
- [ ] Progress widget shows 30-day volume data
- [ ] Rest timer respects auto-start setting
- [ ] Undo toast appears on set toggle
- [ ] Swipe gestures reverse in Hebrew
- [ ] "See All" button routes to History
