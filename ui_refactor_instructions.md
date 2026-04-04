# Refactor Instructions

> **Role & Context**
> You are an expert React Native developer with a strong focus on iOS UI/UX design. We are refactoring and upgrading an existing app called "IronTrack," a strength training workout tracker. It currently uses a 5-tab bottom navigation, local `AsyncStorage` for data persistence, and supports English/Hebrew (RTL).
> 
> **Objective**
> Refactor the navigation structure to resolve UX friction, separate "template creation" from "active workout tracking," and implement two new features: a progress visualization widget on the Home screen and weight-saving capabilities within templates. 
> 
> **Crucial Requirement: iOS Optimization & Streamlining**
> The app must adopt an iOS-first look and feel, adhering strictly to Apple's Human Interface Guidelines (HIG). Ensure visual and functional consistency across all modules. This includes:
> * **Layout:**  Implement standard iOS Large Titles for top-level tabs that collapse naturally on scroll. Ensure consistent margins, padding, and corner radii (continuous curves) throughout all screens.
> * **Native Interactions:** Utilize standard iOS modal presentations (e.g., `pageSheet` or `formSheet`) for the active workout tracker and exercise creation screens.
> * **Haptics:** Integrate subtle haptic feedback (using libraries like `expo-haptics` or `react-native-haptic-feedback`) for key actions: checking off a set, completing a timer, and saving a workout.
> * **Native Components:** Prefer iOS-style Action Sheets over custom popups for options menus, and use native-feeling swipe actions for list items.
> 
> Please implement the following changes in the codebase.
> 
> ### 1. Navigation & State Refactor
> **Current Issue:** The app uses adjacent "Workouts" and "Workout" tabs, confusing static navigation with the dynamic state of an active workout.
> **Required Changes:**
> * **Reduce to 4 Tabs:** `Home` (formerly Workouts), `Library`, `History`, and `Settings`. Use standard iOS blurred/translucent tab bar styling.
> * **Remove the `Workout` tab entirely.**
> * **Active Workout as an iOS Modal:** When a user starts a workout, launch it as a full-screen or `pageSheet` modal that sits *over* the main navigation, complete with a native swipe-down-to-dismiss gesture (with an alert if discarding).
> * **"Now Training" Mini-Bar:** If the user minimizes the active workout modal to browse the Library or History, display a persistent, translucent mini-bar directly above the bottom tab navigation. Tapping this bar re-maximizes the active workout modal smoothly.
> 
> ### 2. Decoupling Templates from Active Tracking
> **Current Issue:** Creating a template and tracking a live workout share the same UI and logic, leading to accidental history logging.
> **Required Changes:**
> * **Template Builder:** Move template creation/editing entirely into the `Home` tab. This UI should feel like a standard iOS form with a "Save" button in the top-right navigation header. No timers or "Finish" buttons.
> * **Active Tracker:** Launched only when tapping an existing template or a "Start Empty Workout" button. The active tracker should only offer "Finish" (save to history) or "Cancel" (discard).
> 
> ### 3. New Feature: Template Weight Memory
> **Current Issue:** Templates only remember sets and reps.
> **Required Changes:**
> * Update the template schema in `AsyncStorage`. 
> * Templates must now store the `weight` value alongside `sets` and `reps`. 
> * When a user starts a workout from a template, pre-fill the weight input fields with these saved values so the user does not have to remember their previous lifting loads.
> 
> ### 4. New Feature: Home Screen Progress Widget
> **Required Changes:**
> * Implement a data visualization widget at the top of the `Home` tab. It should look like a native iOS widget (rounded corners, subtle shadow, clean background).
> * Read the user's past workout data from the `History` storage.
> * Create a simple, clean chart (e.g., using `react-native-chart-kit` or `react-native-gifted-charts`) that visualizes progress. Focus on a metric like **Total Volume Lifted Over Time** or **Workouts Per Week** for the last 30 days.
> 
> ### 5. UX/UI Refinements & Streamlining
> * **Rest Timer:** Add a toggle in the `Settings` tab for "Auto-Start Rest Timer". If disabled, the user must tap a clock icon next to a completed set to trigger the timer. Add a standard iOS quick "Undo" toast or snackbar if a set checkbox is accidentally tapped.
> * **RTL-Aware Gestures:** Ensure swipe gestures adapt to the selected language perfectly. For example, "Swipe Left to Delete" a template in English (LTR) must automatically become "Swipe Right to Delete" when Hebrew (RTL) is active. Use `react-native-reanimated` and `react-native-gesture-handler` for buttery smooth native swipe physics.
> * **Clear Routing:** Replace the hidden interaction of tapping the "Recent Workouts" text header with an iOS-standard "See All" button aligned to the trailing edge of the section header, routing to the History tab.
