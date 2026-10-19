import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/task.dart';
import 'auth_provider.dart';

enum TaskTabFilter { all, myActive, dueToday, overdue, completed }

class TaskState {
  final bool isLoading;
  final List<TaskItem> tasks;
  final TaskTabFilter activeTab;
  final String searchQuery;
  final String? error;

  TaskState({
    this.isLoading = false,
    this.tasks = const [],
    this.activeTab = TaskTabFilter.all,
    this.searchQuery = '',
    this.error,
  });

  TaskState copyWith({
    bool? isLoading,
    List<TaskItem>? tasks,
    TaskTabFilter? activeTab,
    String? searchQuery,
    String? error,
  }) {
    return TaskState(
      isLoading: isLoading ?? this.isLoading,
      tasks: tasks ?? this.tasks,
      activeTab: activeTab ?? this.activeTab,
      searchQuery: searchQuery ?? this.searchQuery,
      error: error,
    );
  }

  // Filtered task computation based on KPI tabs and search
  List<TaskItem> filteredTasks(String currentMemberId) {
    return tasks.where((task) {
      // Search query filter
      if (searchQuery.isNotEmpty) {
        final matchesTitle = task.title.toLowerCase().contains(searchQuery.toLowerCase());
        final matchesDesc = (task.description ?? '').toLowerCase().contains(searchQuery.toLowerCase());
        if (!matchesTitle && !matchesDesc) return false;
      }

      final now = DateTime.now();
      final todayStart = DateTime(now.year, now.month, now.day);
      final todayEnd = todayStart.add(const Duration(days: 1));

      switch (activeTab) {
        case TaskTabFilter.all:
          return true;
        case TaskTabFilter.myActive:
          return task.assigneeId == currentMemberId && !task.isCompleted;
        case TaskTabFilter.dueToday:
          if (task.isCompleted || task.dueDate == null) return false;
          return task.dueDate!.isAfter(todayStart.subtract(const Duration(seconds: 1))) &&
              task.dueDate!.isBefore(todayEnd);
        case TaskTabFilter.overdue:
          if (task.isCompleted || task.dueDate == null) return false;
          return task.dueDate!.isBefore(todayStart);
        case TaskTabFilter.completed:
          return task.isCompleted;
      }
    }).toList();
  }

  // KPI Metrics
  int countMyActive(String currentMemberId) =>
      tasks.where((t) => t.assigneeId == currentMemberId && !t.isCompleted).length;

  int countDueToday() {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = todayStart.add(const Duration(days: 1));
    return tasks.where((t) {
      if (t.isCompleted || t.dueDate == null) return false;
      return t.dueDate!.isAfter(todayStart.subtract(const Duration(seconds: 1))) &&
          t.dueDate!.isBefore(todayEnd);
    }).length;
  }

  int countOverdue() {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    return tasks.where((t) => !t.isCompleted && t.dueDate != null && t.dueDate!.isBefore(todayStart)).length;
  }

  int countCompleted() => tasks.where((t) => t.isCompleted).length;
}

class TaskNotifier extends StateNotifier<TaskState> {
  final Ref ref;
  TaskNotifier(this.ref) : super(TaskState(isLoading: true)) {
    fetchTasks();
  }

  String? get _workspaceId => ref.read(authProvider).workspace?.id;
  bool get _isOwner => ref.read(authProvider).workspace?.isOwner ?? false;
  String get _currentMemberId => ref.read(authProvider).workspace?.memberId ?? '';

  void setTab(TaskTabFilter tab) {
    state = state.copyWith(activeTab: tab);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<void> fetchTasks() async {
    final wsId = _workspaceId;
    if (wsId == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.get(ApiEndpoints.tasks(wsId));
      if (res is Map && res.containsKey('tasks')) {
        final list = (res['tasks'] as List<dynamic>)
            .map((item) => TaskItem.fromJson(item as Map<String, dynamic>))
            .toList();
        state = state.copyWith(isLoading: false, tasks: list);
      } else if (res is List) {
        final list = res.map((item) => TaskItem.fromJson(item as Map<String, dynamic>)).toList();
        state = state.copyWith(isLoading: false, tasks: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Strictly enforces View-Only role permissions.
  /// If the current member is neither Owner nor the direct Assignee, modification is blocked.
  Future<String?> updateTaskStatus(TaskItem task, String targetStatus) async {
    final canInteract = task.canInteract(_isOwner, _currentMemberId);
    if (!canInteract) {
      final assigneeName = task.assignee?.name ?? 'the assigned member';
      return 'View-Only: This task is assigned to $assigneeName by the Owner. You can view all details, but cannot edit or change status.';
    }

    final wsId = _workspaceId;
    if (wsId == null) return 'No active workspace';

    try {
      await ApiClient.patch(
        ApiEndpoints.taskDetail(wsId, task.id),
        {'status': targetStatus},
      );
      await fetchTasks();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> createTask({
    required String title,
    String? description,
    String priority = 'MEDIUM',
    String? assigneeId,
    DateTime? dueDate,
    String? parentId,
  }) async {
    final wsId = _workspaceId;
    if (wsId == null) return 'No active workspace';

    try {
      await ApiClient.post(
        ApiEndpoints.tasks(wsId),
        {
          'title': title.trim(),
          'description': description?.trim(),
          'priority': priority,
          'assigneeId': assigneeId,
          'dueDate': dueDate?.toIso8601String(),
          'parentId': parentId,
        },
      );
      await fetchTasks();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> addSubtask(String parentId, String title) async {
    return createTask(
      title: title,
      parentId: parentId,
    );
  }
}

final taskProvider = StateNotifierProvider<TaskNotifier, TaskState>((ref) {
  return TaskNotifier(ref);
});
