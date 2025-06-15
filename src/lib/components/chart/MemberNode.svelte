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

  const dispatch = createEventDispatcher();

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

  // Emit select when user clicks the node
  function handleClick(event) {
    dispatch("select", { member });
  }
</script>

<div
  class="member-node"
  style="left: {x}px; top: {y}px;"
  on:contextmenu={handleContextMenu}
  on:click|stopPropagation={handleClick}
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
</style>
