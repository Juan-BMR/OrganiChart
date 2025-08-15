# GymProgress AI Features 🤖💪

## Overview

GymProgress now includes cutting-edge AI features powered by OpenAI to help users achieve their fitness goals more effectively. These features provide personalized coaching, real-time form analysis, nutrition planning, and progress insights.

## 🌟 Key Features

### 1. AI Fitness Coach Chat
An intelligent conversational AI that acts as your personal fitness coach 24/7.

**Features:**
- Natural language conversation about fitness, nutrition, and health
- Personalized advice based on user profile and goals
- Quick action chips for common queries
- Context-aware responses that remember your conversation history

**How to use:**
```dart
// Navigate to AI Coach screen
Navigator.push(context, MaterialPageRoute(
  builder: (context) => const AICoachScreen()
));
```

### 2. Workout Form Analyzer
Real-time exercise form analysis using device sensors (accelerometer & gyroscope).

**Features:**
- Records movement data during exercise
- Provides form score (0-100)
- Specific corrections and tips
- Safety warnings for injury prevention

**Supported Exercises:**
- Squats
- Deadlifts
- Bench Press
- Overhead Press
- Rows
- And more...

**Usage Example:**
```dart
WorkoutFormAnalyzer(
  exerciseName: 'Squats',
  onComplete: () {
    // Handle completion
  },
)
```

### 3. AI Progress Insights
Advanced analytics and predictions based on workout history.

**Features:**
- Performance trend analysis
- Future performance predictions
- Achievement tracking
- Personalized improvement suggestions
- Visual charts and graphs

**Data Analyzed:**
- Workout frequency
- Volume progression
- Strength gains
- Rest patterns

### 4. Smart Meal Planner
AI-generated meal plans tailored to fitness goals and dietary preferences.

**Features:**
- Customizable calorie targets
- Multiple dietary restrictions support
- Macro-nutrient balanced meals
- 3-14 day meal plans
- Detailed recipes and ingredients

**Dietary Options:**
- Vegetarian/Vegan
- Gluten-free
- Dairy-free
- Keto/Paleo
- Nut-free

## 🔧 Technical Implementation

### Architecture

```
lib/
├── services/
│   └── ai_service.dart          # Core AI service
├── presentation/
│   ├── screens/
│   │   ├── ai_coach_screen.dart
│   │   ├── ai_insights_screen.dart
│   │   └── ai_meal_plan_screen.dart
│   ├── widgets/
│   │   └── workout_form_analyzer.dart
│   └── providers/
│       └── ai_provider.dart     # State management
```

### Dependencies

Add to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.1.0
  flutter_riverpod: ^2.4.0
  sensors_plus: ^4.0.0
  fl_chart: ^0.65.0
```

### API Configuration

1. Set up OpenAI API key:
```dart
// In ai_service.dart
static const String _apiKey = 'YOUR_OPENAI_API_KEY';
```

2. For production, use environment variables:
```dart
static final String _apiKey = Platform.environment['OPENAI_API_KEY'] ?? '';
```

## 🚀 Getting Started

### 1. Installation

```bash
# Add dependencies
flutter pub add http flutter_riverpod sensors_plus fl_chart

# Get packages
flutter pub get
```

### 2. API Key Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com)
2. Add to your environment or configuration file
3. Never commit API keys to version control

### 3. Integration

Add AI features to your main navigation:

```dart
// In your home screen or navigation drawer
ListTile(
  leading: Icon(Icons.smart_toy),
  title: Text('AI Coach'),
  onTap: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => AICoachScreen()),
  ),
),
ListTile(
  leading: Icon(Icons.insights),
  title: Text('Progress Insights'),
  onTap: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => AIInsightsScreen()),
  ),
),
ListTile(
  leading: Icon(Icons.restaurant_menu),
  title: Text('Meal Planner'),
  onTap: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => AIMealPlanScreen()),
  ),
),
```

## 📱 Permissions

Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS" />
```

For iOS, add to `Info.plist`:
```xml
<key>NSMotionUsageDescription</key>
<string>This app uses motion sensors to analyze your workout form</string>
```

## 💰 Cost Optimization

### API Usage Tips:
1. **Cache responses** when possible
2. **Use GPT-4o-mini** for cost efficiency
3. **Implement rate limiting** to prevent abuse
4. **Monitor usage** in OpenAI dashboard

### Estimated Costs:
- Chat interactions: ~$0.001 per message
- Form analysis: ~$0.002 per analysis
- Meal planning: ~$0.005 per plan
- Progress insights: ~$0.003 per analysis

## 🧪 Testing

### Unit Tests
```dart
// Test AI service
test('AI Service generates valid meal plan', () async {
  final service = AIService();
  final plan = await service.generateMealPlan(
    fitnessGoal: 'Build Muscle',
    targetCalories: 2500,
    dietaryRestrictions: {},
    daysCount: 7,
  );
  
  expect(plan.days.length, 7);
  expect(plan.averageMacros['protein'], greaterThan(0));
});
```

### Integration Tests
```dart
// Test form analyzer widget
testWidgets('Form analyzer records and analyzes', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: WorkoutFormAnalyzer(exerciseName: 'Squats'),
    ),
  );
  
  await tester.tap(find.text('Start Recording'));
  await tester.pumpAndSettle();
  
  expect(find.text('Recording...'), findsOneWidget);
});
```

## 🔒 Security Best Practices

1. **API Key Management**
   - Use environment variables
   - Implement server-side proxy for production
   - Rotate keys regularly

2. **Data Privacy**
   - Don't send personal health data to AI
   - Anonymize user data when possible
   - Implement data retention policies

3. **Rate Limiting**
   ```dart
   // Simple rate limiter
   class RateLimiter {
     static final _requests = <DateTime>[];
     static const _maxRequests = 10;
     static const _timeWindow = Duration(minutes: 1);
     
     static bool canMakeRequest() {
       final now = DateTime.now();
       _requests.removeWhere((time) => 
         now.difference(time) > _timeWindow
       );
       
       if (_requests.length < _maxRequests) {
         _requests.add(now);
         return true;
       }
       return false;
     }
   }
   ```

## 🎨 UI/UX Guidelines

### Design Principles:
1. **Clear Visual Hierarchy** - Important info stands out
2. **Immediate Feedback** - Loading states for all AI operations
3. **Error Handling** - Graceful fallbacks and retry options
4. **Accessibility** - Support for screen readers and color contrast

### Theme Integration:
```dart
// Use Material 3 color scheme
Theme.of(context).colorScheme.primary
Theme.of(context).colorScheme.surfaceVariant
Theme.of(context).colorScheme.error
```

## 🚧 Roadmap

### Coming Soon:
- [ ] Voice input for hands-free coaching
- [ ] Video form analysis using camera
- [ ] Social features - share achievements
- [ ] Offline mode with cached responses
- [ ] Integration with wearables
- [ ] Multi-language support

## 📞 Support

For issues or questions:
1. Check the [Issues](https://github.com/yourrepo/issues) page
2. Review API documentation at [OpenAI Docs](https://platform.openai.com/docs)
3. Contact support at support@gymprogress.app

## 📄 License

This feature is part of GymProgress and follows the same license terms.

---

Built with ❤️ using Flutter and OpenAI