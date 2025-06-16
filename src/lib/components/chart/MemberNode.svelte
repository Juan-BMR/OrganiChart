<script>
  export let member;
  import { scale } from "svelte/transition";
  export let x = 0;
  export let y = 0;
  export let size = 90; // diameter of avatar circle
  import NodeContextMenu from "./NodeContextMenu.svelte";
  import { createEventDispatcher } from "svelte";

  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  // --- Drag-and-Drop state & helpers ---
  let isDragOver = false; // highlights valid drop target

  // Function passed from parent that validates whether a given drag action is allowed
  export let validateDrop = null; // (draggedId, targetId) => boolean

  const dispatch = createEventDispatcher();

  /**
   * Fired when the user starts dragging a node. We attach the member's id so
   * the drop target knows which employee is being moved.
   */
  function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", member.id);
    event.dataTransfer.effectAllowed = "move";
  }

  /**
   * While the dragged element hovers this node we provide visual feedback and
   * call preventDefault so that the element is treated as a valid drop zone.
   */
  function handleDragOver(event) {
    const draggedId = event.dataTransfer?.getData("text/plain");
    const ok = draggedId && draggedId !== member.id && (!validateDrop || validateDrop(draggedId, member.id));
    if (ok) {
      event.preventDefault(); // Necessary to allow the drop
      isDragOver = true;
      event.dataTransfer.dropEffect = "move";
    } else {
      // Disallow drop
      event.dataTransfer.dropEffect = "none";
    }
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  /**
   * On drop we dispatch a custom `reparent` event that bubbles up to whatever
   * chart container owns these nodes. That parent component can then decide
   * whether to update state optimistically and/or call the backend.
   */
  function handleDrop(event) {
    event.preventDefault();
    const draggedId = event.dataTransfer?.getData("text/plain");
    isDragOver = false;
    if (draggedId && draggedId !== member.id && (!validateDrop || validateDrop(draggedId, member.id))) {
      dispatch("reparent", {
        employeeId: draggedId,
        newManagerId: member.id,
      });
    }
  }

  // Compute initials if no photo
  $: initials = member?.name
    ? member.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join("")
    : "";

  function handleContextMenu(event) {
    event.preventDefault();
    showMenu = true;
    menuX = event.clientX;
    menuY = event.clientY;
    window.addEventListener("click", closeMenu, { once: true });
  }

  function closeMenu() {
    showMenu = false;
  }

  function onMenuEdit() {
    dispatch("edit", { member });
    closeMenu();
  }

  function onMenuDelete() {
    dispatch("delete", { member });
    closeMenu();
  }

  function onMenuMove() {
    dispatch("move", { member });
    closeMenu();
  }

  // Emit select when user clicks the node
  function handleClick(event) {
    dispatch("select", { member });
  }

  // Open context menu from keyboard (Enter/Space) when node is focused
  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Place menu at center of node for keyboard access
      const rect = event.currentTarget.getBoundingClientRect();
      menuX = rect.left + rect.width / 2;
      menuY = rect.top + rect.height / 2;
      showMenu = true;
      window.addEventListener("click", closeMenu, { once: true });
    }
  }
</script>

<div
  class="member-node {isDragOver ? 'drag-over' : ''}"
  style="left: {x}px; top: {y}px;"
  tabindex="0"
  on:contextmenu={handleContextMenu}
  on:click|stopPropagation={handleClick}
  on:keydown={handleKeyDown}
  draggable="true"
  on:dragstart={handleDragStart}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  in:scale={{ duration: 200 }}
  out:scale={{ duration: 150 }}
>
  <div class="avatar" style="width:{size}px; height:{size}px">
    {#if member.photoURL}
      <img src={member.photoURL} alt={member.name} />
    {:else}
      <span>{initials}</span>
    {/if}
  </div>
  <div class="member-info">
    <div class="name">{member.name}</div>
    {#if member.role}
      <div class="role">{member.role}</div>
    {/if}
  </div>
  {#if showMenu}
    <NodeContextMenu
      {member}
      x={menuX}
      y={menuY}
      on:edit={onMenuEdit}
      on:delete={onMenuDelete}
      on:move={onMenuMove}
    />
  {/if}
</div>

<style>
  .member-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    z-index: 2;
    width: 160px; /* Fixed width for consistent positioning */
  }

  .member-node:hover {
    transform: translateY(-2px);
    /* box-shadow: var(--shadow-md); */
  }

  .avatar {
    background: var(--background);
    border: 4px solid var(--chart-primary, var(--primary));
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .member-node:hover .avatar {
    border-color: var(--chart-primary-light, var(--primary-light));
    transform: scale(1.05);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    color: var(--chart-primary, var(--primary));
    font-weight: 600;
    font-size: 1.25rem;
  }

  .member-info {
    margin-top: var(--spacing-2);
    text-align: center;
    max-width: 200px; /* Fixed width slightly smaller than node width */
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--background);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 0.5px solid var(--chart-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    backdrop-filter: blur(4px);
    width: fit-content;
    transition: all 0.2s ease;
  }

  .member-node:hover .member-info {
    background: var(--background);
    border-color: var(--chart-primary, var(--primary));
  }

  .name {
    font-weight: 600;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    line-height: 1.3;
    margin-bottom: var(--spacing-1);
  }

  .role {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.2;
    font-weight: 500;
  }

  /* Visual feedback when a potential manager is hovered during drag */
  .member-node.drag-over {
    box-shadow: 0 0 0 4px var(--chart-primary-light, var(--secondary));
    transition: box-shadow 0.15s ease;
  }
</style>
