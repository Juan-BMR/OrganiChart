<script lang="ts">
  import { onMount } from 'svelte';
  import type { ToolConfig } from '$lib/ai-tools';
  
  let availableTools: Array<{ id: string; config: ToolConfig }> = [];
  let selectedTool = '';
  let loading = false;
  let result: any = null;
  let error: string | null = null;
  
  // Demo inputs for different tools
  let orgAnalyzerInput = {
    analysisType: 'general',
    orgData: {
      employees: [
        { id: '1', name: 'John CEO', role: 'CEO', department: 'Executive' },
        { id: '2', name: 'Jane CTO', role: 'CTO', department: 'Technology', managerId: '1' },
        { id: '3', name: 'Bob CFO', role: 'CFO', department: 'Finance', managerId: '1' },
        { id: '4', name: 'Alice Dev', role: 'Developer', department: 'Technology', managerId: '2', skills: ['JavaScript', 'Python'] },
        { id: '5', name: 'Charlie Dev', role: 'Developer', department: 'Technology', managerId: '2', skills: ['Java', 'React'] }
      ],
      departments: [
        { id: 'd1', name: 'Executive' },
        { id: 'd2', name: 'Technology', headId: '2' },
        { id: 'd3', name: 'Finance', headId: '3' }
      ]
    }
  };
  
  let textSummarizerInput = {
    summaryType: 'brief',
    text: `Artificial Intelligence (AI) is rapidly transforming the modern workplace. 
    From automating routine tasks to providing sophisticated analytics, AI tools are 
    becoming essential for businesses of all sizes. Machine learning algorithms can 
    analyze vast amounts of data to identify patterns and make predictions, while 
    natural language processing enables more intuitive human-computer interactions. 
    As these technologies continue to evolve, organizations must adapt their strategies 
    to leverage AI effectively while addressing concerns about privacy, ethics, and 
    workforce displacement. The key to successful AI implementation lies in finding 
    the right balance between automation and human expertise.`,
    maxLength: 100
  };
  
  onMount(async () => {
    await loadAvailableTools();
  });
  
  async function loadAvailableTools() {
    try {
      const response = await fetch('/api/ai-tools');
      const data = await response.json();
      if (data.success) {
        availableTools = data.tools;
        if (availableTools.length > 0) {
          selectedTool = availableTools[0].id;
        }
      }
    } catch (err) {
      error = 'Failed to load AI tools';
    }
  }
  
  async function executeTool() {
    if (!selectedTool) return;
    
    loading = true;
    error = null;
    result = null;
    
    try {
      let input;
      switch (selectedTool) {
        case 'org-analyzer':
          input = orgAnalyzerInput;
          break;
        case 'text-summarizer':
          input = textSummarizerInput;
          break;
        default:
          throw new Error('Unknown tool selected');
      }
      
      const response = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolId: selectedTool,
          input,
          userPermissions: ['org:read', 'analytics:access', 'content:read']
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        result = data;
      } else {
        error = data.error || 'Tool execution failed';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }
  
  function getSelectedToolConfig() {
    return availableTools.find(t => t.id === selectedTool)?.config;
  }
</script>

<div class="ai-tools-demo">
  <h2>AI Tools Demo</h2>
  
  <div class="tool-selector">
    <label for="tool-select">Select AI Tool:</label>
    <select id="tool-select" bind:value={selectedTool} disabled={loading}>
      {#each availableTools as tool}
        <option value={tool.id}>{tool.config.name}</option>
      {/each}
    </select>
  </div>
  
  {#if getSelectedToolConfig()}
    <div class="tool-info">
      <h3>{getSelectedToolConfig().name}</h3>
      <p class="description">{getSelectedToolConfig().description}</p>
      <div class="capabilities">
        <h4>Capabilities:</h4>
        <ul>
          {#each getSelectedToolConfig().capabilities as capability}
            <li>{capability}</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
  
  <div class="tool-input">
    {#if selectedTool === 'org-analyzer'}
      <h4>Organization Data (Demo)</h4>
      <p>Analysis Type: 
        <select bind:value={orgAnalyzerInput.analysisType}>
          <option value="general">General</option>
          <option value="structure">Structure</option>
          <option value="efficiency">Efficiency</option>
          <option value="skills-gap">Skills Gap</option>
          <option value="succession-planning">Succession Planning</option>
        </select>
      </p>
      <p>Employees: {orgAnalyzerInput.orgData.employees.length}</p>
      <p>Departments: {orgAnalyzerInput.orgData.departments.length}</p>
    {:else if selectedTool === 'text-summarizer'}
      <h4>Text to Summarize</h4>
      <p>Summary Type: 
        <select bind:value={textSummarizerInput.summaryType}>
          <option value="brief">Brief</option>
          <option value="detailed">Detailed</option>
          <option value="executive">Executive</option>
          <option value="technical">Technical</option>
        </select>
      </p>
      <textarea 
        bind:value={textSummarizerInput.text}
        rows="6"
        placeholder="Enter text to summarize..."
      ></textarea>
      <p>Max Length: <input type="number" bind:value={textSummarizerInput.maxLength} min="10" max="1000" /></p>
    {/if}
  </div>
  
  <button 
    class="execute-btn"
    on:click={executeTool} 
    disabled={loading || !selectedTool}
  >
    {loading ? 'Processing...' : 'Execute Tool'}
  </button>
  
  {#if error}
    <div class="error">
      <h4>Error:</h4>
      <p>{error}</p>
    </div>
  {/if}
  
  {#if result}
    <div class="result">
      <h4>Result:</h4>
      {#if selectedTool === 'org-analyzer' && result.data}
        <div class="org-analysis">
          <h5>Summary:</h5>
          <p>{result.data.summary}</p>
          
          <h5>Key Insights:</h5>
          {#each result.data.insights as insight}
            <div class="insight {insight.severity}">
              <strong>{insight.category}:</strong> {insight.finding}
              {#if insight.recommendations}
                <ul>
                  {#each insight.recommendations as rec}
                    <li>{rec}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
          
          <h5>Metrics:</h5>
          <ul>
            {#each Object.entries(result.data.metrics) as [key, value]}
              <li>{key}: {value}</li>
            {/each}
          </ul>
        </div>
      {:else if selectedTool === 'text-summarizer' && result.data}
        <div class="text-summary">
          <h5>Summary:</h5>
          <p>{result.data.summary}</p>
          
          <h5>Key Points:</h5>
          <ul>
            {#each result.data.keyPoints as point}
              <li>{point}</li>
            {/each}
          </ul>
          
          <h5>Statistics:</h5>
          <p>Original: {result.data.wordCount.original} words ({result.data.readingTime.original} min read)</p>
          <p>Summary: {result.data.wordCount.summary} words ({result.data.readingTime.summary} min read)</p>
          <p>Compression: {result.metadata?.compressionRatio}</p>
        </div>
      {/if}
      
      {#if result.metadata}
        <div class="metadata">
          <h5>Processing Info:</h5>
          <p>Time: {result.metadata.processingTime}ms</p>
          <p>Model: {result.metadata.model}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-tools-demo {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .tool-selector {
    margin: 1rem 0;
  }
  
  .tool-selector label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .tool-selector select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .tool-info {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .tool-info h3 {
    margin-top: 0;
  }
  
  .description {
    color: #666;
    margin: 0.5rem 0;
  }
  
  .capabilities ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .tool-input {
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  
  .tool-input textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
  }
  
  .tool-input select,
  .tool-input input[type="number"] {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-left: 0.5rem;
  }
  
  .execute-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .execute-btn:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .execute-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .error {
    background: #fee;
    border: 1px solid #fcc;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    color: #c00;
  }
  
  .result {
    background: #f9f9f9;
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .result h4, .result h5 {
    margin-top: 0;
    color: #333;
  }
  
  .insight {
    padding: 0.5rem;
    margin: 0.5rem 0;
    border-left: 4px solid;
    background: white;
  }
  
  .insight.info {
    border-color: #17a2b8;
    background: #e7f3f8;
  }
  
  .insight.warning {
    border-color: #ffc107;
    background: #fff3cd;
  }
  
  .insight.critical {
    border-color: #dc3545;
    background: #f8d7da;
  }
  
  .metadata {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    font-size: 0.9rem;
    color: #666;
  }
</style>