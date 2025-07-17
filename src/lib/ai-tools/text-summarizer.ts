import { BaseAITool, ToolResult, ToolConfig } from './base-tool';
import { openai } from '../openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

export interface TextSummarizerInput {
  text: string;
  summaryType: 'brief' | 'detailed' | 'executive' | 'technical';
  maxLength?: number;
  focusPoints?: string[];
}

export interface TextSummarizerResult {
  summary: string;
  keyPoints: string[];
  wordCount: {
    original: number;
    summary: number;
  };
  readingTime: {
    original: number;
    summary: number;
  };
}

export class TextSummarizerTool extends BaseAITool {
  private usageStats = {
    totalSummaries: 0,
    successfulSummaries: 0,
    failedSummaries: 0,
    lastUsed: null as Date | null,
    totalWordsProcessed: 0
  };

  constructor() {
    const config: ToolConfig = {
      name: 'Text Summarizer',
      description: 'AI-powered tool for creating concise and accurate text summaries',
      version: '1.0.0',
      capabilities: [
        'Create brief summaries',
        'Generate detailed summaries',
        'Extract key points',
        'Technical document summarization',
        'Executive summary generation'
      ],
      requiredPermissions: ['content:read']
    };
    super(config);
  }

  protected async validateInput(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') return false;
    
    const textInput = input as TextSummarizerInput;
    
    if (!textInput.text || typeof textInput.text !== 'string') return false;
    if (textInput.text.trim().length === 0) return false;
    
    const validTypes = ['brief', 'detailed', 'executive', 'technical'];
    if (!validTypes.includes(textInput.summaryType)) return false;
    
    if (textInput.maxLength && (typeof textInput.maxLength !== 'number' || textInput.maxLength < 10)) {
      return false;
    }
    
    return true;
  }

  async process(input: TextSummarizerInput): Promise<ToolResult<TextSummarizerResult>> {
    const startTime = Date.now();
    
    try {
      this.usageStats.totalSummaries++;
      
      const isValid = await this.validateInput(input);
      if (!isValid) {
        this.usageStats.failedSummaries++;
        return {
          success: false,
          error: 'Invalid input provided'
        };
      }

      // Calculate original text metrics
      const originalWordCount = this.countWords(input.text);
      const originalReadingTime = this.calculateReadingTime(originalWordCount);
      
      // Prepare the summarization prompt
      const systemPrompt = this.buildSystemPrompt(input.summaryType);
      const userPrompt = this.buildUserPrompt(input);

      // Call OpenAI for summarization
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.3,
        max_tokens: input.maxLength ? Math.min(input.maxLength, 2000) : 1000
      });

      const summaryText = completion.choices[0].message.content || '';
      
      // Extract key points
      const keyPoints = await this.extractKeyPoints(input.text, summaryText);
      
      // Calculate summary metrics
      const summaryWordCount = this.countWords(summaryText);
      const summaryReadingTime = this.calculateReadingTime(summaryWordCount);
      
      const result: TextSummarizerResult = {
        summary: summaryText,
        keyPoints,
        wordCount: {
          original: originalWordCount,
          summary: summaryWordCount
        },
        readingTime: {
          original: originalReadingTime,
          summary: summaryReadingTime
        }
      };

      this.usageStats.successfulSummaries++;
      this.usageStats.lastUsed = new Date();
      this.usageStats.totalWordsProcessed += originalWordCount;

      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime,
          compressionRatio: ((originalWordCount - summaryWordCount) / originalWordCount * 100).toFixed(1) + '%',
          model: 'gpt-4-turbo-preview'
        }
      };

    } catch (error) {
      this.usageStats.failedSummaries++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildSystemPrompt(summaryType: string): string {
    const basePrompt = `You are an expert summarization specialist skilled in distilling complex information into clear, concise summaries.`;

    const typeSpecificPrompts = {
      'brief': 'Create a brief, high-level summary focusing on the most important points. Keep it concise and easy to understand.',
      'detailed': 'Create a comprehensive summary that captures all significant details while maintaining clarity and structure.',
      'executive': 'Create an executive summary suitable for senior leadership, focusing on key decisions, outcomes, and strategic implications.',
      'technical': 'Create a technical summary that preserves important technical details, methodologies, and specifications while improving clarity.'
    };

    return `${basePrompt}\n\n${typeSpecificPrompts[summaryType]}`;
  }

  private buildUserPrompt(input: TextSummarizerInput): string {
    let prompt = `Please summarize the following text:\n\n${input.text}\n\n`;
    
    if (input.focusPoints && input.focusPoints.length > 0) {
      prompt += `Pay special attention to these points:\n`;
      input.focusPoints.forEach((point, i) => {
        prompt += `${i + 1}. ${point}\n`;
      });
      prompt += '\n';
    }
    
    if (input.maxLength) {
      prompt += `Please keep the summary under ${input.maxLength} words.\n`;
    }
    
    return prompt;
  }

  private async extractKeyPoints(originalText: string, summary: string): Promise<string[]> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'Extract 3-5 key bullet points from the provided summary. Return only the bullet points, one per line, without numbering or bullets.'
        },
        {
          role: 'user',
          content: summary
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.3,
        max_tokens: 200
      });

      const keyPointsText = completion.choices[0].message.content || '';
      return keyPointsText.split('\n').filter(point => point.trim().length > 0);
      
    } catch (error) {
      // Fallback: extract first sentences from summary
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, 3).map(s => s.trim());
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(wordCount: number): number {
    // Average reading speed: 200-250 words per minute
    const wordsPerMinute = 225;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  async getUsageStats(): Promise<Record<string, any>> {
    return {
      ...this.usageStats,
      errorRate: this.usageStats.totalSummaries > 0 
        ? this.usageStats.failedSummaries / this.usageStats.totalSummaries 
        : 0,
      averageCompressionRatio: this.usageStats.successfulSummaries > 0
        ? 0.7 // Placeholder - would calculate from actual data in production
        : 0
    };
  }
}