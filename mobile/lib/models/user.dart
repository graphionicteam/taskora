class User {
  final String id;
  final String email;
  final String? name;
  final String? avatarUrl;

  User({
    required this.id,
    required this.email,
    this.name,
    this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'],
      avatarUrl: json['avatarUrl'] ?? json['image'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'avatarUrl': avatarUrl,
  };
}
