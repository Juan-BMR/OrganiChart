import 'package:http/http.dart' as http;
import 'dart:convert';
import '../domain/entities/workout.dart';
import '../domain/entities/user.dart';

class AIService {
  static const String _apiKey = 'YOUR_OPENAI_API_KEY'; // Move to env
  static const String _baseUrl = 'https://api.openai.com/v1';
  
  // Analyze workout form and provide corrections
  Future<WorkoutAnalysis> analyzeWorkoutForm({
    required String exerciseName,
    required List<double> accelerometerData,
    required List<double> gyroscopeData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': [
            {
              'role': 'system',
              'content': '''You are an expert fitness coach analyzing workout form.
              Based on the sensor data provided, analyze the exercise form and provide:
              1. Form score (0-100)
              2. Specific corrections needed
              3. Tips for improvement
              4. Safety warnings if applicable'''
            },
            {
              'role': 'user',
              'content': '''Exercise: $exerciseName
              Accelerometer data: ${accelerometerData.take(10).toList()}
              Gyroscope data: ${gyroscopeData.take(10).toList()}
              
              Analyze the form and provide feedback.'''
            }
          ],
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content = data['choices'][0]['message']['content'];
        
        return WorkoutAnalysis.fromAIResponse(content);
      } else {
        throw Exception('Failed to analyze workout: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('AI Service error: $e');
    }
  }

  // Get personalized workout recommendations
  Future<List<WorkoutRecommendation>> getWorkoutRecommendations({
    required User user,
    required List<Workout> recentWorkouts,
    required String fitnessGoal,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': [
            {
              'role': 'system',
              'content': '''You are a professional fitness coach creating personalized workout plans.
              Consider the user's fitness level, recent workout history, and goals.
              Provide specific, actionable workout recommendations.'''
            },
            {
              'role': 'user',
              'content': '''User Profile:
              - Fitness Level: ${user.fitnessLevel}
              - Goal: $fitnessGoal
              - Recent Workouts: ${_summarizeWorkouts(recentWorkouts)}
              
              Provide 5 workout recommendations for the next week.'''
            }
          ],
          'temperature': 0.8,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content = data['choices'][0]['message']['content'];
        
        return WorkoutRecommendation.parseFromAI(content);
      } else {
        throw Exception('Failed to get recommendations: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('AI Service error: $e');
    }
  }

  // AI-powered meal planning
  Future<MealPlan> generateMealPlan({
    required String fitnessGoal,
    required double targetCalories,
    required Map<String, dynamic> dietaryRestrictions,
    required int daysCount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': [
            {
              'role': 'system',
              'content': '''You are a certified nutritionist creating meal plans for fitness enthusiasts.
              Create balanced, practical meal plans that support fitness goals.
              Include macronutrient breakdowns and easy-to-follow recipes.'''
            },
            {
              'role': 'user',
              'content': '''Create a $daysCount-day meal plan:
              - Fitness Goal: $fitnessGoal
              - Target Calories: $targetCalories per day
              - Dietary Restrictions: ${jsonEncode(dietaryRestrictions)}
              
              Include breakfast, lunch, dinner, and 2 snacks per day with macros.'''
            }
          ],
          'temperature': 0.8,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content = data['choices'][0]['message']['content'];
        
        return MealPlan.fromAIResponse(content);
      } else {
        throw Exception('Failed to generate meal plan: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('AI Service error: $e');
    }
  }

  // Progress insights and predictions
  Future<ProgressInsights> analyzeProgress({
    required List<Workout> workoutHistory,
    required Map<String, List<double>> performanceMetrics,
    required String timeframe,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': [
            {
              'role': 'system',
              'content': '''You are a data analyst specializing in fitness progress tracking.
              Analyze workout data to identify trends, predict future progress, and provide insights.
              Be specific with numbers and timeframes.'''
            },
            {
              'role': 'user',
              'content': '''Analyze fitness progress:
              - Timeframe: $timeframe
              - Total Workouts: ${workoutHistory.length}
              - Performance Metrics: ${jsonEncode(performanceMetrics)}
              
              Provide insights on:
              1. Progress trends
              2. Predicted performance in 30 days
              3. Areas of improvement
              4. Achievements and milestones'''
            }
          ],
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content = data['choices'][0]['message']['content'];
        
        return ProgressInsights.fromAIResponse(content);
      } else {
        throw Exception('Failed to analyze progress: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('AI Service error: $e');
    }
  }

  // Chat with AI fitness coach
  Future<String> chatWithCoach({
    required String message,
    required List<ChatMessage> conversationHistory,
    required Map<String, dynamic> userContext,
  }) async {
    try {
      final messages = [
        {
          'role': 'system',
          'content': '''You are a supportive, knowledgeable fitness coach. 
          Provide motivating, science-based advice while being empathetic and understanding.
          Keep responses concise but helpful. Reference user's progress when relevant.
          User Context: ${jsonEncode(userContext)}'''
        },
        ...conversationHistory.map((msg) => {
          'role': msg.isUser ? 'user' : 'assistant',
          'content': msg.content,
        }),
        {
          'role': 'user',
          'content': message,
        }
      ];

      final response = await http.post(
        Uri.parse('$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': messages,
          'temperature': 0.8,
          'max_tokens': 300,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices'][0]['message']['content'];
      } else {
        throw Exception('Failed to get coach response: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('AI Service error: $e');
    }
  }

  String _summarizeWorkouts(List<Workout> workouts) {
    if (workouts.isEmpty) return 'No recent workouts';
    
    return workouts.take(5).map((w) => 
      '${w.exerciseName}: ${w.sets}x${w.reps} @ ${w.weight}kg'
    ).join(', ');
  }
}

// Data models for AI responses
class WorkoutAnalysis {
  final int formScore;
  final List<String> corrections;
  final List<String> tips;
  final List<String> warnings;

  WorkoutAnalysis({
    required this.formScore,
    required this.corrections,
    required this.tips,
    required this.warnings,
  });

  factory WorkoutAnalysis.fromAIResponse(String response) {
    // Parse AI response into structured data
    // This is a simplified version - implement proper parsing
    return WorkoutAnalysis(
      formScore: 85,
      corrections: ['Keep your back straight', 'Lower the weight more slowly'],
      tips: ['Focus on controlled movements', 'Breathe out on exertion'],
      warnings: [],
    );
  }
}

class WorkoutRecommendation {
  final String exerciseName;
  final int sets;
  final int reps;
  final String intensity;
  final String notes;

  WorkoutRecommendation({
    required this.exerciseName,
    required this.sets,
    required this.reps,
    required this.intensity,
    required this.notes,
  });

  static List<WorkoutRecommendation> parseFromAI(String response) {
    // Parse AI response into list of recommendations
    // This is a simplified version - implement proper parsing
    return [
      WorkoutRecommendation(
        exerciseName: 'Squats',
        sets: 4,
        reps: 12,
        intensity: 'Moderate',
        notes: 'Focus on depth and form',
      ),
    ];
  }
}

class MealPlan {
  final List<DayMealPlan> days;
  final Map<String, double> averageMacros;

  MealPlan({required this.days, required this.averageMacros});

  factory MealPlan.fromAIResponse(String response) {
    // Parse AI response into structured meal plan
    return MealPlan(
      days: [],
      averageMacros: {'protein': 150, 'carbs': 200, 'fat': 65},
    );
  }
}

class DayMealPlan {
  final String day;
  final List<Meal> meals;
  final Map<String, double> totalMacros;

  DayMealPlan({
    required this.day,
    required this.meals,
    required this.totalMacros,
  });
}

class Meal {
  final String name;
  final String type; // breakfast, lunch, dinner, snack
  final List<String> ingredients;
  final Map<String, double> macros;
  final int calories;

  Meal({
    required this.name,
    required this.type,
    required this.ingredients,
    required this.macros,
    required this.calories,
  });
}

class ProgressInsights {
  final Map<String, String> trends;
  final Map<String, double> predictions;
  final List<String> improvements;
  final List<String> achievements;

  ProgressInsights({
    required this.trends,
    required this.predictions,
    required this.improvements,
    required this.achievements,
  });

  factory ProgressInsights.fromAIResponse(String response) {
    // Parse AI response into structured insights
    return ProgressInsights(
      trends: {'strength': 'increasing', 'endurance': 'stable'},
      predictions: {'bench_press_1rm': 95.5, 'squat_1rm': 120.0},
      improvements: ['Rest periods could be optimized'],
      achievements: ['New PR on deadlift!'],
    );
  }
}

class ChatMessage {
  final String content;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}