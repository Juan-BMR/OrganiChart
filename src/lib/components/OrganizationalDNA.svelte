<script>
  import { onMount, afterUpdate } from "svelte";
  import { scale, fade, fly } from "svelte/transition";
  import { organizationalDNAStore } from "$lib/stores/organizationalDNA.js";
  import { canvasStore } from "$lib/stores/canvas.js";
  import * as d3 from "d3";

  export let members = [];
  export let organizationId = null;
  export let transform = { scale: 1, x: 0, y: 0 };

  let dnaData = {
    collaborations: [],
    skills: [],
    projects: [],
    viewMode: 'hierarchy',
    selectedSkill: null,
    selectedCollaborationType: 'all',
    networkStrength: 3,
  };

  let svgContainer;
  let simulation;
  let networkData = { nodes: [], links: [] };

  // Subscribe to DNA store
  const unsubscribeDNA = organizationalDNAStore.subscribe((data) => {
    dnaData = data;
    if (data.viewMode !== 'hierarchy') {
      updateNetworkVisualization();
    }
  });

  onMount(() => {
    if (organizationId) {
      organizationalDNAStore.listen(organizationId);
    }
    return () => {
      if (simulation) simulation.stop();
      unsubscribeDNA();
      organizationalDNAStore.stop();
    };
  });

  $: if (members.length > 0 && dnaData.viewMode !== 'hierarchy') {
    updateNetworkVisualization();
  }

  function updateNetworkVisualization() {
    if (!svgContainer || !members.length) return;

    // Clear previous visualization
    d3.select(svgContainer).selectAll("*").remove();

    const svg = d3.select(svgContainer);
    const width = 1200;
    const height = 800;

    svg.attr("width", width).attr("height", height);

    // Create network data based on view mode
    if (dnaData.viewMode === 'collaboration') {
      networkData = organizationalDNAStore.getCollaborationNetwork(
        members, 
        dnaData.collaborations, 
        dnaData.networkStrength
      );
    } else if (dnaData.viewMode === 'skills') {
      createSkillsVisualization(svg, width, height);
      return;
    } else if (dnaData.viewMode === 'dna') {
      createDNAVisualization(svg, width, height);
      return;
    }

    // Force simulation for collaboration network
    if (dnaData.viewMode === 'collaboration') {
      createForceNetwork(svg, width, height);
    }
  }

  function createForceNetwork(svg, width, height) {
    if (simulation) simulation.stop();

    const nodes = networkData.nodes.map(d => ({ ...d }));
    const links = networkData.links.map(d => ({ ...d }));

    simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .style("stroke", d => getCollaborationColor(d.type))
      .style("stroke-width", d => Math.max(1, d.strength))
      .style("stroke-opacity", 0.7);

    // Create nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 20)
      .style("fill", d => getRoleColor(d.role))
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add labels
    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(d => d.name)
      .style("font-size", "12px")
      .style("text-anchor", "middle")
      .style("pointer-events", "none");

    // Add tooltips
    node.append("title")
      .text(d => `${d.name}\n${d.role}\nSkills: ${(d.skills || []).map(s => s.name).join(', ')}`);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y + 35);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  function createSkillsVisualization(svg, width, height) {
    const skillsData = organizationalDNAStore.getSkillsNetwork(members, dnaData.selectedSkill);
    
    // Create skill categories and members with those skills
    const skillCategories = new Map();
    const categoryColors = {
      'technical': '#3B82F6',
      'soft': '#10B981', 
      'domain': '#F59E0B',
      'leadership': '#EF4444'
    };

    members.forEach(member => {
      (member.skills || []).forEach(skill => {
        if (!skillCategories.has(skill.category)) {
          skillCategories.set(skill.category, []);
        }
        skillCategories.get(skill.category).push({
          member,
          skill,
          level: skill.level || 3
        });
      });
    });

    // Create bubble chart for skills
    const bubbleData = Array.from(skillCategories.entries()).map(([category, items]) => ({
      category,
      color: categoryColors[category] || '#6B7280',
      members: items
    }));

    const pack = d3.pack()
      .size([width - 40, height - 40])
      .padding(10);

    const hierarchy = d3.hierarchy({ children: bubbleData })
      .sum(d => d.members ? d.members.length * 20 : 1)
      .sort((a, b) => b.value - a.value);

    const nodes = pack(hierarchy);

    const bubbles = svg.selectAll("circle")
      .data(nodes.descendants().slice(1))
      .enter().append("circle")
      .attr("cx", d => d.x + 20)
      .attr("cy", d => d.y + 20)
      .attr("r", d => d.r)
      .style("fill", d => d.data.color)
      .style("fill-opacity", 0.7)
      .style("stroke", "#fff")
      .style("stroke-width", 2);

    const labels = svg.selectAll("text")
      .data(nodes.descendants().slice(1))
      .enter().append("text")
      .attr("x", d => d.x + 20)
      .attr("y", d => d.y + 20)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .text(d => d.data.category);

    bubbles.append("title")
      .text(d => `${d.data.category}: ${d.data.members.length} people`);
  }

  function createDNAVisualization(svg, width, height) {
    // This creates the most advanced view combining everything
    const collaborationNetwork = organizationalDNAStore.getCollaborationNetwork(
      members, 
      dnaData.collaborations, 
      dnaData.networkStrength
    );

    const influenceScores = members.map(member => ({
      ...member,
      influence: organizationalDNAStore.getInfluenceScore(member.id, dnaData.collaborations)
    }));

    const knowledgeBrokers = organizationalDNAStore.getKnowledgeBrokers(
      members, 
      dnaData.collaborations, 
      dnaData.skills
    );

    // Create a complex visualization showing influence + skills + collaborations
    const nodes = influenceScores.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      skills: member.skills || [],
      influence: member.influence.influenceScore,
      isBroker: knowledgeBrokers.some(b => b.member.id === member.id),
      x: member.position?.x || Math.random() * width,
      y: member.position?.y || Math.random() * height,
    }));

    const links = collaborationNetwork.links;

    // Create force simulation
    if (simulation) simulation.stop();
    
    simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links with varying styles
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .style("stroke", d => getCollaborationColor(d.type))
      .style("stroke-width", d => d.strength)
      .style("stroke-opacity", 0.6);

    // Create nodes with sizes based on influence
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", d => Math.max(15, Math.min(40, d.influence / 10 + 15)))
      .style("fill", d => d.isBroker ? "#F59E0B" : getRoleColor(d.role))
      .style("stroke", d => d.isBroker ? "#D97706" : "#fff")
      .style("stroke-width", d => d.isBroker ? 3 : 2);

    // Add pulse animation for knowledge brokers
    node.filter(d => d.isBroker)
      .style("animation", "pulse 2s infinite");

    // Add names
    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(d => d.name)
      .style("font-size", "10px")
      .style("text-anchor", "middle")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y + 50);
    });
  }

  function getCollaborationColor(type) {
    const colors = {
      'mentorship': '#10B981',
      'project': '#3B82F6', 
      'general': '#6B7280',
      'cross-functional': '#F59E0B'
    };
    return colors[type] || '#6B7280';
  }

  function getRoleColor(role) {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < role.length; i++) {
      hash = role.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 60%)`;
  }

  function handleViewModeChange(mode) {
    organizationalDNAStore.setViewMode(mode);
  }

  function handleSkillFilter(skill) {
    organizationalDNAStore.setSelectedSkill(skill);
  }

  function handleStrengthChange(event) {
    organizationalDNAStore.setNetworkStrength(parseInt(event.target.value));
  }
</script>

{#if dnaData.viewMode !== 'hierarchy'}
  <div class="dna-container" transition:fade={{ duration: 300 }}>
    <!-- DNA Controls -->
    <div class="dna-controls" transition:fly={{ y: -20, duration: 400 }}>
      <div class="view-modes">
        <button 
          class="mode-btn {dnaData.viewMode === 'collaboration' ? 'active' : ''}"
          on:click={() => handleViewModeChange('collaboration')}
        >
          🤝 Collaboration
        </button>
        <button 
          class="mode-btn {dnaData.viewMode === 'skills' ? 'active' : ''}"
          on:click={() => handleViewModeChange('skills')}
        >
          🎯 Skills
        </button>
        <button 
          class="mode-btn {dnaData.viewMode === 'dna' ? 'active' : ''}"
          on:click={() => handleViewModeChange('dna')}
        >
          🧬 DNA View
        </button>
      </div>

      {#if dnaData.viewMode === 'collaboration' || dnaData.viewMode === 'dna'}
        <div class="network-controls">
          <label>
            Connection Strength: 
            <input 
              type="range" 
              min="1" 
              max="5" 
              bind:value={dnaData.networkStrength}
              on:input={handleStrengthChange}
            />
            {dnaData.networkStrength}
          </label>
        </div>
      {/if}

      {#if dnaData.viewMode === 'skills'}
        <div class="skill-filter">
          <select on:change={(e) => handleSkillFilter(e.target.value)}>
            <option value="">All Skills</option>
            {#each dnaData.skills as skill}
              <option value={skill.name}>{skill.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <!-- DNA Visualization -->
    <div class="dna-visualization" style="transform: scale({transform.scale}) translate({transform.x}px, {transform.y}px);">
      <svg bind:this={svgContainer}></svg>
    </div>

    <!-- DNA Insights Panel -->
    <div class="dna-insights" transition:fly={{ x: 20, duration: 400 }}>
      <h3>🧬 Organizational Insights</h3>
      
      {#if dnaData.viewMode === 'collaboration'}
        <div class="insight-card">
          <h4>Top Collaborators</h4>
          {#each members.slice(0, 3) as member}
            <div class="collaborator-item">
              <span class="name">{member.name}</span>
              <span class="connections">
                {dnaData.collaborations.filter(c => c.member1Id === member.id || c.member2Id === member.id).length} connections
              </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if dnaData.viewMode === 'skills'}
        <div class="insight-card">
          <h4>Skill Distribution</h4>
          {#each ['technical', 'soft', 'domain', 'leadership'] as category}
            <div class="skill-stat">
              <span class="category">{category}</span>
              <span class="count">
                {members.reduce((count, member) => 
                  count + (member.skills || []).filter(s => s.category === category).length, 0
                )}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if dnaData.viewMode === 'dna'}
        <div class="insight-card">
          <h4>🌟 Knowledge Brokers</h4>
          <p class="insight-desc">People who bridge different teams and skills</p>
          {#each organizationalDNAStore.getKnowledgeBrokers(members, dnaData.collaborations, dnaData.skills).slice(0, 3) as broker}
            <div class="broker-item">
              <span class="name">{broker.member.name}</span>
              <span class="score">Score: {broker.brokerScore}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dna-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    color: white;
    overflow: hidden;
  }

  .dna-controls {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    display: flex;
    gap: 20px;
    align-items: center;
    background: rgba(30, 41, 59, 0.9);
    padding: 15px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }

  .view-modes {
    display: flex;
    gap: 10px;
  }

  .mode-btn {
    padding: 8px 16px;
    border: 2px solid rgba(99, 102, 241, 0.3);
    border-radius: 8px;
    background: rgba(99, 102, 241, 0.1);
    color: #C7D2FE;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  }

  .mode-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.5);
  }

  .mode-btn.active {
    background: #6366F1;
    border-color: #6366F1;
    color: white;
  }

  .network-controls label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }

  .network-controls input[type="range"] {
    width: 100px;
  }

  .skill-filter select {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(99, 102, 241, 0.3);
    background: rgba(30, 41, 59, 0.9);
    color: white;
  }

  .dna-visualization {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .dna-insights {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 280px;
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  .dna-insights h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .insight-card {
    background: rgba(51, 65, 85, 0.5);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
  }

  .insight-card h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #F1F5F9;
  }

  .insight-desc {
    font-size: 12px;
    color: #94A3B8;
    margin: 0 0 10px 0;
  }

  .collaborator-item,
  .skill-stat,
  .broker-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  }

  .collaborator-item:last-child,
  .skill-stat:last-child,
  .broker-item:last-child {
    border-bottom: none;
  }

  .name {
    font-weight: 500;
    font-size: 13px;
  }

  .connections,
  .count,
  .score {
    font-size: 12px;
    color: #94A3B8;
  }

  .category {
    font-size: 13px;
    text-transform: capitalize;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>