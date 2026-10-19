import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final attState = ref.watch(attendanceProvider);

    final currentMemberId = authState.workspace?.memberId ?? '';
    final myRecord = attState.myTodayRecord(currentMemberId);
    final hasCheckedIn = myRecord?.checkInTime != null;
    final hasCheckedOut = myRecord?.checkOutTime != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance & Geofencing', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location_rounded),
            onPressed: () => ref.read(attendanceProvider.notifier).updateCurrentLocation(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(attendanceProvider.notifier).loadAttendance(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Geofence Radar Status Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: attState.isWithinGeofence ? AppColors.statusDone : Colors.orange.shade400,
                    width: 1.5,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: (attState.isWithinGeofence ? AppColors.statusDone : Colors.orange.shade600)
                              .withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          attState.isWithinGeofence ? Icons.location_on_rounded : Icons.location_off_rounded,
                          size: 36,
                          color: attState.isWithinGeofence ? AppColors.statusDone : Colors.orange.shade700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        attState.office?.name ?? 'Main Office',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                      ),
                      const SizedBox(height: 4),
                      if (attState.distanceMeters != null)
                        Text(
                          '${attState.distanceMeters!.round()}m from office (${attState.office?.radiusMeters.round() ?? 100}m allowed)',
                          style: TextStyle(
                            fontSize: 13,
                            color: attState.isWithinGeofence ? AppColors.statusDone : Colors.orange.shade800,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                      else
                        const Text(
                          'Acquiring GPS location...',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                      const SizedBox(height: 16),

                      // Punch Action Button
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: hasCheckedIn && !hasCheckedOut
                              ? Colors.orange.shade600
                              : AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                        ),
                        icon: Icon(hasCheckedIn && !hasCheckedOut ? Icons.logout : Icons.login),
                        label: Text(
                          hasCheckedOut
                              ? 'Completed for Today'
                              : hasCheckedIn
                                  ? 'Punch Out'
                                  : 'Punch In (GPS)',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        onPressed: hasCheckedOut
                            ? null
                            : () async {
                                final err = await ref
                                    .read(attendanceProvider.notifier)
                                    .punch(isCheckOut: hasCheckedIn);
                                if (err != null && context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(err), backgroundColor: AppColors.priorityUrgent),
                                  );
                                }
                              },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Today's Status Card
              if (myRecord != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Today's Punch Times", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _TimeBox(
                              label: 'Check In',
                              time: myRecord.checkInTime != null
                                  ? DateFormat('h:mm a').format(myRecord.checkInTime!)
                                  : '—',
                            ),
                            _TimeBox(
                              label: 'Check Out',
                              time: myRecord.checkOutTime != null
                                  ? DateFormat('h:mm a').format(myRecord.checkOutTime!)
                                  : '—',
                            ),
                            _TimeBox(
                              label: 'Status',
                              time: myRecord.status,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Team Attendance Log
              Text(
                'Team Attendance (${attState.records.length})',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),

              if (attState.records.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        'No punches recorded for today yet.',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ),
                  ),
                )
              else
                ...attState.records.map((r) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary.withOpacity(0.1),
                        child: Text(
                          r.memberName.isNotEmpty ? r.memberName[0] : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ),
                      title: Text(r.memberName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(
                        r.checkInTime != null
                            ? 'In: ${DateFormat('h:mm a').format(r.checkInTime!)}'
                            : 'Not punched in',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.statusDone.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          r.status,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.statusDone),
                        ),
                      ),
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

class _TimeBox extends StatelessWidget {
  final String label;
  final String time;

  const _TimeBox({required this.label, required this.time});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(time, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }
}
