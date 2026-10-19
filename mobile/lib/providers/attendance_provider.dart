import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/attendance.dart';
import 'auth_provider.dart';

class AttendanceState {
  final bool isLoading;
  final OfficeLocation? office;
  final List<AttendanceRecord> records;
  final Position? userPosition;
  final double? distanceMeters;
  final bool isWithinGeofence;
  final String? error;

  AttendanceState({
    this.isLoading = false,
    this.office,
    this.records = const [],
    this.userPosition,
    this.distanceMeters,
    this.isWithinGeofence = false,
    this.error,
  });

  AttendanceRecord? myTodayRecord(String currentMemberId) {
    try {
      return records.firstWhere((r) => r.memberId == currentMemberId);
    } catch (_) {
      return null;
    }
  }

  AttendanceState copyWith({
    bool? isLoading,
    OfficeLocation? office,
    List<AttendanceRecord>? records,
    Position? userPosition,
    double? distanceMeters,
    bool? isWithinGeofence,
    String? error,
  }) {
    return AttendanceState(
      isLoading: isLoading ?? this.isLoading,
      office: office ?? this.office,
      records: records ?? this.records,
      userPosition: userPosition ?? this.userPosition,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      isWithinGeofence: isWithinGeofence ?? this.isWithinGeofence,
      error: error,
    );
  }
}

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final Ref ref;
  AttendanceNotifier(this.ref) : super(AttendanceState(isLoading: true)) {
    loadAttendance();
  }

  String? get _workspaceId => ref.read(authProvider).workspace?.id;

  Future<void> loadAttendance() async {
    final wsId = _workspaceId;
    if (wsId == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.get('${ApiEndpoints.attendance}?workspaceId=$wsId');
      if (res is Map) {
        final office = res['office'] != null ? OfficeLocation.fromJson(res['office']) : null;
        final rawRecords = res['records'] as List<dynamic>? ?? [];
        final records = rawRecords
            .map((r) => AttendanceRecord.fromJson(r as Map<String, dynamic>))
            .toList();

        state = state.copyWith(
          isLoading: false,
          office: office,
          records: records,
        );

        // Fetch location after office coordinates are loaded
        await updateCurrentLocation();
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        state = state.copyWith(error: 'Location services are disabled.');
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          state = state.copyWith(error: 'Location permissions are denied.');
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        state = state.copyWith(error: 'Location permissions are permanently denied.');
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      double? dist;
      bool within = false;
      if (state.office != null) {
        dist = Geolocator.distanceBetween(
          pos.latitude,
          pos.longitude,
          state.office!.latitude,
          state.office!.longitude,
        );
        within = dist <= state.office!.radiusMeters;
      }

      state = state.copyWith(
        userPosition: pos,
        distanceMeters: dist,
        isWithinGeofence: within,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(error: 'Could not acquire GPS location: $e');
    }
  }

  Future<String?> punch({required bool isCheckOut}) async {
    final wsId = _workspaceId;
    if (wsId == null) return 'No active workspace';

    await updateCurrentLocation();
    final pos = state.userPosition;

    if (pos == null) {
      return 'Please enable GPS location to punch attendance.';
    }

    try {
      await ApiClient.post(
        ApiEndpoints.attendance,
        {
          'workspaceId': wsId,
          'latitude': pos.latitude,
          'longitude': pos.longitude,
          'action': isCheckOut ? 'CHECK_OUT' : 'CHECK_IN',
        },
      );
      await loadAttendance();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  return AttendanceNotifier(ref);
});
