<script>
  // @ts-nocheck
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Header from "$lib/components/layout/Header.svelte";
  import { authStore } from "$lib/stores/auth.js";
  import { organizationsStore } from "$lib/stores/organizations.js";
  import { membersStore } from "$lib/stores/members.js";
  import { canvasStore } from "$lib/stores/canvas.js";
  import MemberNode from "$lib/components/chart/MemberNode.svelte";
  import AddMemberModal from "$lib/components/AddMemberModal.svelte";
  import EditMemberModal from "$lib/components/EditMemberModal.svelte";

  import * as d3 from "d3";
  import html2canvas from "html2canvas";
  import jsPDF from "jspdf";

  let user = null;
  let organizationId = null;
  let organization = null;

  // Members data
  let members = [];
  let membersLoading = true;

  // Canvas transform reactive store
  let transform = { scale: 1, x: 0, y: 0 };
  const unsubscribeCanvas = canvasStore.subscribe((t) => (transform = t));

  // Subscribe to members store
  const unsubscribeMembers = membersStore.subscribe(({ members: m, loading }) => {
    members = m;
    membersLoading = loading;
  });

  // Listen for auth and organization param
  onMount(() => {
    const authUnsub = authStore.subscribe(({ user: u, loading }) => {
      if (!loading) {
        if (!u) {
          goto("/login");
        } else {
          user = u;
        }
      }
    });

    // Get param
    const pageUnsub = page.subscribe(($page) => {
      organizationId = $page.params.id;
    });

    // Start listening for members when we have org id
    if (organizationId) {
      membersStore.listen(organizationId);
      // Also fetch organization details from organizationsStore (already in memory)
      const orgUnsub = organizationsStore.subscribe(({ organizations }) => {
        organization = organizations.find((o) => o.id === organizationId);
      });
      // Cleanup membership
      return () => {
        authUnsub();
        pageUnsub();
        orgUnsub();
        membersStore.stop();
        unsubscribeCanvas();
        unsubscribeMembers();
      };
    }
  });

  /********************
   * Pan and Zoom Logic
   *******************/
  let containerEl;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  function handlePointerDown(event) {
    isPanning = true;
    panStart = { x: event.clientX, y: event.clientY };
    containerEl.style.cursor = "grabbing";
  }

  function handlePointerMove(event) {
    if (!isPanning) return;
    const dx = event.clientX - panStart.x;
    const dy = event.clientY - panStart.y;
    panStart = { x: event.clientX, y: event.clientY };
    canvasStore.panBy(dx, dy);
  }

  function handlePointerUp() {
    isPanning = false;
    containerEl.style.cursor = "grab";
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.2), 3);
    const rect = containerEl.getBoundingClientRect();
    const center = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    canvasStore.zoomTo(newScale, center);
  }

  /********************
   * Layout Calculation
   *******************/
  $: nodesWithPosition = (() => {
    if (!members || !members.length) return [];

    // Determine root(s) with no managerId
    const roots = members.filter((m) => !m.managerId);

    // For each root build d3 hierarchy
    const trees = roots.map((root) => {
      return d3.hierarchy(root, (d) => {
        return members.filter((m) => m.managerId === d.id);
      });
    });

    // Compute layout with d3.tree for each tree
    const positioned = [];
    const nodeSize = [140, 140];
    trees.forEach((rootTree, i) => {
      const treeLayout = d3.tree().nodeSize(nodeSize);
      const treeData = treeLayout(rootTree);
      // Offset each tree horizontally to avoid overlap if multiple roots
      const offsetX = i * 500;
      treeData.each((node) => {
        positioned.push({
          member: node.data,
          x: node.x + offsetX,
          y: node.y,
        });
      });
    });
    return positioned;
  })();

  // Build lines between nodes
  $: lines = (() => {
    if (!nodesWithPosition.length) return [];
    const map = new Map(nodesWithPosition.map((n) => [n.member.id, n]));
    const arr = [];
    nodesWithPosition.forEach((n) => {
      if (n.member.managerId && map.has(n.member.managerId)) {
        const parent = map.get(n.member.managerId);
        arr.push({
          x1: parent.x,
          y1: parent.y,
          x2: n.x,
          y2: n.y,
        });
      }
    });
    return arr;
  })();

  let showAddMember = false;
  let showEditMember = false;
  let editingMember = null;

  function openAddMember() {
    showAddMember = true;
  }
  function closeAddMember() {
    showAddMember = false;
  }

  function handleEditMember(event) {
    editingMember = event.detail.member;
    showEditMember = true;
  }
  function closeEditMember() {
    showEditMember = false;
    editingMember = null;
  }

  async function handleDeleteMember(event) {
    const member = event.detail.member;
    if (confirm(`Delete ${member.name}?`)) {
      await membersStore.deleteMember(member.id, organizationId);
    }
  }

  async function exportAsPDF() {
    if (!containerEl) return;
    // temporarily reset transform to capture full canvas
    const canvasDiv = containerEl.querySelector(".canvas");
    const prevTransform = canvasDiv.style.transform;
    canvasDiv.style.transform = "scale(1)";
    const canvas = await html2canvas(canvasDiv, { backgroundColor: null, allowTaint: true });
    canvasDiv.style.transform = prevTransform;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${organization?.name || "orgchart"}.pdf`);
  }

  // Zoom controls & keyboard shortcuts
  function zoomIn() {
    canvasStore.zoomTo(Math.min(transform.scale * 1.1, 3));
  }
  function zoomOut() {
    canvasStore.zoomTo(Math.max(transform.scale * 0.9, 0.2));
  }

  function keyHandler(e) {
    switch (e.key) {
      case "+":
      case "=":
        zoomIn();
        break;
      case "-":
        zoomOut();
        break;
      case "ArrowUp":
        canvasStore.panBy(0, 50);
        break;
      case "ArrowDown":
        canvasStore.panBy(0, -50);
        break;
      case "ArrowLeft":
        canvasStore.panBy(50, 0);
        break;
      case "ArrowRight":
        canvasStore.panBy(-50, 0);
        break;
    }
  }
  onMount(() => {
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  });
</script>

<svelte:head>
  <title>{organization ? organization.name + " Chart" : "Org Chart"} - OrganiChart</title>
</svelte:head>

<Header {user} />

{#if user}
  <div
    bind:this={containerEl}
    class="chart-container"
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:wheel={handleWheel}
  >
    <div
      class="canvas"
      style="transform: translate({transform.x}px, {transform.y}px) scale({transform.scale});"
    >
      <!-- Lines -->
      <svg class="lines-layer" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        {#each lines as l}
          <line
            x1={l.x1 + 45}
            y1={l.y1 + 45}
            x2={l.x2 + 45}
            y2={l.y2 + 45}
            stroke="var(--border)"
            stroke-width="2"
          />
        {/each}
      </svg>

      <!-- Nodes -->
      {#each nodesWithPosition as n (n.member.id)}
        <MemberNode member={n.member} x={n.x} y={n.y} 
          on:edit={handleEditMember} on:delete={handleDeleteMember} />
      {/each}
    </div>
  </div>

  {#if membersLoading}
    <div class="loading-overlay">Loading members...</div>
  {/if}

  {#if !membersLoading && members.length === 0}
    <div class="empty-state">No members yet. Use + Add member to begin.</div>
  {/if}

  <button class="add-member-btn" on:click={openAddMember}>+ Add member</button>

  <button class="export-btn" on:click={exportAsPDF}>Export PDF</button>

  <button class="zoom-btn zoom-in" aria-label="Zoom in" on:click={zoomIn}>+</button>
  <button class="zoom-btn zoom-out" aria-label="Zoom out" on:click={zoomOut}>−</button>

  <AddMemberModal
    bind:open={showAddMember}
    {organizationId}
    members={members}
    on:close={closeAddMember}
  />

  <EditMemberModal
    bind:open={showEditMember}
    member={editingMember}
    organizationId={organizationId}
    {members}
    on:close={closeEditMember}
  />
{/if}

<style>
  :global(body) {
    overflow: hidden;
  }

  .chart-container {
    position: fixed;
    inset: 0;
    top: calc(var(--spacing-4) + 72px); /* header height approx */
    background: var(--surface);
    cursor: grab;
    user-select: none;
    overflow: hidden;
  }

  .canvas {
    position: absolute;
    transform-origin: 0 0;
    will-change: transform;
  }

  .lines-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: var(--spacing-4) var(--spacing-6);
    border-radius: var(--radius-md);
  }

  .add-member-btn {
    position: fixed;
    bottom: var(--spacing-8);
    right: var(--spacing-8);
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-md);
    z-index: 1500;
  }

  .export-btn {
    position: fixed;
    bottom: var(--spacing-8);
    right: calc(var(--spacing-8) + 160px);
    background: var(--surface);
    color: var(--text-primary);
    padding: var(--spacing-3) var(--spacing-5);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-md);
    z-index: 1500;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
  }

  .zoom-btn {
    position: fixed;
    bottom: var(--spacing-8);
    left: var(--spacing-8);
    background: var(--surface);
    color: var(--text-primary);
    border-radius: var(--radius-full);
    width: 48px;
    height: 48px;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    z-index: 1500;
  }

  .zoom-out {
    bottom: calc(var(--spacing-8) + 60px);
  }
</style>