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

  // Subscribe to members store
  const unsubscribeMembers = membersStore.subscribe(
    ({ members: m, loading }) => {
      members = m;
      membersLoading = loading;
    }
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
    if (selectionToolActive) {
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
      selectionRect = {
        left: Math.min(selectionStart.x, offsetX),
        top: Math.min(selectionStart.y, offsetY),
        width: Math.abs(offsetX - selectionStart.x),
        height: Math.abs(offsetY - selectionStart.y),
      };
    } else if (isPanning) {
      const dx = event.clientX - panStart.x;
      const dy = event.clientY - panStart.y;
      panStart = { x: event.clientX, y: event.clientY };
      canvasStore.panBy(dx, dy);
    }
  }

  function handlePointerUp(event) {
    if (isSelecting) {
      isSelecting = false;
      zoomToSelection();
      return;
    }
    if (isPanning) {
      isPanning = false;
      containerEl.style.cursor = "grab";
    }
  }

  function handleWheel(event) {
    event.preventDefault();
    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? 1.02 : 0.98; // Reduced from 1.1/0.9 to 1.05/0.95
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
        typeof m.position.y === "number"
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

      // Compute layout with d3.tree for each tree
      const nodeSize = [200, 180]; // More spacing between nodes
      trees.forEach((rootTree, i) => {
        const treeLayout = d3.tree().nodeSize(nodeSize);
        const treeData = treeLayout(rootTree);
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
  let editingMember = null;

  // PDF Export Modal State
  let showPDFModal = false;
  let pdfProgress = 0;
  let pdfCurrentStage = "";
  let pdfStageNumber = 0;
  let pdfTotalStages = 0;

  // Sidebar state
  let sidebarOpen = false;
  let selectedMember = null;
  let sidebarLoading = false;
  let sidebarError = null;
  let navigationHistory = []; // Stack of previous members for back navigation

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
        'img[src*="firebasestorage"]'
      );
      const imageReplacements = [];

      console.log(`Found ${firebaseImages.length} Firebase images to process`);

      // Update progress
      pdfProgress = 15;
      pdfStageNumber = 2;
      pdfCurrentStage = `Processing ${firebaseImages.length} profile images...`;

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
              // Successfully loaded through proxy, now convert to data URL
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              canvas.width = testImg.naturalWidth;
              canvas.height = testImg.naturalHeight;

              ctx.drawImage(testImg, 0, 0);
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
                `Successfully proxied and converted image for ${img.alt || "user"}`
              );
              resolve();
            };

            testImg.onerror = () => {
              console.warn(
                `Failed to load image through proxy: ${originalUrl}`
              );
              // Keep original - will likely be replaced with initials placeholder
              resolve();
            };

            testImg.src = proxyUrl;
          });
        } catch (error) {
          console.warn("Failed to process image:", img.src, error);
        }
      }

      console.log(`Successfully processed ${imageReplacements.length} images`);

      // Update progress
      pdfProgress = 40;
      pdfStageNumber = 3;
      pdfCurrentStage = "Calculating chart boundaries...";

      // Find the exact bounds of the actual chart elements (no padding)
      const nodeWidth = 160;
      const nodeHeight = 160; // Increased to capture full text below avatars

      // Get the absolute positions of the leftmost, rightmost, topmost, and bottommost elements
      const leftmostX = Math.min(...nodesWithPosition.map((n) => n.x));
      const rightmostX =
        Math.max(...nodesWithPosition.map((n) => n.x)) + nodeWidth;
      const topmostY = Math.min(...nodesWithPosition.map((n) => n.y));
      const bottommostY =
        Math.max(...nodesWithPosition.map((n) => n.y)) + nodeHeight;

      // Calculate exact content dimensions
      const contentWidth = rightmostX - leftmostX;
      const contentHeight = bottommostY - topmostY;

      console.log("Exact chart bounds:", {
        leftmostX,
        topmostY,
        rightmostX,
        bottommostY,
        contentWidth,
        contentHeight,
      });

      // Update progress
      pdfProgress = 60;
      pdfStageNumber = 4;
      pdfCurrentStage = "Capturing high-resolution chart...";

      // Capture the container element at high scale for better quality
      const captureScale = 3; // Higher scale for better definition
      const canvas = await html2canvas(containerEl, {
        backgroundColor: null, // Use natural background
        scale: captureScale,
        logging: false,
        useCORS: true,
        allowTaint: false, // Safe since we're using data URLs
        // No ignoreElements needed - all images are now data URLs
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
      croppedCanvas.width = contentWidth * captureScale;
      croppedCanvas.height = contentHeight * captureScale;
      const ctx = croppedCanvas.getContext("2d");

      // Get the canvas div to read its transform
      const canvasDiv = containerEl.querySelector(".canvas");
      const computedStyle = window.getComputedStyle(canvasDiv);
      const transform = computedStyle.transform;

      // Extract translate values from transform matrix
      let translateX = 0,
        translateY = 0;
      if (transform && transform !== "none") {
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
          const values = matrix[1].split(",").map(Number);
          translateX = values[4] || 0;
          translateY = values[5] || 0;
        }
      }

      // Get container position to calculate offset from captured area
      const containerRect = containerEl.getBoundingClientRect();

      // Calculate the exact source position in the high-scale captured canvas
      const sourceX = Math.max(0, (translateX + leftmostX) * captureScale);
      const sourceY = Math.max(0, (translateY + topmostY) * captureScale);
      const sourceWidth = Math.min(
        contentWidth * captureScale,
        canvas.width - sourceX
      );
      const sourceHeight = Math.min(
        contentHeight * captureScale,
        canvas.height - sourceY
      );

      console.log("Cropping details:", {
        chartBounds: { leftmostX, topmostY, rightmostX, bottommostY },
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
        sourceHeight // destination rectangle (same high-res size)
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
        croppedCanvas.height
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
        contentWidth,
        "x",
        contentHeight
      );

      // Update progress
      pdfProgress = 95;
      pdfStageNumber = 6;
      pdfCurrentStage = "Creating PDF document...";

      // Create PDF with custom dimensions that exactly match the chart
      const pdf = new jsPDF({
        // orientation: "portrait", // We'll handle orientation with custom format
        unit: "px",
        format: [contentWidth, contentHeight], // Custom format exactly matching chart
      });

      console.log(
        "PDF internal dimensions:",
        pdf.internal.pageSize.getWidth(),
        "x",
        pdf.internal.pageSize.getHeight()
      );

      // Add the high-resolution image to PDF, scaling down to exact content dimensions
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        contentWidth,
        contentHeight,
        "",
        "SLOW" // Use SLOW for better quality rendering
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
          if (err.name !== "AbortError") {
            console.error("Save failed:", err);
            pdf.save(fileName);
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
          `Restored ${imageReplacements.length} image sources after error`
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
        if (sidebarOpen) {
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
          <!-- Fixed width from MemberNode CSS -->
          {@const avatarSize = 100}
          {@const borderWidth = 4}

          <!-- Avatar is centered within the fixed-width node -->
          {@const parentCenterX = l.x1 + fixedNodeWidth / 2}
          {@const parentBottomY = l.y1 + avatarSize + borderWidth * 2 + 50}
          {@const childCenterX = l.x2 + fixedNodeWidth / 2}
          {@const childTopY = l.y2 - 4}

          <!-- Calculate midpoint for elbow connector -->
          {@const midY = parentBottomY + (childTopY - parentBottomY) / 2}

          <!-- Container for this specific connector -->
          {@const minX = Math.min(parentCenterX, childCenterX) - 10}
          {@const maxX = Math.max(parentCenterX, childCenterX) + 10}
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
                stroke="#6366f1"
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

    <!-- Floating action buttons -->
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

      <!-- Action buttons -->
      <div class="action-controls">
        <button class="action-btn secondary" on:click={exportAsPDF}>
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export PDF
        </button>

        <button class="action-btn primary" on:click={openAddMember}>
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
          Add member
        </button>
      </div>
    </div>
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
    loading={sidebarLoading}
    error={sidebarError}
    on:close={closeSidebar}
    on:back={handleSidebarBack}
    on:navigate={handleSidebarNavigate}
    on:retry={retrySidebar}
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
{/if}

<style>
  .page-container {
    min-height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--background);
    position: relative;
  }

  .chart-container {
    width: 100%;
    height: calc(100vh - var(--header-height));
    background: var(--background);
    cursor: grab;
    user-select: none;
    overflow: hidden;
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
    gap: var(--spacing-4);
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

  /* Disable pointer events on canvas while selecting */
  .chart-container.selection-mode .canvas {
    pointer-events: none;
  }

  .zoom-btn.active {
    background: var(--primary);
    color: white;
  }
</style>
