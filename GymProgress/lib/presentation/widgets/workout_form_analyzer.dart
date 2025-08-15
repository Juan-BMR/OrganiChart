import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'dart:async';
import '../providers/ai_provider.dart';
import '../../services/ai_service.dart';

class WorkoutFormAnalyzer extends ConsumerStatefulWidget {
  final String exerciseName;
  final VoidCallback? onComplete;

  const WorkoutFormAnalyzer({
    Key? key,
    required this.exerciseName,
    this.onComplete,
  }) : super(key: key);

  @override
  ConsumerState<WorkoutFormAnalyzer> createState() => _WorkoutFormAnalyzerState();
}

class _WorkoutFormAnalyzerState extends ConsumerState<WorkoutFormAnalyzer> {
  bool _isRecording = false;
  bool _isAnalyzing = false;
  List<double> _accelerometerData = [];
  List<double> _gyroscopeData = [];
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSubscription;
  Timer? _recordingTimer;
  int _countdown = 3;
  WorkoutAnalysis? _analysis;

  @override
  void dispose() {
    _accelerometerSubscription?.cancel();
    _gyroscopeSubscription?.cancel();
    _recordingTimer?.cancel();
    super.dispose();
  }

  void _startRecording() async {
    setState(() {
      _isRecording = true;
      _countdown = 3;
      _accelerometerData.clear();
      _gyroscopeData.clear();
    });

    // Countdown before recording
    for (int i = 3; i > 0; i--) {
      setState(() => _countdown = i);
      await Future.delayed(const Duration(seconds: 1));
    }

    // Start sensor recording
    _accelerometerSubscription = accelerometerEventStream().listen((event) {
      _accelerometerData.addAll([event.x, event.y, event.z]);
    });

    _gyroscopeSubscription = gyroscopeEventStream().listen((event) {
      _gyroscopeData.addAll([event.x, event.y, event.z]);
    });

    // Record for 10 seconds
    _recordingTimer = Timer(const Duration(seconds: 10), _stopRecording);
  }

  void _stopRecording() async {
    _accelerometerSubscription?.cancel();
    _gyroscopeSubscription?.cancel();
    _recordingTimer?.cancel();

    setState(() {
      _isRecording = false;
      _isAnalyzing = true;
    });

    try {
      // Analyze the recorded data
      final analysis = await ref.read(workoutAnalysisProvider(
        WorkoutAnalysisParams(
          exerciseName: widget.exerciseName,
          accelerometerData: _accelerometerData,
          gyroscopeData: _gyroscopeData,
        ),
      ).future);

      setState(() {
        _analysis = analysis;
        _isAnalyzing = false;
      });

      widget.onComplete?.call();
    } catch (e) {
      setState(() => _isAnalyzing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Analysis failed: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  Icons.sports_gymnastics,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'AI Form Analyzer',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (!_isRecording && !_isAnalyzing && _analysis == null) ...[
              Text(
                'Place your phone in your pocket or armband and perform ${widget.exerciseName}',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _startRecording,
                icon: const Icon(Icons.fiber_manual_record),
                label: const Text('Start Recording'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ],
            
            if (_isRecording && _countdown > 0) ...[
              Column(
                children: [
                  const Text(
                    'Get Ready!',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _countdown.toString(),
                    style: TextStyle(
                      fontSize: 72,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ],
            
            if (_isRecording && _countdown == 0) ...[
              Column(
                children: [
                  const Text(
                    'Recording...',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  LinearProgressIndicator(
                    value: null,
                    backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                  ),
                  const SizedBox(height: 16),
                  const Text('Perform your exercise with proper form'),
                ],
              ),
            ],
            
            if (_isAnalyzing) ...[
              Column(
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    'Analyzing your form...',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ],
              ),
            ],
            
            if (_analysis != null) ...[
              _buildAnalysisResults(context, _analysis!),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () {
                      setState(() => _analysis = null);
                    },
                    child: const Text('Try Again'),
                  ),
                  ElevatedButton(
                    onPressed: widget.onComplete,
                    child: const Text('Done'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAnalysisResults(BuildContext context, WorkoutAnalysis analysis) {
    final scoreColor = analysis.formScore >= 80
        ? Colors.green
        : analysis.formScore >= 60
            ? Colors.orange
            : Colors.red;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Form Score
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scoreColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scoreColor),
          ),
          child: Column(
            children: [
              Text(
                'Form Score',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '${analysis.formScore}/100',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: scoreColor,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        
        // Corrections
        if (analysis.corrections.isNotEmpty) ...[
          Text(
            'Form Corrections',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...analysis.corrections.map((correction) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.warning_amber, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(correction)),
              ],
            ),
          )),
          const SizedBox(height: 16),
        ],
        
        // Tips
        if (analysis.tips.isNotEmpty) ...[
          Text(
            'Tips for Improvement',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...analysis.tips.map((tip) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lightbulb_outline, 
                     color: Theme.of(context).colorScheme.primary, 
                     size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(tip)),
              ],
            ),
          )),
        ],
        
        // Warnings
        if (analysis.warnings.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red),
                    SizedBox(width: 8),
                    Text(
                      'Safety Warnings',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...analysis.warnings.map((warning) => Text(
                  '• $warning',
                  style: const TextStyle(color: Colors.red),
                )),
              ],
            ),
          ),
        ],
      ],
    );
  }
}