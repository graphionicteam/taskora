import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../dashboard/dashboard_screen.dart';
import '../tasks/task_list_screen.dart';
import '../projects/project_list_screen.dart';
import '../attendance/attendance_screen.dart';
import '../inbox/inbox_screen.dart';
import '../more/more_screen.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(onNavigateToTasks: () => setState(() => _currentIndex = 1)),
      const TaskListScreen(),
      const ProjectListScreen(),
      const AttendanceScreen(),
      const InboxScreen(),
      const MoreScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex > 4 ? 4 : _currentIndex,
        onDestinationSelected: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded, color: AppColors.primary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.check_box_outlined),
            selectedIcon: Icon(Icons.check_box_rounded, color: AppColors.primary),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder_rounded, color: AppColors.primary),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(Icons.location_on_outlined),
            selectedIcon: Icon(Icons.location_on_rounded, color: AppColors.primary),
            label: 'Attendance',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded, color: AppColors.primary),
            label: 'Inbox',
          ),
        ],
      ),
    );
  }
}
