import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final ws = authState.workspace;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Settings', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      user?.name != null && user!.name!.isNotEmpty
                          ? user.name![0].toUpperCase()
                          : 'U',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'Team Member',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? '',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            ws?.role ?? 'MEMBER',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Workspace Information Section
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.business_rounded, color: AppColors.primary),
                  title: const Text('Workspace'),
                  subtitle: Text(ws?.name ?? 'Taskora Workspace'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.badge_rounded, color: AppColors.primary),
                  title: const Text('Designation'),
                  subtitle: Text(ws?.designation ?? 'Team Member'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // About Taskora
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.cloud_done_rounded, color: AppColors.statusDone),
                  title: const Text('Cloud Backend'),
                  subtitle: const Text('Connected to Vercel & Supabase PostgreSQL'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.info_outline_rounded),
                  title: const Text('Version'),
                  subtitle: const Text('Taskora Mobile 1.0.0 (Flutter Riverpod)'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Sign Out Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade50,
              foregroundColor: Colors.red.shade700,
              side: BorderSide(color: Colors.red.shade200),
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Sign Out'),
                  content: const Text('Are you sure you want to log out of Taskora?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                await ref.read(authProvider.notifier).logout();
              }
            },
          ),
        ],
      ),
    );
  }
}
