<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';
  import ToolCallCard from './ToolCallCard.svelte';

  // Import specific tool components
  import GetUserInfoTool from './tools/GetUserInfoTool.svelte';
  import AddUserTool from './tools/AddUserTool.svelte';
  import AddUserBetweenTool from './tools/AddUserBetweenTool.svelte';
  import GetOrgInfoTool from './tools/GetOrgInfoTool.svelte';
  import RemoveUserTool from './tools/RemoveUserTool.svelte';

  export let toolCall: ToolCall;

  // Map tool names to components
  const toolComponents: Record<string, any> = {
    getUserInformation: GetUserInfoTool,
    addUser: AddUserTool,
    addUserBetween: AddUserBetweenTool,
    getOrganizationInformation: GetOrgInfoTool,
    removeUser: RemoveUserTool
  };

  $: ToolComponent = toolComponents[toolCall.name];
</script>

<ToolCallCard {toolCall}>
  {#if ToolComponent}
    <svelte:component this={ToolComponent} {toolCall} />
  {/if}
</ToolCallCard>