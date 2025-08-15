import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/ai_service.dart';
import '../providers/ai_provider.dart';

class AICoachScreen extends ConsumerStatefulWidget {
  const AICoachScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AICoachScreen> createState() => _AICoachScreenState();
}

class _AICoachScreenState extends ConsumerState<AICoachScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  
  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    _messageController.clear();
    
    // Add user message to chat
    ref.read(chatMessagesProvider.notifier).addMessage(
      ChatMessage(
        content: message,
        isUser: true,
        timestamp: DateTime.now(),
      ),
    );

    // Scroll to bottom
    _scrollToBottom();

    // Get AI response
    try {
      await ref.read(aiCoachProvider.notifier).sendMessage(message);
      _scrollToBottom();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatMessages = ref.watch(chatMessagesProvider);
    final isLoading = ref.watch(aiCoachLoadingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Fitness Coach'),
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showCoachInfo(context),
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Theme.of(context).colorScheme.surface,
              Theme.of(context).colorScheme.surface.withOpacity(0.95),
            ],
          ),
        ),
        child: Column(
          children: [
            // Quick action chips
            Container(
              height: 50,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildQuickActionChip(
                    'Workout Plan',
                    Icons.fitness_center,
                    () => _sendQuickMessage('Create a workout plan for me'),
                  ),
                  const SizedBox(width: 8),
                  _buildQuickActionChip(
                    'Form Check',
                    Icons.sports_gymnastics,
                    () => _sendQuickMessage('How can I improve my squat form?'),
                  ),
                  const SizedBox(width: 8),
                  _buildQuickActionChip(
                    'Nutrition',
                    Icons.restaurant,
                    () => _sendQuickMessage('What should I eat after workout?'),
                  ),
                  const SizedBox(width: 8),
                  _buildQuickActionChip(
                    'Progress',
                    Icons.trending_up,
                    () => _sendQuickMessage('Analyze my recent progress'),
                  ),
                ],
              ),
            ),
            
            // Chat messages
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: chatMessages.length + (isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == chatMessages.length && isLoading) {
                    return _buildLoadingBubble();
                  }
                  
                  final message = chatMessages[index];
                  return _buildMessageBubble(message);
                },
              ),
            ),
            
            // Input area
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                    offset: const Offset(0, -2),
                    blurRadius: 8,
                    color: Colors.black.withOpacity(0.1),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      focusNode: _focusNode,
                      maxLines: null,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: 'Ask your AI coach...',
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surfaceVariant,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 10,
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded),
                      color: Colors.white,
                      onPressed: isLoading ? null : _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionChip(String label, IconData icon, VoidCallback onTap) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.isUser;
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isUser) ...[
              CircleAvatar(
                radius: 16,
                backgroundColor: Theme.of(context).colorScheme.primary,
                child: const Icon(
                  Icons.smart_toy,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: isUser
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surfaceVariant,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20),
                    topRight: const Radius.circular(20),
                    bottomLeft: Radius.circular(isUser ? 20 : 4),
                    bottomRight: Radius.circular(isUser ? 4 : 20),
                  ),
                ),
                child: Text(
                  message.content,
                  style: TextStyle(
                    color: isUser
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
            if (isUser) ...[
              const SizedBox(width: 8),
              CircleAvatar(
                radius: 16,
                backgroundColor: Theme.of(context).colorScheme.secondary,
                child: Icon(
                  Icons.person,
                  size: 20,
                  color: Theme.of(context).colorScheme.onSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: const Icon(
                Icons.smart_toy,
                size: 20,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomLeft: Radius.circular(4),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('Thinking...'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sendQuickMessage(String message) {
    _messageController.text = message;
    _sendMessage();
  }

  void _showCoachInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('AI Fitness Coach'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your personal AI fitness coach is here to help you with:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            Text('• Personalized workout plans'),
            Text('• Exercise form corrections'),
            Text('• Nutrition advice'),
            Text('• Progress tracking & insights'),
            Text('• Motivation & support'),
            SizedBox(height: 12),
            Text(
              'Just ask any fitness-related question!',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it!'),
          ),
        ],
      ),
    );
  }
}