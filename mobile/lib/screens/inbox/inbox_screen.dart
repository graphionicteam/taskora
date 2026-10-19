import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';

class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatState = ref.watch(chatProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox & Collaboration', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(chatProvider.notifier).fetchConversations(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(chatProvider.notifier).fetchConversations(),
        child: chatState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : chatState.conversations.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded, size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text('No conversations yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: chatState.conversations.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final conv = chatState.conversations[index];
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.primary.withOpacity(0.1),
                            child: Icon(
                              conv.type == 'GROUP' ? Icons.group_rounded : Icons.person_rounded,
                              color: AppColors.primary,
                            ),
                          ),
                          title: Text(
                            conv.title ?? 'Team Chat',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            conv.lastMessageText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                          ),
                          trailing: Text(
                            DateFormat('MMM d').format(conv.updatedAt),
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                          ),
                          onTap: () {
                            ref.read(chatProvider.notifier).setActiveConversation(conv.id);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => _ChatDetailScreen(conversationTitle: conv.title ?? 'Chat'),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

class _ChatDetailScreen extends ConsumerStatefulWidget {
  final String conversationTitle;
  const _ChatDetailScreen({required this.conversationTitle});

  @override
  ConsumerState<_ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<_ChatDetailScreen> {
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  void _handleSend() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final activeId = ref.read(chatProvider).activeConversationId;
    if (activeId == null) return;

    _messageController.clear();
    await ref.read(chatProvider.notifier).sendMessage(activeId, text);
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final currentUserId = ref.watch(authProvider).user?.id ?? '';
    final messages = chatState.currentMessages;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.conversationTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          Expanded(
            child: messages.isEmpty
                ? const Center(child: Text('No messages yet. Say hello!'))
                : ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[messages.length - 1 - index];
                      final isMe = msg.senderId == currentUserId;

                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: isMe ? AppColors.primary : Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(16).copyWith(
                              bottomRight: isMe ? const Radius.circular(0) : const Radius.circular(16),
                              bottomLeft: !isMe ? const Radius.circular(0) : const Radius.circular(16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              if (!isMe)
                                Text(
                                  msg.senderName,
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
                                ),
                              Text(
                                msg.content,
                                style: TextStyle(
                                  color: isMe ? Colors.white : Colors.black87,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                DateFormat('h:mm a').format(msg.createdAt),
                                style: TextStyle(
                                  fontSize: 9,
                                  color: isMe ? Colors.white70 : Colors.black45,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                border: Border(top: BorderSide(color: AppColors.borderLight)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Type a message...',
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: (_) => _handleSend(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _handleSend,
                    icon: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
