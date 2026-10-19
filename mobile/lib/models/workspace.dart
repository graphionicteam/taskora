import 'user.dart';

class Workspace {
  final String id;
  final String name;
  final String slug;
  final String role; // OWNER, ADMIN, MEMBER, GUEST
  final String memberId;
  final String? designation;

  Workspace({
    required this.id,
    required this.name,
    required this.slug,
    required this.role,
    required this.memberId,
    this.designation,
  });

  bool get isOwner => role == 'OWNER' || role == 'ADMIN';

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      role: json['role'] ?? 'MEMBER',
      memberId: json['memberId'] ?? '',
      designation: json['designation'],
    );
  }
}

class WorkspaceMember {
  final String id;
  final String role;
  final String status;
  final User user;
  final String? designationName;

  WorkspaceMember({
    required this.id,
    required this.role,
    required this.status,
    required this.user,
    this.designationName,
  });

  factory WorkspaceMember.fromJson(Map<String, dynamic> json) {
    return WorkspaceMember(
      id: json['id'] ?? '',
      role: json['role'] ?? 'MEMBER',
      status: json['status'] ?? 'ACTIVE',
      user: User.fromJson(json['user'] ?? {}),
      designationName: json['designation'] != null ? json['designation']['name'] : null,
    );
  }
}
