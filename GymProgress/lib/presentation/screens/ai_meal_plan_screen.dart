import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ai_provider.dart';
import '../../services/ai_service.dart';

class AIMealPlanScreen extends ConsumerStatefulWidget {
  const AIMealPlanScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AIMealPlanScreen> createState() => _AIMealPlanScreenState();
}

class _AIMealPlanScreenState extends ConsumerState<AIMealPlanScreen> {
  final _formKey = GlobalKey<FormState>();
  String _fitnessGoal = 'Build Muscle';
  double _targetCalories = 2500;
  int _daysCount = 7;
  final Map<String, bool> _dietaryRestrictions = {
    'vegetarian': false,
    'vegan': false,
    'glutenFree': false,
    'dairyFree': false,
    'nutFree': false,
    'keto': false,
    'paleo': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Meal Planner'),
        elevation: 2,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(context),
            const SizedBox(height: 24),
            _buildConfigurationForm(context),
            const SizedBox(height: 24),
            _buildGenerateButton(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(
              Icons.restaurant_menu,
              size: 48,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Personalized Nutrition',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'AI-powered meal plans tailored to your fitness goals',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfigurationForm(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fitness Goal Selection
          Text(
            'Fitness Goal',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _fitnessGoal,
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: const Icon(Icons.flag),
            ),
            items: const [
              DropdownMenuItem(value: 'Build Muscle', child: Text('Build Muscle')),
              DropdownMenuItem(value: 'Lose Weight', child: Text('Lose Weight')),
              DropdownMenuItem(value: 'Maintain', child: Text('Maintain Weight')),
              DropdownMenuItem(value: 'Improve Endurance', child: Text('Improve Endurance')),
              DropdownMenuItem(value: 'General Health', child: Text('General Health')),
            ],
            onChanged: (value) {
              setState(() {
                _fitnessGoal = value!;
                // Adjust default calories based on goal
                _targetCalories = _getDefaultCalories(value);
              });
            },
          ),
          const SizedBox(height: 20),

          // Calorie Target
          Text(
            'Daily Calorie Target',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Slider(
                  value: _targetCalories,
                  min: 1200,
                  max: 4000,
                  divisions: 28,
                  label: _targetCalories.round().toString(),
                  onChanged: (value) {
                    setState(() => _targetCalories = value);
                  },
                ),
              ),
              Container(
                width: 80,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.secondaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_targetCalories.round()} cal',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Meal Plan Duration
          Text(
            'Plan Duration',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 3, label: Text('3 Days')),
              ButtonSegment(value: 7, label: Text('1 Week')),
              ButtonSegment(value: 14, label: Text('2 Weeks')),
            ],
            selected: {_daysCount},
            onSelectionChanged: (Set<int> selection) {
              setState(() => _daysCount = selection.first);
            },
          ),
          const SizedBox(height: 20),

          // Dietary Restrictions
          Text(
            'Dietary Preferences',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _dietaryRestrictions.entries.map((entry) {
              return FilterChip(
                label: Text(_formatRestrictionName(entry.key)),
                selected: entry.value,
                onSelected: (selected) {
                  setState(() {
                    _dietaryRestrictions[entry.key] = selected;
                  });
                },
                selectedColor: Theme.of(context).colorScheme.primaryContainer,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildGenerateButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _generateMealPlan,
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.auto_awesome),
            SizedBox(width: 8),
            Text(
              'Generate Meal Plan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  void _generateMealPlan() {
    if (_formKey.currentState!.validate()) {
      final params = MealPlanParams(
        fitnessGoal: _fitnessGoal,
        targetCalories: _targetCalories,
        dietaryRestrictions: Map.fromEntries(
          _dietaryRestrictions.entries.where((e) => e.value),
        ),
        daysCount: _daysCount,
      );

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => MealPlanResultScreen(params: params),
        ),
      );
    }
  }

  double _getDefaultCalories(String goal) {
    switch (goal) {
      case 'Build Muscle':
        return 2800;
      case 'Lose Weight':
        return 1800;
      case 'Maintain':
        return 2200;
      case 'Improve Endurance':
        return 2500;
      default:
        return 2200;
    }
  }

  String _formatRestrictionName(String key) {
    switch (key) {
      case 'vegetarian':
        return 'Vegetarian';
      case 'vegan':
        return 'Vegan';
      case 'glutenFree':
        return 'Gluten-Free';
      case 'dairyFree':
        return 'Dairy-Free';
      case 'nutFree':
        return 'Nut-Free';
      case 'keto':
        return 'Keto';
      case 'paleo':
        return 'Paleo';
      default:
        return key;
    }
  }
}

// Results Screen
class MealPlanResultScreen extends ConsumerWidget {
  final MealPlanParams params;

  const MealPlanResultScreen({Key? key, required this.params}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mealPlanAsync = ref.watch(mealPlanProvider(params));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Meal Plan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // TODO: Implement sharing functionality
            },
          ),
        ],
      ),
      body: mealPlanAsync.when(
        loading: () => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Creating your personalized meal plan...',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text('This may take a moment'),
            ],
          ),
        ),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text('Failed to generate meal plan'),
                const SizedBox(height: 8),
                Text(error.toString()),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.refresh(mealPlanProvider(params)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (mealPlan) => DefaultTabController(
          length: mealPlan.days.length,
          child: Column(
            children: [
              // Macros Summary
              Container(
                padding: const EdgeInsets.all(16),
                color: Theme.of(context).colorScheme.surfaceVariant,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildMacroIndicator(
                      context,
                      'Protein',
                      mealPlan.averageMacros['protein'] ?? 0,
                      Colors.red,
                    ),
                    _buildMacroIndicator(
                      context,
                      'Carbs',
                      mealPlan.averageMacros['carbs'] ?? 0,
                      Colors.blue,
                    ),
                    _buildMacroIndicator(
                      context,
                      'Fat',
                      mealPlan.averageMacros['fat'] ?? 0,
                      Colors.orange,
                    ),
                  ],
                ),
              ),
              
              // Day Tabs
              TabBar(
                isScrollable: true,
                tabs: mealPlan.days.map((day) => Tab(
                  text: day.day,
                )).toList(),
              ),
              
              // Meal List
              Expanded(
                child: TabBarView(
                  children: mealPlan.days.map((dayPlan) => ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: dayPlan.meals.length,
                    itemBuilder: (context, index) {
                      final meal = dayPlan.meals[index];
                      return _buildMealCard(context, meal);
                    },
                  )).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMacroIndicator(
    BuildContext context,
    String label,
    double value,
    Color color,
  ) {
    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 4),
        Text(
          '${value.round()}g',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildMealCard(BuildContext context, Meal meal) {
    final mealIcon = _getMealIcon(meal.type);
    final mealColor = _getMealColor(meal.type);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: mealColor.withOpacity(0.2),
          child: Icon(mealIcon, color: mealColor),
        ),
        title: Text(
          meal.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('${meal.calories} calories'),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Ingredients
                const Text(
                  'Ingredients:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...meal.ingredients.map((ingredient) => Padding(
                  padding: const EdgeInsets.only(left: 16, bottom: 4),
                  child: Text('• $ingredient'),
                )),
                const SizedBox(height: 16),
                
                // Macros
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildMacroChip(
                      'Protein',
                      meal.macros['protein'] ?? 0,
                      Colors.red,
                    ),
                    _buildMacroChip(
                      'Carbs',
                      meal.macros['carbs'] ?? 0,
                      Colors.blue,
                    ),
                    _buildMacroChip(
                      'Fat',
                      meal.macros['fat'] ?? 0,
                      Colors.orange,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMacroChip(String label, double value, Color color) {
    return Chip(
      label: Text('$label: ${value.round()}g'),
      backgroundColor: color.withOpacity(0.2),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold),
    );
  }

  IconData _getMealIcon(String type) {
    switch (type) {
      case 'breakfast':
        return Icons.breakfast_dining;
      case 'lunch':
        return Icons.lunch_dining;
      case 'dinner':
        return Icons.dinner_dining;
      case 'snack':
        return Icons.cookie;
      default:
        return Icons.restaurant;
    }
  }

  Color _getMealColor(String type) {
    switch (type) {
      case 'breakfast':
        return Colors.orange;
      case 'lunch':
        return Colors.green;
      case 'dinner':
        return Colors.blue;
      case 'snack':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}