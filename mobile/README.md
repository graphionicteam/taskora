# Taskora Mobile Application (Flutter + Riverpod)

The official high-performance cross-platform mobile client for the **Taskora** productivity and workforce management platform, built with **Flutter** and **Flutter Riverpod**.

---

## Features

- **Authentication & Workspace Context**:
  - Secure credential login with persistent cookie session management.
  - Automatic session restoration on app boot.
  - Dynamic role detection (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- **Task Hierarchy & View-Only Permissions**:
  - Full task list with interactive KPI filters (*All*, *My Active*, *Due Today*, *Overdue*, *Completed*).
  - Search by task title or description.
  - Subtask leaf progress tracking (`x/y subtasks • %`).
  - **⭐ Owner Assignment Highlight**: Displays when a task is assigned directly by the workspace Owner to the current user.
  - **👁️ View-Only Enforcement**: When a task is assigned to another member by the Owner, other members can view all details and subtasks, but cannot modify status, edit details, or add subtasks.
- **Dashboard & Agenda**:
  - 4 interactive KPI metric cards linking directly into filtered lists.
  - Today's agenda with real-time progress indicators.
- **Company Financials & Projects**:
  - 100% Company Account allocation ledger.
  - Company Vault net retained revenue, tax reserves, and project budgets formatted in Indian Rupee (**₹ INR**).
- **Attendance & GPS Geofencing**:
  - Real-time GPS distance calculation from the office coordinates.
  - Geofence radar verification with 1-tap **Punch In / Punch Out**.
  - Daily punch history and team attendance log.
- **Inbox & Collaboration**:
  - Direct and group conversation lists.
  - Full chat detail with message bubbles, sender badges, and composer.
- **Design System**:
  - Brand Indigo (`#4F46E5`) & Violet accents.
  - Inter Google Fonts typography.
  - Adaptive Light and Dark theme modes.

---

## Project Structure

```
mobile/
├── pubspec.yaml                 # Dependencies and assets
├── lib/
│   ├── main.dart                # App entry point with ProviderScope and AuthGate
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart  # Production Vercel vs Local host toggling
│   │   │   └── app_colors.dart     # Brand color tokens
│   │   ├── network/
│   │   │   └── api_client.dart     # Cookie-preserving HTTP client
│   │   └── theme/
│   │       └── app_theme.dart      # Material 3 Light/Dark themes
│   ├── models/                  # Type-safe Dart models (User, Workspace, Task, Project, Attendance, Message)
│   ├── providers/               # Riverpod StateNotifiers (Auth, Task, Project, Attendance, Chat)
│   └── screens/
│       ├── auth/                # Login screen
│       ├── dashboard/           # Dashboard with KPI cards & agenda
│       ├── tasks/               # Tasks list, detail, and create sheets
│       ├── projects/            # Project list & company vault
│       ├── attendance/          # GPS radar punch screen
│       ├── inbox/               # Chat and conversations
│       ├── more/                # Profile and settings
│       └── shell/               # Main 5-tab bottom navigation shell
```

---

## Getting Started

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (>= 3.2.0)
- Android Studio / Xcode for emulators or physical devices

### 2. Install Dependencies
From the `mobile/` directory:
```bash
flutter pub get
```

### 3. Run the App
- For Android:
  ```bash
  flutter run -d android
  ```
- For iOS:
  ```bash
  flutter run -d ios
  ```
- For Chrome / Web:
  ```bash
  flutter run -d chrome
  ```

### 4. Backend Environment Configuration
By default, the app is pre-configured to communicate with your live Vercel deployment:
```dart
// lib/core/constants/api_endpoints.dart
static const bool useProduction = true;
static const String productionBaseUrl = 'https://taskora-graphionic.vercel.app';
```
To connect to your local Next.js dev server instead, simply set `useProduction = false`.
