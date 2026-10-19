import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../models/task.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import 'create_task_sheet.dart';
import 'task_detail_screen.dart';

class TaskListScreen extends ConsumerWidget {
  const TaskListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final taskState = ref.watch(taskProvider);

    final currentMemberId = authState.workspace?.memberId ?? '';
    final isOwner = authState.workspace?.isOwner ?? false;

    final tasks = taskState.filteredTasks(currentMemberId);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => _openCreateTaskSheet(context),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateTaskSheet(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (val) => ref.read(taskProvider.notifier).setSearchQuery(val),
              decoration: InputDecoration(
                hintText: 'Search tasks by title or details...',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                suffixIcon: taskState.searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () => ref.read(taskProvider.notifier).setSearchQuery(''),
                      )
                    : null,
              ),
            ),
          ),

          // Horizontal Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All (${taskState.tasks.length})',
                  isSelected: taskState.activeTab == TaskTabFilter.all,
                  onSelected: () => ref.read(taskProvider.notifier).setTab(TaskTabFilter.all),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'My Active (${taskState.countMyActive(currentMemberId)})',
                  isSelected: taskState.activeTab == TaskTabFilter.myActive,
                  onSelected: () => ref.read(taskProvider.notifier).setTab(TaskTabFilter.myActive),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Due Today (${taskState.countDueToday()})',
                  isSelected: taskState.activeTab == TaskTabFilter.dueToday,
                  onSelected: () => ref.read(taskProvider.notifier).setTab(TaskTabFilter.dueToday),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Overdue (${taskState.countOverdue()})',
                  isSelected: taskState.activeTab == TaskTabFilter.overdue,
                  onSelected: () => ref.read(taskProvider.notifier).setTab(TaskTabFilter.overdue),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Completed (${taskState.countCompleted()})',
                  isSelected: taskState.activeTab == TaskTabFilter.completed,
                  onSelected: () => ref.read(taskProvider.notifier).setTab(TaskTabFilter.completed),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Task List View
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(taskProvider.notifier).fetchTasks(),
              child: taskState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : tasks.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inbox_rounded, size: 56, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              Text(
                                'No tasks found',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: tasks.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final task = tasks[index];
                            final canInteract = task.canInteract(isOwner, currentMemberId);
                            final isAssignedToMeByOwner = task.isAssignedByOwnerToMe(currentMemberId);
                            final isOtherPerson = !isOwner && task.assigneeId != currentMemberId;

                            return Card(
                              color: isAssignedToMeByOwner
                                  ? AppColors.ownerHighlightBg.withOpacity(0.3)
                                  : null,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(
                                  color: isAssignedToMeByOwner
                                      ? AppColors.ownerHighlightBorder
                                      : Theme.of(context).cardTheme.shape is RoundedRectangleBorder
                                          ? (Theme.of(context).cardTheme.shape as RoundedRectangleBorder).side.color
                                          : AppColors.borderLight,
                                  width: isAssignedToMeByOwner ? 1.5 : 1,
                                ),
                              ),
                              child: InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => TaskDetailScreen(task: task),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Top Row: Checkbox, Title, Status
                                      Row(
                                        children: [
                                          IconButton(
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            icon: Icon(
                                              task.isCompleted
                                                  ? Icons.check_circle_rounded
                                                  : Icons.radio_button_unchecked_rounded,
                                              color: task.isCompleted
                                                  ? AppColors.statusDone
                                                  : canInteract
                                                      ? Colors.grey.shade400
                                                      : Colors.grey.shade300,
                                            ),
                                            onPressed: () async {
                                              if (!canInteract) {
                                                final assignee = task.assignee?.name ?? 'the assigned member';
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(
                                                    content: Text(
                                                      'View-Only: This task is assigned to $assignee by the Owner. Other members cannot edit its status.',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }
                                              final target = task.isCompleted ? 'TODO' : 'DONE';
                                              final err = await ref
                                                  .read(taskProvider.notifier)
                                                  .updateTaskStatus(task, target);
                                              if (err != null && context.mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(content: Text(err)),
                                                );
                                              }
                                            },
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              task.title,
                                              style: TextStyle(
                                                fontWeight: FontWeight.w600,
                                                fontSize: 15,
                                                decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                                                color: task.isCompleted
                                                    ? Colors.grey
                                                    : Theme.of(context).colorScheme.onSurface,
                                              ),
                                            ),
                                          ),
                                          _PriorityBadge(priority: task.priority),
                                        ],
                                      ),

                                      // Badges Row
                                      if (isAssignedToMeByOwner || (isOtherPerson && task.assignee != null)) ...[
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            if (isAssignedToMeByOwner)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: AppColors.ownerHighlightBg,
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: AppColors.ownerHighlightBorder),
                                                ),
                                                child: const Text(
                                                  '⭐ Assigned to You by Mayank Parmar',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppColors.ownerHighlightText,
                                                  ),
                                                ),
                                              ),
                                            if (isOtherPerson && task.assignee != null)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: Colors.grey.shade100,
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: Colors.grey.shade300),
                                                ),
                                                child: Text(
                                                  '👁️ Owner shared to ${task.assignee!.name?.split(' ').first ?? 'Member'}',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w500,
                                                    color: Colors.grey.shade700,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],

                                      // Bottom Metadata: Due Date & Subtasks count
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              if (task.dueDate != null) ...[
                                                Icon(
                                                  Icons.calendar_today_rounded,
                                                  size: 13,
                                                  color: Colors.grey.shade500,
                                                ),
                                                const SizedBox(width: 4),
                                                Text(
                                                  DateFormat('MMM d').format(task.dueDate!),
                                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                                ),
                                                const SizedBox(width: 12),
                                              ],
                                              if (task.leafProgress != null && task.leafProgress!.totalLeaves > 0)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: Colors.grey.shade200,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    '${task.leafProgress!.completedLeaves}/${task.leafProgress!.totalLeaves} subtasks (${task.leafProgress!.percentage}%)',
                                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          if (task.assignee?.name != null)
                                            Text(
                                              task.assignee!.name!,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: Colors.grey.shade500,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  void _openCreateTaskSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateTaskSheet(),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onSelected,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.borderLight,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final String priority;

  const _PriorityBadge({required this.priority});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (priority) {
      case 'URGENT':
        color = AppColors.priorityUrgent;
        break;
      case 'HIGH':
        color = AppColors.priorityHigh;
        break;
      case 'LOW':
        color = AppColors.priorityLow;
        break;
      default:
        color = AppColors.priorityMedium;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        priority,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }
}
