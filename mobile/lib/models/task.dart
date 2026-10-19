class LeafProgress {
  final int totalLeaves;
  final int completedLeaves;
  final int percentage;

  LeafProgress({
    required this.totalLeaves,
    required this.completedLeaves,
    required this.percentage,
  });

  factory LeafProgress.fromJson(Map<String, dynamic> json) {
    return LeafProgress(
      totalLeaves: json['totalLeaves'] ?? 0,
      completedLeaves: json['completedLeaves'] ?? 0,
      percentage: json['percentage'] ?? 0,
    );
  }
}

class TaskAssignee {
  final String id;
  final String? name;
  final String email;
  final String? avatarUrl;

  TaskAssignee({
    required this.id,
    this.name,
    required this.email,
    this.avatarUrl,
  });

  factory TaskAssignee.fromJson(Map<String, dynamic> json) {
    final user = json['user'] ?? json;
    return TaskAssignee(
      id: json['id'] ?? user['id'] ?? '',
      name: user['name'],
      email: user['email'] ?? '',
      avatarUrl: user['avatarUrl'],
    );
  }
}

class TaskItem {
  final String id;
  final String title;
  final String? description;
  final String status; // TODO, IN_PROGRESS, IN_REVIEW, DONE, CLOSED
  final String priority; // LOW, MEDIUM, HIGH, URGENT
  final DateTime? dueDate;
  final String? assigneeId;
  final String? parentId;
  final String? creatorName;
  final TaskAssignee? assignee;
  final LeafProgress? leafProgress;
  final List<TaskItem> children;
  final DateTime createdAt;

  TaskItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    this.assigneeId,
    this.parentId,
    this.creatorName,
    this.assignee,
    this.leafProgress,
    this.children = const [],
    required this.createdAt,
  });

  bool get isCompleted => status == 'DONE' || status == 'CLOSED';

  bool isAssignedByOwnerToMe(String currentMemberId) {
    if (assigneeId != currentMemberId) return false;
    final cName = (creatorName ?? '').toLowerCase();
    return cName.contains('mayank') || cName.contains('owner');
  }

  bool canInteract(bool isOwner, String currentMemberId) {
    return isOwner || assigneeId == currentMemberId;
  }

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      status: json['status'] ?? 'TODO',
      priority: json['priority'] ?? 'MEDIUM',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate']) : null,
      assigneeId: json['assigneeId'],
      parentId: json['parentId'],
      creatorName: json['creator'] != null ? json['creator']['name'] : null,
      assignee: json['assignee'] != null ? TaskAssignee.fromJson(json['assignee']) : null,
      leafProgress: json['leafProgress'] != null ? LeafProgress.fromJson(json['leafProgress']) : null,
      children: (json['children'] as List<dynamic>?)
              ?.map((c) => TaskItem.fromJson(c as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
