<script>
  export let member;
  import { spring } from "svelte/motion";
  import { scale } from "svelte/transition";
  export let x = 0;
  export let y = 0;
  export let size = 90; // diameter of avatar circle
  export let draggable = true;
  import { canvasStore } from "$lib/stores/canvas.js";
  import { membersStore } from "$lib/stores/members.js";
  import NodeContextMenu from "./NodeContextMenu.svelte";
  import { createEventDispatcher } from "svelte";

  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  const dispatch = createEventDispatcher();

  const xSpring = spring(x, { stiffness: 0.12, damping: 0.4 });
  const ySpring = spring(y, { stiffness: 0.12, damping: 0.4 });

  $: xSpring.set(x);
  $: ySpring.set(y);

  // Compute initials if no photo
  $: initials = member?.name
    ? member.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join("")
    : "";

  function handlePointerDown(event) {
    if (!draggable) return;
    event.stopPropagation();
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(event) {
    if (!isDragging) return;
    const dx = (event.clientX - dragStart.x) / $canvasStore.scale;
    const dy = (event.clientY - dragStart.y) / $canvasStore.scale;
    x += dx;
    y += dy;
    dragStart = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    // Persist position
    membersStore.updatePosition(member.id, { x, y });
  }

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
</script>

<div
  class="member-node"
  style="left: {$xSpring}px; top: {$ySpring}px;"
  on:pointerdown={handlePointerDown}
  on:contextmenu={handleContextMenu}
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
    />
  {/if}
</div>

<style>
  .member-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: grab;
    user-select: none;
    touch-action: none;
    z-index: 2;
    width: 160px; /* Fixed width for consistent positioning */
  }

  .avatar {
    background: white;
    border: 4px solid var(--primary);
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    color: var(--primary);
    font-weight: 600;
    font-size: 1.25rem;
  }

  .member-info {
    margin-top: var(--spacing-2);
    text-align: center;
    max-width: 200px; /* Fixed width slightly smaller than node width */
    padding: var(--spacing-1) var(--spacing-2);
    background: rgba(255, 255, 255, 0.9);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    backdrop-filter: blur(4px);
    width: fit-content;
  }

  /* Dark mode support */
  :global([data-theme="dark"]) .member-info {
    background: rgba(17, 24, 39, 0.9);
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
</style>
