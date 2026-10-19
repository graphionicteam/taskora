import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../tasks/task_detail_screen.dart';

class DashboardScreen extends ConsumerWidget {
  final VoidCallback onNavigateToTasks;

  const DashboardScreen({super.key, required this.onNavigateToTasks});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final taskState = ref.watch(taskProvider);

    final currentMemberId = authState.workspace?.memberId ?? '';
    final userName = authState.user?.name ?? 'Team Member';
    final workspaceName = authState.workspace?.name ?? 'Taskora Workspace';
    final role = authState.workspace?.role ?? 'MEMBER';

    final myActiveCount = taskState.countMyActive(currentMemberId);
    final dueTodayCount = taskState.countDueToday();
    final overdueCount = taskState.countOverdue();
    final completedCount = taskState.countCompleted();

    final todayTasks = taskState.tasks.take(5).toList();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hello, ${userName.split(' ').first} 👋',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Row(
              children: [
                Text(
                  workspaceName,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    role,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(taskProvider.notifier).fetchTasks(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(taskProvider.notifier).fetchTasks(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 4 KPI Summary Cards Grid
              Row(
                children: [
                  Expanded(
                    child: _KpiCard(
                      title: 'My Active',
                      count: myActiveCount,
                      icon: Icons.person_outline,
                      color: AppColors.primary,
                      onTap: () {
                        ref.read(taskProvider.notifier).setTab(TaskTabFilter.myActive);
                        onNavigateToTasks();
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _KpiCard(
                      title: 'Due Today',
                      count: dueTodayCount,
                      icon: Icons.alarm_rounded,
                      color: Colors.blue.shade600,
                      onTap: () {
                        ref.read(taskProvider.notifier).setTab(TaskTabFilter.dueToday);
                        onNavigateToTasks();
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _KpiCard(
                      title: 'Overdue',
                      count: overdueCount,
                      icon: Icons.warning_amber_rounded,
                      color: AppColors.priorityUrgent,
                      onTap: () {
                        ref.read(taskProvider.notifier).setTab(TaskTabFilter.overdue);
                        onNavigateToTasks();
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _KpiCard(
                      title: 'Completed',
                      count: completedCount,
                      icon: Icons.check_circle_outline,
                      color: AppColors.statusDone,
                      onTap: () {
                        ref.read(taskProvider.notifier).setTab(TaskTabFilter.completed);
                        onNavigateToTasks();
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Recent Agenda Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Today's Agenda",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  TextButton(
                    onPressed: onNavigateToTasks,
                    child: const Text('View All'),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (taskState.isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
              else if (todayTasks.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.done_all_rounded, size: 48, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          const Text('All caught up! No pending tasks for today.'),
                        ],
                      ),
                    ),
                  ),
                )
              else
                ...todayTasks.map((task) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      leading: Icon(
                        task.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                        color: task.isCompleted ? AppColors.statusDone : Colors.grey,
                      ),
                      title: Text(
                        task.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      subtitle: Text(
                        task.dueDate != null
                            ? 'Due ${DateFormat('MMM d, h:mm a').format(task.dueDate!)}'
                            : 'No due date',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: const Icon(Icons.chevron_right, size: 20),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => TaskDetailScreen(task: task),
                          ),
                        );
                      },
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _KpiCard({
    required this.title,
    required this.count,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
