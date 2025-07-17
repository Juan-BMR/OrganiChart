import { BaseAITool, ToolResult, ToolConfig } from './base-tool';
import { openai } from '../openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

export interface OrgAnalysisInput {
  orgData: {
    employees: Array<{
      id: string;
      name: string;
      role: string;
      department: string;
      managerId?: string;
      skills?: string[];
      startDate?: string;
    }>;
    departments: Array<{
      id: string;
      name: string;
      headId?: string;
    }>;
  };
  analysisType: 'structure' | 'efficiency' | 'skills-gap' | 'succession-planning' | 'general';
  specificQuestions?: string[];
}

export interface OrgAnalysisResult {
  summary: string;
  insights: Array<{
    category: string;
    finding: string;
    severity: 'info' | 'warning' | 'critical';
    recommendations?: string[];
  }>;
  metrics: Record<string, number>;
  visualizationData?: any;
}

export class OrgAnalyzerTool extends BaseAITool {
  private usageStats = {
    totalAnalyses: 0,
    successfulAnalyses: 0,
    failedAnalyses: 0,
    lastUsed: null as Date | null,
    averageProcessingTime: 0
  };

  constructor() {
    const config: ToolConfig = {
      name: 'Organization Analyzer',
      description: 'AI-powered tool for analyzing organizational structures and providing insights',
      version: '1.0.0',
      capabilities: [
        'Analyze organizational hierarchy',
        'Identify potential inefficiencies',
        'Detect skills gaps',
        'Succession planning analysis',
        'Department structure optimization'
      ],
      requiredPermissions: ['org:read', 'analytics:access']
    };
    super(config);
  }

  protected async validateInput(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') return false;
    
    const orgInput = input as OrgAnalysisInput;
    
    if (!orgInput.orgData || !orgInput.analysisType) return false;
    if (!orgInput.orgData.employees || !Array.isArray(orgInput.orgData.employees)) return false;
    if (!orgInput.orgData.departments || !Array.isArray(orgInput.orgData.departments)) return false;
    
    const validTypes = ['structure', 'efficiency', 'skills-gap', 'succession-planning', 'general'];
    if (!validTypes.includes(orgInput.analysisType)) return false;
    
    return true;
  }

  async process(input: OrgAnalysisInput): Promise<ToolResult<OrgAnalysisResult>> {
    const startTime = Date.now();
    
    try {
      this.usageStats.totalAnalyses++;
      
      const isValid = await this.validateInput(input);
      if (!isValid) {
        this.usageStats.failedAnalyses++;
        return {
          success: false,
          error: 'Invalid input provided'
        };
      }

      // Prepare the analysis prompt
      const systemPrompt = this.buildSystemPrompt(input.analysisType);
      const userPrompt = this.buildUserPrompt(input);

      // Call OpenAI for analysis
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const analysisResult = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Calculate metrics
      const metrics = this.calculateMetrics(input.orgData);
      
      // Enhance the analysis with calculated metrics
      const enhancedResult: OrgAnalysisResult = {
        summary: analysisResult.summary || 'No summary available',
        insights: analysisResult.insights || [],
        metrics,
        visualizationData: this.prepareVisualizationData(input.orgData)
      };

      this.usageStats.successfulAnalyses++;
      this.usageStats.lastUsed = new Date();
      
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      return {
        success: true,
        data: enhancedResult,
        metadata: {
          processingTime,
          model: 'gpt-4-turbo-preview',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.usageStats.failedAnalyses++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildSystemPrompt(analysisType: string): string {
    const basePrompt = `You are an expert organizational analyst with deep knowledge of HR, management structures, and organizational efficiency. 
    Analyze the provided organizational data and provide insights in JSON format with the following structure:
    {
      "summary": "A comprehensive summary of the analysis",
      "insights": [
        {
          "category": "Category of the insight",
          "finding": "Detailed finding",
          "severity": "info|warning|critical",
          "recommendations": ["Recommendation 1", "Recommendation 2"]
        }
      ]
    }`;

    const typeSpecificPrompts = {
      'structure': 'Focus on hierarchical structure, reporting lines, and organizational balance.',
      'efficiency': 'Focus on operational efficiency, communication bottlenecks, and process optimization.',
      'skills-gap': 'Focus on skill distribution, missing competencies, and training needs.',
      'succession-planning': 'Focus on leadership pipeline, key person dependencies, and succession risks.',
      'general': 'Provide a comprehensive analysis covering all aspects of the organization.'
    };

    return `${basePrompt}\n\n${typeSpecificPrompts[analysisType] || typeSpecificPrompts['general']}`;
  }

  private buildUserPrompt(input: OrgAnalysisInput): string {
    const { orgData, specificQuestions } = input;
    
    let prompt = `Please analyze the following organizational data:\n\n`;
    prompt += `Total Employees: ${orgData.employees.length}\n`;
    prompt += `Total Departments: ${orgData.departments.length}\n\n`;
    
    // Department summary
    prompt += `Departments:\n`;
    orgData.departments.forEach(dept => {
      const employeeCount = orgData.employees.filter(emp => emp.department === dept.name).length;
      prompt += `- ${dept.name}: ${employeeCount} employees\n`;
    });
    
    // Management structure summary
    const managers = new Set(orgData.employees.filter(emp => emp.managerId).map(emp => emp.managerId));
    prompt += `\nManagement Structure:\n`;
    prompt += `- Total Managers: ${managers.size}\n`;
    prompt += `- Average Direct Reports: ${(orgData.employees.length / managers.size).toFixed(1)}\n`;
    
    // Skills summary if available
    const allSkills = orgData.employees.flatMap(emp => emp.skills || []);
    if (allSkills.length > 0) {
      const skillCounts = allSkills.reduce((acc, skill) => {
        acc[skill] = (acc[skill] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      prompt += `\nTop Skills:\n`;
      Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([skill, count]) => {
          prompt += `- ${skill}: ${count} employees\n`;
        });
    }
    
    if (specificQuestions && specificQuestions.length > 0) {
      prompt += `\nPlease also address these specific questions:\n`;
      specificQuestions.forEach((q, i) => {
        prompt += `${i + 1}. ${q}\n`;
      });
    }
    
    prompt += `\nProvide detailed analysis with actionable insights.`;
    
    return prompt;
  }

  private calculateMetrics(orgData: OrgAnalysisInput['orgData']): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    // Basic counts
    metrics.totalEmployees = orgData.employees.length;
    metrics.totalDepartments = orgData.departments.length;
    
    // Management metrics
    const managersSet = new Set(orgData.employees.filter(emp => emp.managerId).map(emp => emp.managerId));
    metrics.totalManagers = managersSet.size;
    metrics.avgDirectReports = managersSet.size > 0 ? orgData.employees.length / managersSet.size : 0;
    
    // Department size metrics
    const deptSizes = orgData.departments.map(dept => 
      orgData.employees.filter(emp => emp.department === dept.name).length
    );
    metrics.avgDepartmentSize = deptSizes.length > 0 ? 
      deptSizes.reduce((a, b) => a + b, 0) / deptSizes.length : 0;
    metrics.maxDepartmentSize = Math.max(...deptSizes, 0);
    metrics.minDepartmentSize = Math.min(...deptSizes, 0);
    
    // Hierarchy depth
    metrics.maxHierarchyDepth = this.calculateMaxHierarchyDepth(orgData.employees);
    
    // Skills diversity
    const uniqueSkills = new Set(orgData.employees.flatMap(emp => emp.skills || []));
    metrics.uniqueSkillsCount = uniqueSkills.size;
    
    return metrics;
  }

  private calculateMaxHierarchyDepth(employees: OrgAnalysisInput['orgData']['employees']): number {
    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
    let maxDepth = 0;
    
    const getDepth = (employeeId: string, currentDepth: number = 0): number => {
      const employee = employeeMap.get(employeeId);
      if (!employee || !employee.managerId) return currentDepth;
      return getDepth(employee.managerId, currentDepth + 1);
    };
    
    employees.forEach(emp => {
      const depth = getDepth(emp.id);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return maxDepth;
  }

  private prepareVisualizationData(orgData: OrgAnalysisInput['orgData']): any {
    // Prepare data for visualization (can be used with D3.js or other viz libraries)
    return {
      hierarchyData: this.buildHierarchyData(orgData.employees),
      departmentDistribution: orgData.departments.map(dept => ({
        name: dept.name,
        value: orgData.employees.filter(emp => emp.department === dept.name).length
      })),
      skillsDistribution: this.buildSkillsDistribution(orgData.employees)
    };
  }

  private buildHierarchyData(employees: OrgAnalysisInput['orgData']['employees']): any {
    // Build a tree structure for org hierarchy visualization
    const employeeMap = new Map(employees.map(emp => [emp.id, { ...emp, children: [] }]));
    const roots: any[] = [];
    
    employees.forEach(emp => {
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        const manager = employeeMap.get(emp.managerId);
        const employee = employeeMap.get(emp.id);
        if (manager && employee) {
          manager.children.push(employee);
        }
      } else if (!emp.managerId) {
        const employee = employeeMap.get(emp.id);
        if (employee) roots.push(employee);
      }
    });
    
    return roots;
  }

  private buildSkillsDistribution(employees: OrgAnalysisInput['orgData']['employees']): any[] {
    const skillCounts: Record<string, number> = {};
    
    employees.forEach(emp => {
      (emp.skills || []).forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    
    return Object.entries(skillCounts).map(([skill, count]) => ({
      skill,
      count,
      percentage: (count / employees.length) * 100
    }));
  }

  private updateAverageProcessingTime(newTime: number): void {
    const { totalAnalyses, averageProcessingTime } = this.usageStats;
    this.usageStats.averageProcessingTime = 
      (averageProcessingTime * (totalAnalyses - 1) + newTime) / totalAnalyses;
  }

  async getUsageStats(): Promise<Record<string, any>> {
    return {
      ...this.usageStats,
      errorRate: this.usageStats.totalAnalyses > 0 
        ? this.usageStats.failedAnalyses / this.usageStats.totalAnalyses 
        : 0
    };
  }
}