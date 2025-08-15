import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/ai_service.dart';
import '../../domain/entities/user.dart';
import '../../domain/entities/workout.dart';
import 'workout_provider.dart';
import 'user_provider.dart';

// AI Service instance
final aiServiceProvider = Provider<AIService>((ref) => AIService());

// Chat messages state
final chatMessagesProvider = StateNotifierProvider<ChatMessagesNotifier, List<ChatMessage>>((ref) {
  return ChatMessagesNotifier();
});

// Loading state for AI operations
final aiCoachLoadingProvider = StateProvider<bool>((ref) => false);

// AI Coach notifier for handling chat
final aiCoachProvider = StateNotifierProvider<AICoachNotifier, AsyncValue<void>>((ref) {
  return AICoachNotifier(ref);
});

// Workout analysis provider
final workoutAnalysisProvider = FutureProvider.family<WorkoutAnalysis, WorkoutAnalysisParams>((ref, params) async {
  final aiService = ref.read(aiServiceProvider);
  return aiService.analyzeWorkoutForm(
    exerciseName: params.exerciseName,
    accelerometerData: params.accelerometerData,
    gyroscopeData: params.gyroscopeData,
  );
});

// Workout recommendations provider
final workoutRecommendationsProvider = FutureProvider<List<WorkoutRecommendation>>((ref) async {
  final aiService = ref.read(aiServiceProvider);
  final user = ref.watch(currentUserProvider).value;
  final recentWorkouts = ref.watch(recentWorkoutsProvider).value ?? [];
  
  if (user == null) throw Exception('User not logged in');
  
  return aiService.getWorkoutRecommendations(
    user: user,
    recentWorkouts: recentWorkouts,
    fitnessGoal: user.fitnessGoal ?? 'General fitness',
  );
});

// Meal plan provider
final mealPlanProvider = FutureProvider.family<MealPlan, MealPlanParams>((ref, params) async {
  final aiService = ref.read(aiServiceProvider);
  return aiService.generateMealPlan(
    fitnessGoal: params.fitnessGoal,
    targetCalories: params.targetCalories,
    dietaryRestrictions: params.dietaryRestrictions,
    daysCount: params.daysCount,
  );
});

// Progress insights provider
final progressInsightsProvider = FutureProvider<ProgressInsights>((ref) async {
  final aiService = ref.read(aiServiceProvider);
  final workouts = ref.watch(workoutHistoryProvider).value ?? [];
  
  // Calculate performance metrics from workout history
  final performanceMetrics = _calculatePerformanceMetrics(workouts);
  
  return aiService.analyzeProgress(
    workoutHistory: workouts,
    performanceMetrics: performanceMetrics,
    timeframe: '30 days',
  );
});

// Chat messages notifier
class ChatMessagesNotifier extends StateNotifier<List<ChatMessage>> {
  ChatMessagesNotifier() : super([]);

  void addMessage(ChatMessage message) {
    state = [...state, message];
  }

  void clearMessages() {
    state = [];
  }
}

// AI Coach notifier
class AICoachNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref ref;
  
  AICoachNotifier(this.ref) : super(const AsyncValue.data(null));

  Future<void> sendMessage(String message) async {
    state = const AsyncValue.loading();
    ref.read(aiCoachLoadingProvider.notifier).state = true;
    
    try {
      final aiService = ref.read(aiServiceProvider);
      final chatMessages = ref.read(chatMessagesProvider);
      final user = ref.read(currentUserProvider).value;
      
      final userContext = {
        'userName': user?.name ?? 'User',
        'fitnessLevel': user?.fitnessLevel ?? 'Beginner',
        'fitnessGoal': user?.fitnessGoal ?? 'General fitness',
      };
      
      final response = await aiService.chatWithCoach(
        message: message,
        conversationHistory: chatMessages.take(10).toList(),
        userContext: userContext,
      );
      
      // Add AI response to chat
      ref.read(chatMessagesProvider.notifier).addMessage(
        ChatMessage(
          content: response,
          isUser: false,
          timestamp: DateTime.now(),
        ),
      );
      
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      
      // Add error message to chat
      ref.read(chatMessagesProvider.notifier).addMessage(
        ChatMessage(
          content: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: DateTime.now(),
        ),
      );
    } finally {
      ref.read(aiCoachLoadingProvider.notifier).state = false;
    }
  }
}

// Helper function to calculate performance metrics
Map<String, List<double>> _calculatePerformanceMetrics(List<Workout> workouts) {
  final metrics = <String, List<double>>{
    'totalVolume': [],
    'avgIntensity': [],
    'frequency': [],
  };
  
  // Group workouts by week and calculate metrics
  // This is a simplified implementation
  for (final workout in workouts) {
    final volume = workout.sets * workout.reps * workout.weight;
    metrics['totalVolume']!.add(volume.toDouble());
  }
  
  return metrics;
}

// Parameter classes
class WorkoutAnalysisParams {
  final String exerciseName;
  final List<double> accelerometerData;
  final List<double> gyroscopeData;

  WorkoutAnalysisParams({
    required this.exerciseName,
    required this.accelerometerData,
    required this.gyroscopeData,
  });
}

class MealPlanParams {
  final String fitnessGoal;
  final double targetCalories;
  final Map<String, dynamic> dietaryRestrictions;
  final int daysCount;

  MealPlanParams({
    required this.fitnessGoal,
    required this.targetCalories,
    required this.dietaryRestrictions,
    required this.daysCount,
  });
}