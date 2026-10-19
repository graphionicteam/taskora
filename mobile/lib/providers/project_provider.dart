import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/project.dart';
import 'auth_provider.dart';

class ProjectState {
  final bool isLoading;
  final List<Project> projects;
  final TreasurySummary? treasury;
  final String? error;

  ProjectState({
    this.isLoading = false,
    this.projects = const [],
    this.treasury,
    this.error,
  });

  ProjectState copyWith({
    bool? isLoading,
    List<Project>? projects,
    TreasurySummary? treasury,
    String? error,
  }) {
    return ProjectState(
      isLoading: isLoading ?? this.isLoading,
      projects: projects ?? this.projects,
      treasury: treasury ?? this.treasury,
      error: error,
    );
  }
}

class ProjectNotifier extends StateNotifier<ProjectState> {
  final Ref ref;
  ProjectNotifier(this.ref) : super(ProjectState(isLoading: true)) {
    fetchProjects();
  }

  String? get _workspaceId => ref.read(authProvider).workspace?.id;

  Future<void> fetchProjects() async {
    final wsId = _workspaceId;
    if (wsId == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.get('${ApiEndpoints.projects}?workspaceId=$wsId');
      if (res is Map) {
        final rawProjects = res['projects'] as List<dynamic>? ?? [];
        final projectList = rawProjects
            .map((p) => Project.fromJson(p as Map<String, dynamic>))
            .toList();

        final treasury = res['treasury'] != null
            ? TreasurySummary.fromJson(res['treasury'] as Map<String, dynamic>)
            : null;

        state = state.copyWith(
          isLoading: false,
          projects: projectList,
          treasury: treasury,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<String?> createProject({
    required String name,
    String? description,
    String? clientName,
    required double totalBudget,
  }) async {
    final wsId = _workspaceId;
    if (wsId == null) return 'No active workspace';

    try {
      await ApiClient.post(
        ApiEndpoints.projects,
        {
          'workspaceId': wsId,
          'name': name.trim(),
          'description': description?.trim(),
          'clientName': clientName?.trim(),
          'totalBudget': totalBudget,
        },
      );
      await fetchProjects();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
  }
}

final projectProvider = StateNotifierProvider<ProjectNotifier, ProjectState>((ref) {
  return ProjectNotifier(ref);
});
