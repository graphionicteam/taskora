import 'dart:io';

class ApiEndpoints {
  // Toggle between Local Host and Vercel Production
  static const bool useProduction = true;

  // Production Vercel URL
  static const String productionBaseUrl = 'https://taskora-graphionic.vercel.app';

  // Local development host (10.0.2.2 for Android Emulator, localhost for iOS simulator)
  static String get localBaseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static String get baseUrl => useProduction ? productionBaseUrl : localBaseUrl;

  // Auth endpoints
  static String get login => '$baseUrl/api/v1/auth/login';
  static String get me => '$baseUrl/api/v1/auth/me';

  // Workspace endpoints
  static String get workspaces => '$baseUrl/api/v1/workspaces';
  static String workspaceMembers(String workspaceId) =>
      '$baseUrl/api/v1/workspaces/$workspaceId/members';
  static String workspaceDesignations(String workspaceId) =>
      '$baseUrl/api/v1/workspaces/$workspaceId/designations';

  // Task endpoints
  static String tasks(String workspaceId) =>
      '$baseUrl/api/v1/workspaces/$workspaceId/tasks';
  static String taskDetail(String workspaceId, String taskId) =>
      '$baseUrl/api/v1/workspaces/$workspaceId/tasks/$taskId';

  // Attendance endpoints
  static String get attendance => '$baseUrl/api/v1/attendance';

  // Project & Financial endpoints
  static String get projects => '$baseUrl/api/v1/projects';

  // Inbox & Chat endpoints
  static String get inboxMessages => '$baseUrl/api/v1/inbox/messages';
  static String get inboxTasks => '$baseUrl/api/v1/inbox/tasks';
  static String get notifications => '$baseUrl/api/v1/notifications';
}
