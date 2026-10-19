class OfficeLocation {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double radiusMeters;

  OfficeLocation({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  factory OfficeLocation.fromJson(Map<String, dynamic> json) {
    return OfficeLocation(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Main Office',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 23.0225,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 72.5714,
      radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 100.0,
    );
  }
}

class AttendanceRecord {
  final String id;
  final String memberId;
  final String memberName;
  final String? designation;
  final String date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final double? distanceMeters;
  final String status; // PRESENT, LATE, HALF_DAY, ABSENT
  final bool verified;

  AttendanceRecord({
    required this.id,
    required this.memberId,
    required this.memberName,
    this.designation,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.distanceMeters,
    required this.status,
    required this.verified,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final member = json['member'] ?? {};
    final user = member['user'] ?? {};
    final designation = member['designation']?['name'];

    return AttendanceRecord(
      id: json['id'] ?? '',
      memberId: json['memberId'] ?? member['id'] ?? '',
      memberName: user['name'] ?? 'Team Member',
      designation: designation,
      date: json['date'] ?? '',
      checkInTime: json['checkInTime'] != null ? DateTime.tryParse(json['checkInTime']) : null,
      checkOutTime: json['checkOutTime'] != null ? DateTime.tryParse(json['checkOutTime']) : null,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      status: json['status'] ?? 'PRESENT',
      verified: json['verified'] ?? true,
    );
  }
}
