import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/message.dart';

class ChatState {
  final bool isLoading;
  final List<Conversation> conversations;
  final Map<String, List<ChatMessage>> messagesByConvId;
  final String? activeConversationId;
  final String? error;

  ChatState({
    this.isLoading = false,
    this.conversations = const [],
    this.messagesByConvId = const {},
    this.activeConversationId,
    this.error,
  });

  List<ChatMessage> get currentMessages =>
      activeConversationId != null ? (messagesByConvId[activeConversationId] ?? []) : [];

  ChatState copyWith({
    bool? isLoading,
    List<Conversation>? conversations,
    Map<String, List<ChatMessage>>? messagesByConvId,
    String? activeConversationId,
    String? error,
  }) {
    return ChatState(
      isLoading: isLoading ?? this.isLoading,
      conversations: conversations ?? this.conversations,
      messagesByConvId: messagesByConvId ?? this.messagesByConvId,
      activeConversationId: activeConversationId ?? this.activeConversationId,
      error: error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  ChatNotifier() : super(ChatState(isLoading: true)) {
    fetchConversations();
  }

  Future<void> fetchConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.get(ApiEndpoints.inboxMessages);
      if (res is List) {
        final convs = res.map((c) => Conversation.fromJson(c as Map<String, dynamic>)).toList();
        state = state.copyWith(isLoading: false, conversations: convs);
      } else if (res is Map && res['conversations'] is List) {
        final convs = (res['conversations'] as List)
            .map((c) => Conversation.fromJson(c as Map<String, dynamic>))
            .toList();
        state = state.copyWith(isLoading: false, conversations: convs);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setActiveConversation(String conversationId) {
    state = state.copyWith(activeConversationId: conversationId);
    fetchMessages(conversationId);
  }

  Future<void> fetchMessages(String conversationId) async {
    try {
      final res = await ApiClient.get('${ApiEndpoints.inboxMessages}?conversationId=$conversationId');
      if (res is List) {
        final messages = res.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)).toList();
        final map = Map<String, List<ChatMessage>>.from(state.messagesByConvId);
        map[conversationId] = messages;
        state = state.copyWith(messagesByConvId: map);
      }
    } catch (_) {}
  }

  Future<String?> sendMessage(String conversationId, String content) async {
    if (content.trim().isEmpty) return null;

    try {
      await ApiClient.post(
        ApiEndpoints.inboxMessages,
        {
          'conversationId': conversationId,
          'content': content.trim(),
        },
      );
      await fetchMessages(conversationId);
      await fetchConversations();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier();
});
