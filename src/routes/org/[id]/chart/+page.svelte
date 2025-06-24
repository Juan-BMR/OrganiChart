<script>
  // @ts-nocheck
  import { onMount, afterUpdate } from "svelte";
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
  import PDFExportModal from "$lib/components/PDFExportModal.svelte";
  import UserInfoSidebar from "$lib/components/UserInfoSidebar.svelte";
  import ChartColorPicker from "$lib/components/ChartColorPicker.svelte";
  import RuleManagerModal from "$lib/components/RuleManagerModal.svelte";
  import ZoomSensitivityControl from "$lib/components/ZoomSensitivityControl.svelte";
  import MemberSearchFilter from "$lib/components/MemberSearchFilter.svelte";
  import ChartToolbar from "$lib/components/ChartToolbar.svelte";
  import { rulesStore } from "$lib/stores/rules.js";
  import { zoomStore } from "$lib/stores/zoom.js";
  import {
    getMemberDiameter,
    getMemberFontSize,
  } from "$lib/utils/ruleEngine.js";

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

  // Track avatar centers separately to avoid reactive loops
  let avatarCenters = new Map();

  // Sidebar state - declare before store subscription
  let selectedMember = null;

  // Modal state - declare before store subscription
  let editingMember = null;

  // Rules store subscription
  let rules = [];
  const unsubscribeRules = rulesStore.subscribe((r) => (rules = r));

  // Zoom sensitivity store subscription
  let zoomSensitivity = 1.02;
  const unsubscribeZoom = zoomStore.subscribe((sensitivity) => {
    zoomSensitivity = sensitivity;
  });

  // Subscribe to members store
  const unsubscribeMembers = membersStore.subscribe(
    ({ members: m, loading }) => {
      members = m;
      membersLoading = loading;

      // Update selectedMember reference if it exists and members changed
      if (selectedMember && m.length > 0) {
        const updatedMember = m.find(
          (member) => member.id === selectedMember.id,
        );
        if (updatedMember) {
          selectedMember = updatedMember;
        }
      }

      // Update editingMember reference if it exists and members changed
      if (editingMember && m.length > 0) {
        const updatedEditingMember = m.find(
          (member) => member.id === editingMember.id,
        );
        if (updatedEditingMember) {
          editingMember = updatedEditingMember;
        }
      }
    },
  );

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

    // Also fetch organization details from organizationsStore (already in memory)
    const orgUnsub = organizationsStore.subscribe(({ organizations }) => {
      organization = organizations.find((o) => o.id === organizationId);
    });

    // Cleanup
    return () => {
      authUnsub();
      pageUnsub();
      orgUnsub();
      membersStore.stop();
      unsubscribeCanvas();
      unsubscribeRules();
      unsubscribeMembers();
      unsubscribeZoom();
    };
  });

  // Reactive: Start listening for members and load rules when organizationId changes
  $: if (organizationId && user) {
    console.log("Loading data for organization:", organizationId);

    // Start listening for members
    membersStore.listen(organizationId);

    // Load rules for this organization
    rulesStore.loadRules(organizationId).catch((error) => {
      console.error("Failed to load rules:", error);
    });
  }

  /********************
   * Pan and Zoom Logic
   *******************/
  let containerEl;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  // ADD SELECTION TOOL STATE AND HELPERS
  let selectionToolActive = false;
  let isSelecting = false;
  let selectionStart = { x: 0, y: 0 };
  let selectionRect = null; // { left, top, width, height }

  function toggleSelectionTool() {
    selectionToolActive = !selectionToolActive;
    if (selectionToolActive) {
      clearSelection();
      containerEl && (containerEl.style.cursor = "crosshair");
    } else {
      deactivateSelectionTool();
    }
  }

  function clearSelection() {
    selectionRect = null;
    isSelecting = false;
  }

  function deactivateSelectionTool() {
    selectionToolActive = false;
    clearSelection();
    containerEl && (containerEl.style.cursor = "grab");
  }

  function startPDFFraming() {
    pdfFramingMode = true;
    pdfFrameRect = null;
    isFraming = false; // Start with modal visible
    containerEl && (containerEl.style.cursor = "crosshair");
  }

  function cancelPDFFraming() {
    pdfFramingMode = false;
    pdfFrameRect = null;
    hasValidFrame = false;
    isFraming = false;
    containerEl && (containerEl.style.cursor = "grab");
  }

  function confirmPDFExport() {
    if (!pdfFrameRect || pdfFrameRect.width < 10 || pdfFrameRect.height < 10) {
      alert("Please draw a frame around the content you want to export.");
      return;
    }

    // Start the actual PDF export with the framed area
    exportFramedPDF();
  }

  function zoomToSelection() {
    if (!selectionRect || !containerEl) return;
    const MIN_SIZE = 10;
    if (selectionRect.width < MIN_SIZE || selectionRect.height < MIN_SIZE) {
      deactivateSelectionTool();
      return;
    }

    const rect = containerEl.getBoundingClientRect();
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Convert selection rectangle to canvas coordinates
    const selCanvasLeft = (selectionRect.left - transform.x) / transform.scale;
    const selCanvasTop = (selectionRect.top - transform.y) / transform.scale;
    const selCanvasWidth = selectionRect.width / transform.scale;
    const selCanvasHeight = selectionRect.height / transform.scale;

    const selCanvasCenterX = selCanvasLeft + selCanvasWidth / 2;
    const selCanvasCenterY = selCanvasTop + selCanvasHeight / 2;

    const PADDING_FACTOR = 0.9;
    const maxScale = 3;
    const minScale = 0.2;

    const scaleX = (rect.width * PADDING_FACTOR) / selCanvasWidth;
    const scaleY = (rect.height * PADDING_FACTOR) / selCanvasHeight;
    let newScale = Math.min(scaleX, scaleY);
    newScale = Math.max(Math.min(newScale, maxScale), minScale);

    const newX = viewportCenterX - selCanvasCenterX * newScale;
    const newY = viewportCenterY - selCanvasCenterY * newScale;

    canvasStore.setTransform({ scale: newScale, x: newX, y: newY });

    // Clean up
    deactivateSelectionTool();
  }

  function handlePointerDown(event) {
    const rect = containerEl.getBoundingClientRect();
    if (pdfFramingMode) {
      // PDF framing mode
      isSelecting = true;
      isFraming = true; // Start framing - hide modal
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      selectionStart = { x: offsetX, y: offsetY };
      pdfFrameRect = {
        left: offsetX,
        top: offsetY,
        width: 0,
        height: 0,
      };
    } else if (selectionToolActive) {
      isSelecting = true;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      selectionStart = { x: offsetX, y: offsetY };
      selectionRect = {
        left: offsetX,
        top: offsetY,
        width: 0,
        height: 0,
      };
    } else {
      isPanning = true;
      panStart = { x: event.clientX, y: event.clientY };
      containerEl.style.cursor = "grabbing";
    }
  }

  function handlePointerMove(event) {
    const rect = containerEl.getBoundingClientRect();
    if (isSelecting) {
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      if (pdfFramingMode) {
        pdfFrameRect = {
          left: Math.min(selectionStart.x, offsetX),
          top: Math.min(selectionStart.y, offsetY),
          width: Math.abs(offsetX - selectionStart.x),
          height: Math.abs(offsetY - selectionStart.y),
        };
      } else {
        selectionRect = {
          left: Math.min(selectionStart.x, offsetX),
          top: Math.min(selectionStart.y, offsetY),
          width: Math.abs(offsetX - selectionStart.x),
          height: Math.abs(offsetY - selectionStart.y),
        };
      }
    } else if (isPanning) {
      const dx = event.clientX - panStart.x;
      const dy = event.clientY - panStart.y;
      panStart = { x: event.clientX, y: event.clientY };
      canvasStore.panBy(dx, dy);
    }
  }
  $: hasValidFrame = false;
  function handlePointerUp(event) {
    if (isSelecting) {
      isSelecting = false;
      if (pdfFramingMode) {
        // Show modal again only if we have a valid frame
        if (
          pdfFrameRect &&
          pdfFrameRect.width > 10 &&
          pdfFrameRect.height > 10
        ) {
          hasValidFrame = true;
          isFraming = false; // Finished framing - show modal again
        }
        // Don't zoom, just finish framing
        return;
      } else {
        zoomToSelection();
        return;
      }
    }
    if (isPanning) {
      isPanning = false;
      containerEl.style.cursor = "grab";
    }
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? zoomSensitivity : 2 - zoomSensitivity;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.2), 3);
    const rect = containerEl.getBoundingClientRect();
    const center = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    canvasStore.zoomTo(newScale, center);
  }

  /********************
   * Layout Calculation
   *******************/
  $: nodesWithPosition = (() => {
    if (!members || !members.length) return [];

    // Use stored positions if they exist, otherwise calculate with d3.tree
    const positioned = [];

    // Check if all members have stored positions
    const allHavePositions = members.every(
      (m) =>
        m.position &&
        typeof m.position.x === "number" &&
        typeof m.position.y === "number",
    );

    if (allHavePositions) {
      // Use stored positions
      members.forEach((member) => {
        positioned.push({
          member,
          x: member.position.x,
          y: member.position.y,
        });
      });
    } else {
      // Fall back to d3.tree layout calculation
      const roots = members.filter((m) => !m.managerId);

      // For each root build d3 hierarchy
      const trees = roots.map((root) => {
        return d3.hierarchy(root, (d) => {
          return members.filter((m) => m.managerId === d.id);
        });
      });

      // Use original fixed spacing, then post-process for individual nodes with large avatars
      const nodeSize = [200, 180];

      trees.forEach((rootTree, i) => {
        const treeLayout = d3.tree().nodeSize(nodeSize);
        const treeData = treeLayout(rootTree);

        // Post-process: adjust positions proportionally for nodes with larger avatars and fonts
        const adjustPositionsForLargeAvatars = (node) => {
          const member = node.data;
          const avatarDiameter = getMemberDiameter(member, rules) || 90;
          const fontSizeString = getMemberFontSize(member, rules) || "14px";
          const fontSize = parseInt(fontSizeString); // Convert "14px" to 14
          const defaultDiameter = 90;
          const defaultFontSize = 14;

          let totalExtraSpace = 0;

          // Calculate extra space for larger avatars
          if (avatarDiameter > defaultDiameter) {
            const avatarExtraSpace = (avatarDiameter - defaultDiameter) * 1;
            totalExtraSpace += avatarExtraSpace;
          }

          // Calculate extra space for larger fonts
          if (fontSize > defaultFontSize) {
            const fontExtraSpace = (fontSize - defaultFontSize) * 3;
            totalExtraSpace += fontExtraSpace;
          }

          // Apply total spacing adjustment if needed
          if (totalExtraSpace > 0) {
            // Recursively push down all descendants
            const pushDownDescendants = (n, yOffset) => {
              if (n.children) {
                n.children.forEach((child) => {
                  child.y += yOffset;
                  pushDownDescendants(child, yOffset);
                });
              }
            };

            pushDownDescendants(node, totalExtraSpace);
          }

          // Recursively process children
          if (node.children) {
            node.children.forEach((child) =>
              adjustPositionsForLargeAvatars(child),
            );
          }
        };

        // Apply adjustments starting from root
        adjustPositionsForLargeAvatars(rootTree);

        // Offset each tree horizontally to avoid overlap if multiple roots
        const offsetX = i * 600;
        treeData.each((node) => {
          positioned.push({
            member: node.data,
            x: node.x + offsetX,
            y: node.y,
          });
        });
      });
    }

    return positioned;
  })();

  // Center content when nodes are first loaded
  $: if (
    nodesWithPosition.length > 0 &&
    containerEl &&
    transform.scale === 1 &&
    transform.x === 0 &&
    transform.y === 0
  ) {
    centerContent();
  }

  function centerContent() {
    if (!nodesWithPosition.length || !containerEl) return;

    // Calculate bounding box of all nodes
    const minX = Math.min(...nodesWithPosition.map((n) => n.x));
    const maxX = Math.max(...nodesWithPosition.map((n) => n.x));
    const minY = Math.min(...nodesWithPosition.map((n) => n.y));
    const maxY = Math.max(...nodesWithPosition.map((n) => n.y));

    // Get viewport dimensions
    const rect = containerEl.getBoundingClientRect();
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Calculate content center
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Calculate offset to center content
    const offsetX = viewportCenterX - contentCenterX;
    const offsetY = viewportCenterY - contentCenterY;

    // Set transform to center the content
    canvasStore.setTransform({
      scale: 1,
      x: offsetX,
      y: offsetY,
    });
  }

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
          parentId: parent.member.id,
          childId: n.member.id,
        });
      }
    });

    return arr;
  })();

  let showAddMember = false;
  let showEditMember = false;

  // PDF Export Modal State
  let showPDFModal = false;
  let pdfProgress = 0;
  let pdfCurrentStage = "";
  let pdfStageNumber = 0;
  let pdfTotalStages = 6;

  // PDF Export Framing State
  let pdfFramingMode = false;
  let pdfFrameRect = null; // { left, top, width, height }
  let isFraming = false; // Track if user is actively dragging to create frame

  // Sidebar state
  let sidebarOpen = false;
  let sidebarLoading = false;
  let sidebarError = null;
  let navigationHistory = []; // Stack of previous members for back navigation

  // Rules modal state
  let showRules = false;

  // Search functionality state
  let showSearch = false;
  let filteredMembers = [];
  let highlightedMemberId = null;
  let searchActive = false;

  function openAddMember() {
    showAddMember = true;
  }
  function closeAddMember() {
    showAddMember = false;
  }

  function openRules() {
    showRules = true;
  }
  function closeRules() {
    showRules = false;
  }

  // Search functionality
  function handleToggleSearch() {
    showSearch = !showSearch;
    if (!showSearch) {
      // Clear search state when closing
      filteredMembers = [];
      highlightedMemberId = null;
      searchActive = false;
    }
  }

  function handleSearchFilter(event) {
    const { members: filtered, query, filters } = event.detail;
    filteredMembers = filtered;
    searchActive = !!(query || filters.department || filters.role || filters.manager);
    
    // Clear highlighting when search changes
    highlightedMemberId = null;
  }

  function handleHighlightMember(event) {
    const { memberId } = event.detail;
    highlightedMemberId = memberId;
    
    // Find the member position and center on it
    const memberNode = nodesWithPosition.find(n => n.member.id === memberId);
    if (memberNode && containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;
      
      // Calculate new transform to center the member
      const newX = viewportCenterX - memberNode.x * transform.scale;
      const newY = viewportCenterY - memberNode.y * transform.scale;
      
      canvasStore.setTransform({
        scale: transform.scale,
        x: newX,
        y: newY
      });
      
      // Auto-highlight for 3 seconds
      setTimeout(() => {
        highlightedMemberId = null;
      }, 3000);
    }
  }

  function handleCloseSearch() {
    showSearch = false;
    filteredMembers = [];
    highlightedMemberId = null;
    searchActive = false;
  }

  // Toolbar event handlers
  function handleFitToScreen() {
    if (!nodesWithPosition.length || !containerEl) return;
    
    // Calculate bounding box of all nodes
    const minX = Math.min(...nodesWithPosition.map(n => n.x));
    const maxX = Math.max(...nodesWithPosition.map(n => n.x));
    const minY = Math.min(...nodesWithPosition.map(n => n.y));
    const maxY = Math.max(...nodesWithPosition.map(n => n.y));
    
    const rect = containerEl.getBoundingClientRect();
    const padding = 100; // Add some padding
    
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 3); // Max scale of 3
    
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    const newX = rect.width / 2 - contentCenterX * newScale;
    const newY = rect.height / 2 - contentCenterY * newScale;
    
    canvasStore.setTransform({
      scale: newScale,
      x: newX,
      y: newY
    });
  }

  function handleResetView() {
    centerContent();
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
    try {
      await membersStore.deleteMember(member.id, organizationId);

      // Close sidebar if the deleted member was selected
      if (selectedMember?.id === member.id) {
        sidebarOpen = false;
        selectedMember = null;
      }

      console.log(`Successfully deleted member: ${member.name}`);
    } catch (error) {
      console.error("Failed to delete member:", error);
      alert(`Failed to delete ${member.name}: ${error.message}`);
    }
  }

  // New framed PDF export function
  async function exportFramedPDF() {
    if (!containerEl || !pdfFrameRect) return;

    try {
      // Hide the framing UI
      pdfFramingMode = false;

      // Show modal and start progress
      showPDFModal = true;
      pdfProgress = 0;
      pdfStageNumber = 1;
      pdfCurrentStage = "Initializing export...";

      console.log("Starting framed PDF export...", pdfFrameRect);

      // Convert Firebase images to use proxy URLs to avoid CORS issues
      const firebaseImages = containerEl.querySelectorAll(
        'img[src*="firebasestorage"]',
      );
      const imageReplacements = [];

      console.log(`Found ${firebaseImages.length} Firebase images to process`);

      // Update progress
      pdfProgress = 15;
      pdfStageNumber = 2;
      pdfCurrentStage =
        firebaseImages.length > 0
          ? `Processing ${firebaseImages.length} profile images...`
          : "Preparing chart for export...";

      // Process images (same as before)
      if (firebaseImages.length > 0) {
        for (const img of firebaseImages) {
          try {
            const originalUrl = img.src;
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;

            imageReplacements.push({
              img,
              originalSrc: originalUrl,
            });

            await new Promise((resolve) => {
              const testImg = new Image();
              testImg.crossOrigin = "anonymous";

              testImg.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  // Make canvas square and scale image to cover (object-fit: cover behavior)
                  const size = Math.min(
                    testImg.naturalWidth,
                    testImg.naturalHeight,
                  );
                  canvas.width = size;
                  canvas.height = size;

                  // Calculate crop area to center the image
                  const sourceSize = size;
                  const sourceX = (testImg.naturalWidth - sourceSize) / 2;
                  const sourceY = (testImg.naturalHeight - sourceSize) / 2;

                  // Draw the cropped square portion
                  ctx.drawImage(
                    testImg,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    0,
                    0,
                    size,
                    size,
                  );
                  const dataURL = canvas.toDataURL("image/png");
                  img.src = dataURL;
                  resolve();
                } catch (canvasError) {
                  console.warn(
                    "Failed to convert image to data URL:",
                    canvasError,
                  );
                  resolve();
                }
              };

              testImg.onerror = () => {
                console.warn(
                  `Failed to load image through proxy: ${originalUrl}`,
                );
                resolve();
              };

              testImg.src = proxyUrl;
            });
          } catch (error) {
            console.warn("Failed to process image:", img.src, error);
          }
        }
      }

      console.log(`Successfully processed ${imageReplacements.length} images`);

      // Update progress
      pdfProgress = 40;
      pdfStageNumber = 3;
      pdfCurrentStage = "Using framed area for export...";

      // Use the framed area directly
      const frameWidth = pdfFrameRect.width;
      const frameHeight = pdfFrameRect.height;

      console.log("Framed area:", {
        frame: pdfFrameRect,
        dimensions: { frameWidth, frameHeight },
      });

      // Update progress
      pdfProgress = 60;
      pdfStageNumber = 4;
      pdfCurrentStage = "Capturing framed area...";

      // Capture the container element at high scale for better quality
      const captureScale = 3;
      const canvas = await html2canvas(containerEl, {
        backgroundColor: "#ffffff",
        scale: captureScale,
        logging: false,
        useCORS: true,
        allowTaint: false,
        ignoreElements: (element) => {
          return (
            element.classList.contains("color-picker") ||
            element.classList.contains("floating-controls") ||
            element.classList.contains("modal-overlay") ||
            element.classList.contains("pdf-frame-rect")
          );
        },
        onclone: (clonedDoc) => {
          // Same theme detection and color replacement as before
          const isLightMode =
            document.documentElement.getAttribute("data-theme") === "light";

          const backgroundRgba90 = isLightMode
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(30, 41, 59, 0.9)";
          const backgroundRgba95 = isLightMode
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)";

          const allStyles = clonedDoc.querySelectorAll("style");
          allStyles.forEach((styleEl) => {
            if (styleEl.textContent) {
              styleEl.textContent = styleEl.textContent
                .replace(
                  /color-mix\(in srgb,\s*var\(--background\)\s*90%,\s*transparent\)/g,
                  backgroundRgba90,
                )
                .replace(
                  /color-mix\(in srgb,\s*var\(--background\)\s*95%,\s*transparent\)/g,
                  backgroundRgba95,
                )
                .replace(
                  /color-mix\(in srgb,\s*var\(--chart-primary[^)]*\)\s*15%,\s*transparent\)/g,
                  "rgba(99, 102, 241, 0.15)",
                );
            }
          });

          const elementsWithStyle = clonedDoc.querySelectorAll("[style]");
          elementsWithStyle.forEach((el) => {
            if (el.style.cssText) {
              el.style.cssText = el.style.cssText.replace(
                /color-mix\([^)]+\)/g,
                backgroundRgba90,
              );
            }
          });

          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      console.log("Canvas captured:", canvas.width, "x", canvas.height);

      // Update progress
      pdfProgress = 80;
      pdfStageNumber = 5;
      pdfCurrentStage = "Cropping to framed area...";

      if (canvas.width === 0 || canvas.height === 0) {
        alert("Export failed - captured canvas has zero dimensions.");
        return;
      }

      // Calculate source coordinates in the high-scale captured canvas
      // Frame coordinates are now correctly relative to container (after visual fix)
      let sourceX = pdfFrameRect.left * captureScale;
      let sourceY = pdfFrameRect.top * captureScale;
      let sourceWidth = frameWidth * captureScale;
      let sourceHeight = frameHeight * captureScale;

      console.log("Y-axis debugging:", {
        "pdfFrameRect.top": pdfFrameRect.top,
        "containerEl.scrollTop": containerEl.scrollTop,
        captureScale: captureScale,
        "calculated sourceY": sourceY,
        "canvas.height": canvas.height,
        "container getBoundingClientRect": containerEl.getBoundingClientRect(),
        "window.scrollY": window.scrollY,
      });

      // Ensure coordinates stay within canvas boundaries
      sourceX = Math.max(0, Math.min(sourceX, canvas.width));
      sourceY = Math.max(0, Math.min(sourceY, canvas.height));

      // Adjust width and height to not exceed canvas boundaries
      sourceWidth = Math.min(sourceWidth, canvas.width - sourceX);
      sourceHeight = Math.min(sourceHeight, canvas.height - sourceY);

      // Create a canvas for the cropped output using the adjusted dimensions
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = sourceWidth;
      croppedCanvas.height = sourceHeight;
      const ctx = croppedCanvas.getContext("2d");

      console.log("Cropping details:", {
        frame: pdfFrameRect,
        source: { sourceX, sourceY, sourceWidth, sourceHeight },
        canvasSize: `${canvas.width}x${canvas.height}`,
        targetSize: `${croppedCanvas.width}x${croppedCanvas.height}`,
        adjustedForBounds: true,
      });

      // Draw the framed portion to the cropped canvas
      ctx.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight,
      );

      // Restore original image sources
      for (const replacement of imageReplacements) {
        replacement.img.src = replacement.originalSrc;
      }
      console.log(`Restored ${imageReplacements.length} image sources`);

      // Convert cropped canvas to image data
      const imgData = croppedCanvas.toDataURL("image/png");
      console.log(
        "Final canvas dimensions:",
        croppedCanvas.width,
        "x",
        croppedCanvas.height,
      );

      if (imgData.length < 1000) {
        console.error("Image data too small, likely empty");
        alert("Export failed - captured image appears to be empty.");
        return;
      }

      // Update progress
      pdfProgress = 95;
      pdfStageNumber = 6;
      pdfCurrentStage = "Creating PDF document...";

      // Use actual cropped canvas dimensions for PDF
      const actualWidth = croppedCanvas.width / captureScale;
      const actualHeight = croppedCanvas.height / captureScale;

      // Determine orientation based on actual cropped dimensions
      const isLandscape = actualWidth > actualHeight;
      const orientation = isLandscape ? "landscape" : "portrait";

      // Use actual dimensions for PDF
      const pdfWidth = actualWidth;
      const pdfHeight = actualHeight;
      const pdfFormat = [actualWidth, actualHeight];

      console.log("PDF orientation:", {
        originalFrame: { frameWidth, frameHeight },
        actualDimensions: { actualWidth, actualHeight },
        aspectRatio: (actualWidth / actualHeight).toFixed(2),
        orientation,
        isLandscape,
        finalDimensions: { pdfWidth, pdfHeight },
      });

      // Create PDF with determined orientation and dimensions
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "px",
        format: pdfFormat,
      });

      console.log(
        "PDF internal dimensions:",
        pdf.internal.pageSize.getWidth(),
        "x",
        pdf.internal.pageSize.getHeight(),
      );

      // Add the image to PDF using calculated dimensions
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, "", "SLOW");

      // Final progress update
      pdfProgress = 100;
      pdfCurrentStage = "Downloading PDF...";

      // Save the PDF
      const fileName = `${organization?.name || "orgchart"}.pdf`;

      if ("showSaveFilePicker" in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF files",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });

          const writableStream = await fileHandle.createWritable();
          const pdfBlob = pdf.output("blob");
          await writableStream.write(pdfBlob);
          await writableStream.close();

          console.log("PDF saved successfully");
          hasValidFrame = false;
          setTimeout(() => {
            showPDFModal = false;
            pdfFrameRect = null;
          }, 500);
        } catch (err) {
          hasValidFrame = false;
          if (err.name === "AbortError") {
            // User cancelled the save dialog
            console.log("PDF save cancelled by user");
            setTimeout(() => {
              showPDFModal = false;
              pdfFrameRect = null;
            }, 100);
          } else {
            console.error("Save failed:", err);
            pdf.save(fileName);
            setTimeout(() => {
              showPDFModal = false;
              pdfFrameRect = null;
            }, 500);
          }
        }
      } else {
        pdf.save(fileName);

        setTimeout(() => {
          showPDFModal = false;
          pdfFrameRect = null;
        }, 500);
      }
    } catch (error) {
      // Restore image sources in case of error
      if (typeof imageReplacements !== "undefined") {
        for (const replacement of imageReplacements) {
          replacement.img.src = replacement.originalSrc;
        }
        console.log(
          `Restored ${imageReplacements.length} image sources after error`,
        );
      }

      console.error("Framed PDF export failed:", error);
      alert("Failed to export PDF: " + error.message);

      showPDFModal = false;
      pdfFrameRect = null;
    }
  }

  async function exportAsPDF() {
    if (!containerEl) return;

    try {
      if (!nodesWithPosition.length) {
        alert("No chart content to export. Please add members first.");
        return;
      }

      // Show modal and start progress
      showPDFModal = true;
      pdfProgress = 0;
      pdfStageNumber = 1;
      pdfCurrentStage = "Initializing export...";

      console.log("Starting PDF export...");

      // Convert Firebase images to use proxy URLs to avoid CORS issues
      const firebaseImages = containerEl.querySelectorAll(
        'img[src*="firebasestorage"]',
      );
      const imageReplacements = [];

      console.log(`Found ${firebaseImages.length} Firebase images to process`);

      // Update progress
      pdfProgress = 15;
      pdfStageNumber = 2;
      pdfCurrentStage =
        firebaseImages.length > 0
          ? `Processing ${firebaseImages.length} profile images...`
          : "Preparing chart for export...";

      // Only process images if there are any Firebase images
      if (firebaseImages.length > 0) {
        for (const img of firebaseImages) {
          try {
            const originalUrl = img.src;

            // Use our proxy API to avoid CORS issues
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;

            // Create a new image element to test loading through proxy
            const testImg = new Image();
            testImg.crossOrigin = "anonymous";

            await new Promise((resolve, reject) => {
              testImg.onload = () => {
                try {
                  // Successfully loaded through proxy, now convert to data URL
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");

                  // Make canvas square and scale image to cover (object-fit: cover behavior)
                  const size = Math.min(
                    testImg.naturalWidth,
                    testImg.naturalHeight,
                  );
                  canvas.width = size;
                  canvas.height = size;

                  // Calculate crop area to center the image
                  const sourceSize = size;
                  const sourceX = (testImg.naturalWidth - sourceSize) / 2;
                  const sourceY = (testImg.naturalHeight - sourceSize) / 2;

                  // Draw the cropped square portion
                  ctx.drawImage(
                    testImg,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    0,
                    0,
                    size,
                    size,
                  );
                  const dataURL = canvas.toDataURL("image/png");

                  // Store replacement info
                  imageReplacements.push({
                    img: img,
                    originalSrc: originalUrl,
                    dataURL: dataURL,
                  });

                  // Replace the image src with data URL
                  img.src = dataURL;
                  console.log(
                    `Successfully proxied and converted image for ${img.alt || "user"}`,
                  );
                  resolve();
                } catch (canvasError) {
                  console.warn(
                    "Failed to convert image to data URL:",
                    canvasError,
                  );
                  resolve(); // Continue even if conversion fails
                }
              };

              testImg.onerror = () => {
                console.warn(
                  `Failed to load image through proxy: ${originalUrl}`,
                );
                // Keep original - will likely be replaced with initials placeholder
                resolve();
              };

              testImg.src = proxyUrl;
            });
          } catch (error) {
            console.warn("Failed to process image:", img.src, error);
            // Continue processing other images even if one fails
          }
        }
      }

      console.log(`Successfully processed ${imageReplacements.length} images`);

      // Update progress
      pdfProgress = 40;
      pdfStageNumber = 3;
      pdfCurrentStage = "Calculating visible chart boundaries...";

      // Instead of calculating from node positions, use the current viewport bounds
      // This ensures we capture exactly what's visible, accounting for zoom/pan
      const viewportRect = containerEl.getBoundingClientRect();

      // Get all visible nodes in screen coordinates
      const visibleNodes = nodesWithPosition
        .map((n) => {
          // Convert canvas coordinates to screen coordinates
          const screenX = n.x * transform.scale + transform.x;
          const screenY = n.y * transform.scale + transform.y;
          return { ...n, screenX, screenY };
        })
        .filter((n) => {
          // Only include nodes that are at least partially visible
          const nodeWidth = 160 * transform.scale;
          const nodeHeight = 200 * transform.scale; // Generous height estimate
          return (
            n.screenX + nodeWidth > 0 &&
            n.screenX < viewportRect.width &&
            n.screenY + nodeHeight > 0 &&
            n.screenY < viewportRect.height
          );
        });

      if (visibleNodes.length === 0) {
        alert(
          "No visible chart content to export. Please adjust the view and try again.",
        );
        return;
      }

      // Calculate bounds of visible content in screen coordinates
      const padding = 40;
      const leftmostScreen =
        Math.min(...visibleNodes.map((n) => n.screenX)) - padding;
      const rightmostScreen =
        Math.max(
          ...visibleNodes.map((n) => n.screenX + 160 * transform.scale),
        ) + padding;
      const topmostScreen =
        Math.min(...visibleNodes.map((n) => n.screenY)) - padding;
      const bottommostScreen =
        Math.max(
          ...visibleNodes.map((n) => n.screenY + 200 * transform.scale),
        ) + padding;

      // Ensure bounds are within the container
      const boundedLeft = Math.max(0, leftmostScreen);
      const boundedTop = Math.max(0, topmostScreen);
      const boundedRight = Math.min(viewportRect.width, rightmostScreen);
      const boundedBottom = Math.min(viewportRect.height, bottommostScreen);

      const contentWidth = boundedRight - boundedLeft;
      const contentHeight = boundedBottom - boundedTop;

      // Convert back to canvas coordinates for cropping
      const paddedLeftmostX = (boundedLeft - transform.x) / transform.scale;
      const paddedTopmostY = (boundedTop - transform.y) / transform.scale;
      const paddedContentWidth = contentWidth / transform.scale;
      const paddedContentHeight = contentHeight / transform.scale;

      console.log("Viewport-based chart bounds:", {
        viewport: {
          width: viewportRect.width,
          height: viewportRect.height,
        },
        transform: {
          scale: transform.scale,
          x: transform.x,
          y: transform.y,
        },
        visibleNodes: visibleNodes.length,
        screenBounds: {
          leftmostScreen,
          rightmostScreen,
          topmostScreen,
          bottommostScreen,
        },
        boundedBounds: {
          boundedLeft,
          boundedRight,
          boundedTop,
          boundedBottom,
          contentWidth,
          contentHeight,
        },
        canvasBounds: {
          paddedLeftmostX,
          paddedTopmostY,
          paddedContentWidth,
          paddedContentHeight,
        },
      });

      // Update progress
      pdfProgress = 60;
      pdfStageNumber = 4;
      pdfCurrentStage = "Capturing high-resolution chart...";

      // Capture the container element at high scale for better quality
      const captureScale = 3; // Higher scale for better definition
      const canvas = await html2canvas(containerEl, {
        backgroundColor: "#ffffff", // Use solid white background instead of null
        scale: captureScale,
        logging: false,
        useCORS: true,
        allowTaint: false, // Safe since we're using data URLs
        ignoreElements: (element) => {
          // Ignore elements that might cause issues
          return (
            element.classList.contains("color-picker") ||
            element.classList.contains("floating-controls") ||
            element.classList.contains("modal-overlay")
          );
        },
        onclone: (clonedDoc) => {
          // Detect current theme - dark mode is default (no data-theme), light mode has data-theme="light"
          const isLightMode =
            document.documentElement.getAttribute("data-theme") === "light";

          // Set appropriate background colors based on theme
          const backgroundRgba90 = isLightMode
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(30, 41, 59, 0.9)";
          const backgroundRgba95 = isLightMode
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)";

          // Find all style elements and replace color-mix() functions
          const allStyles = clonedDoc.querySelectorAll("style");
          allStyles.forEach((styleEl) => {
            if (styleEl.textContent) {
              // Replace color-mix() functions with theme-appropriate rgba equivalents
              styleEl.textContent = styleEl.textContent
                .replace(
                  /color-mix\(in srgb,\s*var\(--background\)\s*90%,\s*transparent\)/g,
                  backgroundRgba90,
                )
                .replace(
                  /color-mix\(in srgb,\s*var\(--background\)\s*95%,\s*transparent\)/g,
                  backgroundRgba95,
                )
                .replace(
                  /color-mix\(in srgb,\s*var\(--chart-primary[^)]*\)\s*15%,\s*transparent\)/g,
                  "rgba(99, 102, 241, 0.15)",
                );
            }
          });

          // Also check inline styles
          const elementsWithStyle = clonedDoc.querySelectorAll("[style]");
          elementsWithStyle.forEach((el) => {
            if (el.style.cssText) {
              el.style.cssText = el.style.cssText.replace(
                /color-mix\([^)]+\)/g,
                backgroundRgba90,
              );
            }
          });

          // Remove problematic CSS properties
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      console.log("Canvas captured:", canvas.width, "x", canvas.height);

      // Update progress
      pdfProgress = 80;
      pdfStageNumber = 5;
      pdfCurrentStage = "Processing and cropping image...";

      if (canvas.width === 0 || canvas.height === 0) {
        alert("Export failed - captured canvas has zero dimensions.");
        return;
      }

      // Create a high-resolution canvas for the final output
      const croppedCanvas = document.createElement("canvas");

      // Set canvas to high resolution (scale up for quality, then we'll scale down for PDF)
      croppedCanvas.width = paddedContentWidth * captureScale;
      croppedCanvas.height = paddedContentHeight * captureScale;
      const ctx = croppedCanvas.getContext("2d");

      // Get the canvas div to read its transform
      const canvasDiv = containerEl.querySelector(".canvas");
      const computedStyle = window.getComputedStyle(canvasDiv);
      const cssTransform = computedStyle.transform;

      // Extract translate values from transform matrix
      let translateX = 0,
        translateY = 0;
      if (cssTransform && cssTransform !== "none") {
        const matrix = cssTransform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
          const values = matrix[1].split(",").map(Number);
          translateX = values[4] || 0;
          translateY = values[5] || 0;
        }
      }

      // Get container position to calculate offset from captured area
      const containerRect = containerEl.getBoundingClientRect();

      // Calculate the exact source position in the high-scale captured canvas
      // Use the padding variables already declared above

      const sourceX = Math.max(
        0,
        (translateX + paddedLeftmostX) * captureScale,
      );
      const sourceY = Math.max(0, (translateY + paddedTopmostY) * captureScale);
      const sourceWidth = Math.min(
        paddedContentWidth * captureScale,
        canvas.width - sourceX,
      );
      const sourceHeight = Math.min(
        paddedContentHeight * captureScale,
        canvas.height - sourceY,
      );

      console.log("Cropping details:", {
        viewportBounds: {
          boundedLeft,
          boundedTop,
          boundedRight,
          boundedBottom,
          contentWidth,
          contentHeight,
        },
        canvasBounds: {
          paddedLeftmostX,
          paddedTopmostY,
          paddedContentWidth,
          paddedContentHeight,
        },
        transform: { translateX, translateY },
        sourceRect: { sourceX, sourceY, sourceWidth, sourceHeight },
        canvasSize: `${canvas.width}x${canvas.height}`,
        targetSize: `${croppedCanvas.width}x${croppedCanvas.height}`,
      });

      // Draw the high-resolution portion to the high-resolution canvas
      ctx.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight, // source rectangle (high-res)
        0,
        0,
        sourceWidth,
        sourceHeight, // destination rectangle (same high-res size)
      );

      // Restore original image sources
      for (const replacement of imageReplacements) {
        replacement.img.src = replacement.originalSrc;
      }
      console.log(`Restored ${imageReplacements.length} image sources`);

      // Convert cropped canvas to image data
      const imgData = croppedCanvas.toDataURL("image/png");
      console.log(
        "Final canvas dimensions:",
        croppedCanvas.width,
        "x",
        croppedCanvas.height,
      );
      console.log("Image data length:", imgData.length);

      // Check if we actually got image data (not just a white canvas)
      if (imgData.length < 1000) {
        console.error("Image data too small, likely empty");
        alert("Export failed - captured image appears to be empty.");
        return;
      }

      // Debug: Show what dimensions we're about to use for PDF
      console.log(
        "PDF will be created with dimensions:",
        paddedContentWidth,
        "x",
        paddedContentHeight,
      );

      // Update progress
      pdfProgress = 95;
      pdfStageNumber = 6;
      pdfCurrentStage = "Creating PDF document...";

      // Create PDF with custom dimensions that exactly match the chart
      const pdf = new jsPDF({
        // orientation: "portrait", // We'll handle orientation with custom format
        unit: "px",
        format: [paddedContentWidth, paddedContentHeight], // Custom format exactly matching chart
      });

      console.log(
        "PDF internal dimensions:",
        pdf.internal.pageSize.getWidth(),
        "x",
        pdf.internal.pageSize.getHeight(),
      );

      // Add the high-resolution image to PDF, scaling down to exact content dimensions
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        paddedContentWidth,
        paddedContentHeight,
        "",
        "SLOW", // Use SLOW for better quality rendering
      );

      // Final progress update
      pdfProgress = 100;
      pdfCurrentStage = "Downloading PDF...";

      // Save with file picker
      const fileName = `${organization?.name || "orgchart"}.pdf`;

      if ("showSaveFilePicker" in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF files",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });

          const writableStream = await fileHandle.createWritable();
          const pdfBlob = pdf.output("blob");
          await writableStream.write(pdfBlob);
          await writableStream.close();

          console.log("PDF saved successfully");

          // Close modal after a brief delay to show completion
          setTimeout(() => {
            showPDFModal = false;
          }, 500);
        } catch (err) {
          if (err.name === "AbortError") {
            // User cancelled the save dialog
            console.log("PDF save cancelled by user");
            setTimeout(() => {
              showPDFModal = false;
            }, 100);
          } else {
            console.error("Save failed:", err);
            pdf.save(fileName);
            setTimeout(() => {
              showPDFModal = false;
            }, 500);
          }
        }
      } else {
        pdf.save(fileName);

        // Close modal after a brief delay to show completion
        setTimeout(() => {
          showPDFModal = false;
        }, 500);
      }
    } catch (error) {
      // Restore image sources in case of error
      if (typeof imageReplacements !== "undefined") {
        for (const replacement of imageReplacements) {
          replacement.img.src = replacement.originalSrc;
        }
        console.log(
          `Restored ${imageReplacements.length} image sources after error`,
        );
      }

      console.error("PDF export failed:", error);
      alert("Failed to export PDF: " + error.message);

      // Close modal on error
      showPDFModal = false;
    }
  }

  // Helper function to get chart content center
  function getChartCenter() {
    if (!nodesWithPosition.length || !containerEl) {
      return { x: 0, y: 0 }; // Fallback to top-left if no content
    }

    // Calculate bounding box of all nodes (same as centerContent function)
    const minX = Math.min(...nodesWithPosition.map((n) => n.x));
    const maxX = Math.max(...nodesWithPosition.map((n) => n.x));
    const minY = Math.min(...nodesWithPosition.map((n) => n.y));
    const maxY = Math.max(...nodesWithPosition.map((n) => n.y));

    // Calculate content center in canvas coordinates
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Convert to screen coordinates by applying current transform
    const screenCenterX = contentCenterX * transform.scale + transform.x;
    const screenCenterY = contentCenterY * transform.scale + transform.y;

    return { x: screenCenterX, y: screenCenterY };
  }

  // Zoom controls & keyboard shortcuts
  function zoomIn() {
    deactivateSelectionTool();
    const center = getChartCenter();
    canvasStore.zoomTo(Math.min(transform.scale * 1.2, 3), center);
  }
  function zoomOut() {
    deactivateSelectionTool();
    const center = getChartCenter();
    canvasStore.zoomTo(Math.max(transform.scale * 0.8, 0.2), center);
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
      case "Escape":
        if (pdfFramingMode) {
          cancelPDFFraming();
        } else if (sidebarOpen) {
          closeSidebar();
        } else if (selectionToolActive) {
          deactivateSelectionTool();
        }
        break;
    }
  }
  onMount(() => {
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  });

  // Handler when a node is clicked
  async function handleSelectMember(event) {
    const { member } = event.detail;
    // For now, we have member data already. If additional fetch needed, set loading.
    sidebarLoading = true;
    sidebarError = null;
    sidebarOpen = true;

    try {
      // Placeholder for async fetch of detailed data, e.g. via store or API
      // const data = await membersStore.fetchDetailed(member.id);
      // selectedMember = data;
      selectedMember = member;
      sidebarLoading = false;
    } catch (err) {
      console.error(err);
      sidebarError = "Failed to load member details.";
      sidebarLoading = false;
    }
  }

  function closeSidebar() {
    sidebarOpen = false;
    navigationHistory = []; // Clear navigation history when closing
  }

  function handleSidebarBack() {
    if (navigationHistory.length > 0) {
      const previousMember = navigationHistory.pop();
      selectedMember = previousMember;
      // Don't add to history since we're going back
      navigationHistory = [...navigationHistory]; // Trigger reactivity
    }
  }

  function handleSidebarNavigate(event) {
    const { member: targetMember } = event.detail;
    // Add current member to history before navigating
    if (selectedMember) {
      navigationHistory = [...navigationHistory, selectedMember];
    }
    selectedMember = targetMember;
  }

  // Retry fetch after error
  async function retrySidebar() {
    if (!selectedMember) return;
    sidebarError = null;
    sidebarLoading = true;
    try {
      // const data = await membersStore.fetchDetailed(selectedMember.id);
      // selectedMember = data;
      sidebarLoading = false;
    } catch (err) {
      console.error(err);
      sidebarError = "Failed to load member details.";
      sidebarLoading = false;
    }
  }
</script>

<svelte:head>
  <title
    >{organization ? organization.name + " Chart" : "Org Chart"} - OrganiChart</title
  >
</svelte:head>

<Header {user} />

{#if user}
  <!-- Main container with proper spacing from header -->
  <div class="page-container">
    <!-- Chart viewport -->
    <div
      bind:this={containerEl}
      class="chart-container"
      class:selection-mode={selectionToolActive}
      on:pointerdown|capture={handlePointerDown}
      on:pointermove={handlePointerMove}
      on:pointerup={handlePointerUp}
      on:wheel={handleWheel}
    >
      <div
        class="canvas"
        style="transform: translate({transform.x}px, {transform.y}px) scale({transform.scale});"
      >
        <!-- Organizational Connection Lines (Figma-style elbow connectors) -->
        {#each lines as l, i}
          <!-- Calculate avatar centers using fixed node width -->
          {@const fixedNodeWidth = 160}
          <!-- Look up member data for dynamic avatar sizes -->
          {@const parentMember = members.find((m) => m.id === l.parentId)}
          {@const childMember = members.find((m) => m.id === l.childId)}
          {@const parentAvatarSize =
            getMemberDiameter(parentMember || {}, rules) || 90}
          {@const childAvatarSize =
            getMemberDiameter(childMember || {}, rules) || 90}
          {@const borderWidth = 4}
          {@const parentFontSize =
            getMemberFontSize(parentMember || {}, rules) || "14px"}

          <!-- Avatar is centered within the fixed-width node -->
          {@const parentCenterX = l.x1 + fixedNodeWidth / 2}
          <!-- Calculate dynamic bottom position based on font size -->
          {@const parentFontSizeNum = parseInt(parentFontSize)}
          {@const parentExtraTextHeight = Math.max(
            0,
            (parentFontSizeNum - 14) * 2.5,
          )}
          {@const parentBottomY =
            l.y1 +
            parentAvatarSize +
            borderWidth * 2 +
            50 +
            parentExtraTextHeight}
          {@const childCenterX = l.x2 + fixedNodeWidth / 2}
          {@const childTopY = l.y2 - 4}

          <!-- Calculate midpoint for elbow connector -->
          {@const midY = parentBottomY + (childTopY - parentBottomY) / 2}

          <!-- Container for this specific connector -->
          {@const minX = Math.min(parentCenterX, childCenterX) - 10}
          {@const maxX = Math.max(parentCenterX, childCenterX) + 10}
          {@const extraTextHeight = Math.max(
            0,
            (parseInt(parentFontSize) - 14) * 1,
          )}
          {@const minY = Math.min(parentBottomY, childTopY) - 10}
          {@const maxY = Math.max(parentBottomY, childTopY) + 10}

          <div
            style="position: absolute; left: {minX}px; top: {minY}px; width: {maxX -
              minX}px; height: {maxY -
              minY}px; z-index: 1; pointer-events: none;"
          >
            <svg
              width="100%"
              height="100%"
              style="position: absolute; top: 0; left: 0;"
            >
              <!-- Elbow connector path: down → horizontal → down -->
              <path
                d="M {parentCenterX - minX} {parentBottomY - minY}
                   L {parentCenterX - minX} {midY - minY}
                   L {childCenterX - minX} {midY - minY}
                   L {childCenterX - minX} {childTopY - minY}"
                stroke="var(--chart-primary, var(--primary))"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.7"
              />
            </svg>
          </div>
        {/each}

        <!-- Nodes -->
        {#each nodesWithPosition as n (n.member.id)}
          <MemberNode
            member={n.member}
            x={n.x}
            y={n.y}
            size={100}
            highlighted={highlightedMemberId === n.member.id}
            dimmed={searchActive && filteredMembers.length > 0 && !filteredMembers.some(m => m.id === n.member.id)}
            on:edit={handleEditMember}
            on:delete={handleDeleteMember}
            on:select={handleSelectMember}
          />
        {/each}

        <!-- nodes loop end -->
      </div>

      <!-- Selection rectangle overlay -->
      {#if selectionRect}
        <div
          class="selection-rect"
          style="left:{selectionRect.left}px; top:{selectionRect.top}px; width:{selectionRect.width}px; height:{selectionRect.height}px;"
        ></div>
      {/if}

      <!-- Loading state -->
      {#if membersLoading}
        <div class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>Loading organization chart...</p>
          </div>
        </div>
      {/if}

      <!-- Empty state -->
      {#if !membersLoading && members.length === 0}
        <div class="empty-state">
          <div class="empty-content">
            <svg
              class="empty-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3>No team members yet</h3>
            <p>
              Get started by adding your first team member to the organization
              chart.
            </p>
            <button class="empty-action-btn" on:click={openAddMember}>
              <svg
                class="button-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add first member
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Chart Toolbar -->
    {#if !pdfFramingMode}
      <ChartToolbar
        memberCount={members.length}
        isSearchVisible={showSearch}
        on:toggleSearch={handleToggleSearch}
        on:addMember={openAddMember}
        on:exportPDF={startPDFFraming}
        on:manageRules={openRules}
        on:fitToScreen={handleFitToScreen}
        on:resetView={handleResetView}
      />
    {/if}

    <!-- Member Search Filter -->
    <MemberSearchFilter
      {members}
      isVisible={showSearch}
      on:filter={handleSearchFilter}
      on:highlight={handleHighlightMember}
      on:close={handleCloseSearch}
    />

    {#if !pdfFramingMode}
      <!-- Floating zoom controls -->
      <div class="floating-controls">
        <!-- Zoom controls -->
        <div class="zoom-controls">
          <button
            class="zoom-btn"
            class:active={selectionToolActive}
            aria-label="Zoom to selection"
            title="Zoom to selection"
            on:click={toggleSelectionTool}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect
                x="3"
                y="3"
                width="12"
                height="12"
                rx="1"
                ry="1"
                stroke-dasharray="2 2"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 16l5 5"
              />
            </svg>
          </button>
          <button
            class="zoom-btn"
            aria-label="Zoom in"
            on:click={zoomIn}
            title="Zoom in"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
          <button
            class="zoom-btn"
            aria-label="Zoom out"
            on:click={zoomOut}
            title="Zoom out"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 12H4"
              />
            </svg>
          </button>
        </div>

        <!-- Zoom sensitivity control -->
        <ZoomSensitivityControl />
      </div>
    {/if}
  </div>

  <!-- Modals -->
  <AddMemberModal
    bind:open={showAddMember}
    {organizationId}
    {members}
    on:close={closeAddMember}
  />

  <EditMemberModal
    bind:open={showEditMember}
    member={editingMember}
    {organizationId}
    {members}
    on:close={closeEditMember}
  />

  <PDFExportModal
    isVisible={showPDFModal}
    progress={pdfProgress}
    currentStage={pdfCurrentStage}
    currentStageNumber={pdfStageNumber}
    totalStages={pdfTotalStages}
  />

  <!-- User info sidebar -->
  <UserInfoSidebar
    open={sidebarOpen}
    member={selectedMember}
    {members}
    {organizationId}
    {navigationHistory}
    on:close={closeSidebar}
    on:back={handleSidebarBack}
    on:navigate={handleSidebarNavigate}
    on:edit={(e) => {
      editingMember = e.detail.member;
      showEditMember = true;
    }}
    on:delete={(e) => handleDeleteMember(e)}
    on:viewInChart={() => {
      // sidebar already open on the member's position; close?
      sidebarOpen = false;
    }}
  />

  {#if !pdfFramingMode}
    <ChartColorPicker {organizationId} />
  {/if}

  <RuleManagerModal open={showRules} {organizationId} on:close={closeRules} />

  <!-- PDF Framing Mode Overlay -->
  {#if pdfFramingMode}
    {#if pdfFrameRect && pdfFrameRect.width > 10 && pdfFrameRect.height > 10}
      <!-- Dark overlay with cutout for the selected frame -->
      <div
        class="pdf-framing-cutout-overlay"
        style="left:{pdfFrameRect.left}px; top:{pdfFrameRect.top}px; width:{pdfFrameRect.width}px; height:{pdfFrameRect.height}px;"
      ></div>
      <!-- Frame border -->
      <div
        class="pdf-framing-border"
        style="left:{pdfFrameRect.left}px; top:{pdfFrameRect.top}px; width:{pdfFrameRect.width}px; height:{pdfFrameRect.height}px;"
      ></div>
    {:else}
      <!-- Full dark overlay when no frame is drawn -->
      <div class="pdf-framing-dark-overlay"></div>
    {/if}

    <!-- Instructions panel - hide while actively framing -->
    {#if !isFraming}
      <div
        class="pdf-framing-instructions-overlay"
        on:mouseenter={() => {
          if (!hasValidFrame) {
            isFraming = true;
          }
        }}
      >
        <div class="pdf-framing-instructions">
          <div class="instruction-content">
            <h3>Frame Your Export</h3>
            {#if pdfFrameRect && pdfFrameRect.width > 10 && pdfFrameRect.height > 10}
              <div class="frame-info">
                <span class="frame-dimensions">
                  {Math.round(pdfFrameRect.width)} × {Math.round(
                    pdfFrameRect.height,
                  )} px
                </span>
                <span class="frame-orientation">
                  {pdfFrameRect.width > pdfFrameRect.height
                    ? "Landscape"
                    : "Portrait"}
                </span>
              </div>
            {:else}
              <p>Draw a rectangle around the content to export</p>
            {/if}
          </div>

          <div class="pdf-framing-controls">
            <button
              class="export-btn"
              on:click={confirmPDFExport}
              disabled={!pdfFrameRect || pdfFrameRect.width < 10}
            >
              Export PDF
            </button>
            <button class="cancel-btn" on:click={cancelPDFFraming}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
{/if}

<style>
  .page-container {
    min-height: calc(100vh - var(--header-height));
    /* margin-top: var(--header-height); */
    background: var(--background);
    /* position: relative; */
  }

  .chart-container {
    width: 100%;
    height: calc(100vh);
    background: var(--background);
    cursor: grab;
    user-select: none;
    position: relative;
  }

  .chart-container:active {
    cursor: grabbing;
  }

  .canvas {
    position: absolute;
    transform-origin: 0 0;
    will-change: transform;
    /* Improve rendering quality */
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    backface-visibility: hidden;
    -webkit-font-smoothing: subpixel-antialiased;
    font-smooth: always;
  }

  .lines-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
  }

  /* Loading state */
  .loading-overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--background) 90%, transparent);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-content p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  /* Empty state */
  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
    padding: var(--spacing-8);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--text-secondary);
    margin: 0 auto var(--spacing-6);
  }

  .empty-content h3 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-3);
  }

  .empty-content p {
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-6);
    line-height: 1.6;
  }

  .empty-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
  }

  .empty-action-btn:hover {
    background: var(--primary-dark);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  /* Floating controls */
  .floating-controls {
    position: absolute;
    bottom: var(--spacing-6);
    right: var(--spacing-6);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-3);
    z-index: 200;
  }

  .zoom-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-1);
    box-shadow: var(--shadow-md);
    width: fit-content;
  }

  .zoom-btn {
    width: 28px;
    height: 28px;
    background: transparent;
    color: var(--text-primary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }

  .zoom-btn:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.05);
  }

  .zoom-btn:active {
    transform: scale(0.95);
  }

  .zoom-btn svg {
    width: 16px;
    height: 16px;
  }

  .action-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .action-btn.primary {
    background: var(--primary);
    color: white;
  }

  .action-btn.primary:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .action-btn.secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .action-btn.secondary:hover {
    background: var(--secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .button-icon {
    width: 16px;
    height: 16px;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .floating-controls {
      bottom: var(--spacing-4);
      right: var(--spacing-4);
      gap: var(--spacing-3);
    }

    .action-btn {
      padding: var(--spacing-2) var(--spacing-3);
      font-size: var(--font-size-xs);
    }

    .zoom-btn {
      width: 36px;
      height: 36px;
    }
  }

  /* Selection rectangle */
  .selection-rect {
    position: absolute;
    border: 2px dashed var(--primary);
    background: color-mix(in srgb, var(--primary) 15%, transparent);
    pointer-events: none;
    z-index: 120;
  }

  /* PDF Frame rectangle */
  .pdf-frame-rect {
    position: absolute;
    border: 3px solid #ff6b35;
    background: color-mix(in srgb, #ff6b35 10%, transparent);
    pointer-events: none;
    z-index: 121;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.3);
  }

  /* PDF Framing Mode Overlay */
  .pdf-framing-dark-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2000;
    pointer-events: none;
  }
  .pdf-framing-cutout-overlay {
    position: absolute;
    background: transparent;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
    z-index: 2001;
    pointer-events: none;
  }

  .pdf-framing-border {
    position: absolute;
    background: transparent;
    border: 3px solid var(--primary);
    border-style: dashed;
    z-index: 2002;
    pointer-events: none;
  }
  .pdf-framing-instructions-overlay {
    position: fixed;
    top: calc(var(--header-height) + var(--spacing-10));
    left: var(--spacing-6);
    z-index: 2002;
    pointer-events: none;
  }

  .pdf-framing-instructions {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    box-shadow: var(--shadow-lg);
    max-width: 280px;
    pointer-events: auto;
  }

  .instruction-content {
    text-align: left;
    margin-bottom: var(--spacing-3);
  }

  .pdf-framing-instructions h3 {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-2) 0;
  }

  .pdf-framing-instructions p {
    color: var(--text-secondary);
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .frame-info {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .frame-dimensions {
    font-weight: 500;
    color: var(--text-primary);
    font-family: monospace;
  }

  .frame-orientation {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .pdf-framing-controls {
    display: flex;
    gap: var(--spacing-2);
  }

  .export-btn {
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    white-space: nowrap;
  }

  .export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .export-btn:not(:disabled):hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .pdf-framing-controls .cancel-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: var(--spacing-3) var(--spacing-5);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    white-space: nowrap;
  }

  .pdf-framing-controls .cancel-btn:hover {
    background: var(--secondary);
    color: var(--text-primary);
  }

  /* Disable pointer events on canvas while selecting */
  .chart-container.selection-mode .canvas {
    pointer-events: none;
  }

  .zoom-btn.active {
    background: var(--primary);
    color: white;
  }
</style>
