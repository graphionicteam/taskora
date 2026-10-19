class Conversation {
  final String id;
  final String type; // DIRECT, GROUP
  final String? title;
  final DateTime updatedAt;
  final String lastMessageText;
  final String? otherParticipantName;

  Conversation({
    required this.id,
    required this.type,
    this.title,
    required this.updatedAt,
    required this.lastMessageText,
    this.otherParticipantName,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    String lastText = 'No messages yet';
    final messages = json['messages'] as List<dynamic>?;
    if (messages != null && messages.isNotEmpty) {
      lastText = messages.first['content'] ?? '';
    }

    return Conversation(
      id: json['id'] ?? '',
      type: json['type'] ?? 'DIRECT',
      title: json['title'],
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt']) ?? DateTime.now()
          : DateTime.now(),
      lastMessageText: lastText,
      otherParticipantName: json['title'],
    );
  }
}

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] ?? {};
    final user = sender['user'] ?? sender;

    return ChatMessage(
      id: json['id'] ?? '',
      conversationId: json['conversationId'] ?? '',
      senderId: user['id'] ?? '',
      senderName: user['name'] ?? 'Team Member',
      content: json['content'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
