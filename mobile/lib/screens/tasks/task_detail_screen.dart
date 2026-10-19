import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../models/task.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  final TaskItem task;

  const TaskDetailScreen({super.key, required this.task});

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  final _subtaskController = TextEditingController();
  bool _isAddingSubtask = false;

  @override
  void dispose() {
    _subtaskController.dispose();
    super.dispose();
  }

  void _handleAddSubtask() async {
    final title = _subtaskController.text.trim();
    if (title.isEmpty) return;

    setState(() => _isAddingSubtask = true);
    final error = await ref.read(taskProvider.notifier).addSubtask(widget.task.id, title);
    setState(() => _isAddingSubtask = false);

    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    } else {
      _subtaskController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final currentMemberId = authState.workspace?.memberId ?? '';
    final isOwner = authState.workspace?.isOwner ?? false;

    final canInteract = widget.task.canInteract(isOwner, currentMemberId);
    final isOtherPerson = !isOwner && widget.task.assigneeId != currentMemberId;
    final assigneeName = widget.task.assignee?.name ?? 'Assigned Member';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // View-Only Banner for Other Team Members
            if (isOtherPerson) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.slate.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.slate.shade300),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.visibility_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'View-Only Mode',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Owner Mayank Parmar shared this task to $assigneeName. You can view all details and subtasks, but cannot edit or change status.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Task Title
            Text(
              widget.task.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Metadata Row: Status, Priority, Due Date
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _StatusBadge(status: widget.task.status),
                _PriorityBadge(priority: widget.task.priority),
                if (widget.task.dueDate != null)
                  Chip(
                    avatar: const Icon(Icons.calendar_today, size: 14),
                    label: Text(DateFormat('MMM d, yyyy').format(widget.task.dueDate!)),
                    padding: EdgeInsets.zero,
                  ),
              ],
            ),
            const SizedBox(height: 20),

            // Description Section
            if (widget.task.description != null && widget.task.description!.isNotEmpty) ...[
              Text(
                'Description',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    widget.task.description!,
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade800),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Subtasks Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Subtasks (${widget.task.children.length})',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                if (widget.task.leafProgress != null)
                  Text(
                    '${widget.task.leafProgress!.completedLeaves}/${widget.task.leafProgress!.totalLeaves} Done (${widget.task.leafProgress!.percentage}%)',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            if (widget.task.children.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'No subtasks created for this task yet.',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                ),
              )
            else
              ...widget.task.children.map((subtask) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    leading: Icon(
                      subtask.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: subtask.isCompleted
                          ? AppColors.statusDone
                          : canInteract
                              ? Colors.grey.shade400
                              : Colors.grey.shade300,
                    ),
                    title: Text(
                      subtask.title,
                      style: TextStyle(
                        decoration: subtask.isCompleted ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    onTap: () async {
                      if (!canInteract) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'View-Only: This task is assigned to $assigneeName by the Owner. Other members cannot edit subtasks.',
                            ),
                          ),
                        );
                        return;
                      }
                      final target = subtask.isCompleted ? 'TODO' : 'DONE';
                      await ref.read(taskProvider.notifier).updateTaskStatus(subtask, target);
                    },
                  ),
                );
              }),

            const SizedBox(height: 16),

            // Quick Add Subtask Field (only for Owner or Assignee)
            if (canInteract) ...[
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _subtaskController,
                      decoration: const InputDecoration(
                        hintText: 'Add a subtask...',
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      ),
                      onSubmitted: (_) => _handleAddSubtask(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _isAddingSubtask ? null : _handleAddSubtask,
                    icon: _isAddingSubtask
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.add),
                  ),
                ],
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    '🔒 Subtasks can only be added by Owner or $assigneeName',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'DONE':
        color = AppColors.statusDone;
        break;
      case 'IN_PROGRESS':
        color = AppColors.statusInProgress;
        break;
      case 'IN_REVIEW':
        color = AppColors.statusInReview;
        break;
      default:
        color = AppColors.statusTodo;
    }

    return Chip(
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.3)),
      label: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
      ),
      padding: EdgeInsets.zero,
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

    return Chip(
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.3)),
      label: Text(
        priority,
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
      ),
      padding: EdgeInsets.zero,
    );
  }
}
