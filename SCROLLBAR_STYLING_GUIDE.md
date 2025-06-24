# Custom Scrollbar Styling Guide

This document outlines the custom scrollbar styling system implemented throughout the OrganiChart application.

## Overview

The application now uses a comprehensive custom scrollbar system that provides consistent styling across all components and browsers, replacing the default browser scrollbars with ones that match the application's design system.

## Scrollbar Classes

### 1. Default Global Scrollbars

All elements automatically inherit custom scrollbar styling through global CSS rules:

```css
/* Webkit browsers (Chrome, Safari, Edge) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--surface);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

::-webkit-scrollbar-thumb:active {
  background: var(--primary);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) var(--surface);
}
```

### 2. Enhanced Custom Scrollbar (.scrollbar-custom)

For components that need more prominent scrollbars with borders:

```css
.scrollbar-custom {
  scrollbar-width: thin;
  scrollbar-color: var(--border) var(--surface);
}

.scrollbar-custom::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-custom::-webkit-scrollbar-track {
  background: var(--surface);
  border-radius: var(--radius-sm);
  margin: 2px;
}

.scrollbar-custom::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface);
  transition: all 0.2s ease;
}

.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
  border-color: var(--background);
}

.scrollbar-custom::-webkit-scrollbar-thumb:active {
  background: var(--primary);
  border-color: var(--background);
}
```

**Used in:**
- Modal bodies (AddMemberModal, EditMemberModal, RuleManagerModal, EditOrganizationModal)
- UserInfoSidebar main content area

### 3. Thin Scrollbar (.scrollbar-thin)

For smaller containers or dropdown menus:

```css
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.scrollbar-thin::-webkit-scrollbar-thumb:active {
  background: var(--primary);
}
```

**Used in:**
- Dropdown menus in AddMemberModal
- Subordinates container in UserInfoSidebar

### 4. Primary Colored Scrollbar (.scrollbar-primary)

For areas where you want to emphasize the scrollbar with primary colors:

```css
.scrollbar-primary {
  scrollbar-width: thin;
  scrollbar-color: var(--primary-light) var(--surface);
}

.scrollbar-primary::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-primary::-webkit-scrollbar-track {
  background: var(--surface);
  border-radius: var(--radius-sm);
}

.scrollbar-primary::-webkit-scrollbar-thumb {
  background: var(--primary-light);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.scrollbar-primary::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}

.scrollbar-primary::-webkit-scrollbar-thumb:active {
  background: var(--primary-dark);
}
```

### 5. Hidden Scrollbar (.scrollbar-hidden)

For areas where scrolling is needed but the scrollbar should be invisible:

```css
.scrollbar-hidden {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
```

**Used in:**
- Chart container (where custom pan/zoom controls are used instead)

## Implementation Details

### Browser Support

- **Webkit browsers** (Chrome, Safari, Edge): Full custom styling with `::-webkit-scrollbar` pseudo-elements
- **Firefox**: Uses `scrollbar-width` and `scrollbar-color` properties
- **Internet Explorer/Legacy Edge**: Uses `-ms-overflow-style` for hidden scrollbars

### Theme Integration

All scrollbar styles use CSS custom properties from the application's theme system:

- `var(--surface)` - Track background
- `var(--border)` - Default thumb color
- `var(--text-secondary)` - Hover thumb color
- `var(--primary)` - Active/primary thumb colors
- `var(--background)` - Border colors
- `var(--radius-sm)` - Border radius

This ensures scrollbars automatically adapt to light/dark theme changes.

### Transitions

All scrollbar components include smooth transitions:
- `transition: background-color 0.2s ease` for color changes
- `transition: all 0.2s ease` for comprehensive property changes

## Components Updated

### Modals
- ✅ AddMemberModal - `.scrollbar-custom` on modal, `.scrollbar-thin` on dropdowns
- ✅ EditMemberModal - `.scrollbar-custom` on modal
- ✅ RuleManagerModal - `.scrollbar-custom` on modal
- ✅ EditOrganizationModal - `.scrollbar-custom` on modal

### Sidebars
- ✅ UserInfoSidebar - `.scrollbar-custom` on main body, `.scrollbar-thin` on subordinates list

### Pages
- ✅ Chart page - `.scrollbar-hidden` on chart container

## Usage Guidelines

1. **Default**: Let global styles handle most scrollbars automatically
2. **Modal content**: Use `.scrollbar-custom` for main modal bodies
3. **Dropdown menus**: Use `.scrollbar-thin` for compact scrollable lists
4. **Special emphasis**: Use `.scrollbar-primary` when scrollbar should match primary theme
5. **Custom controls**: Use `.scrollbar-hidden` when implementing custom scroll controls

## Testing

To test scrollbar styling:

1. **Create overflow content** in each component
2. **Test hover states** - scrollbar should darken on hover
3. **Test active states** - scrollbar should turn primary color when dragging
4. **Test theme switching** - scrollbars should adapt to light/dark themes
5. **Test browser compatibility** - verify appearance across Chrome, Firefox, Safari

## Future Enhancements

Potential improvements for the scrollbar system:

1. **Animated scrollbars** - Fade in/out on hover
2. **Custom scroll indicators** - Progress indicators for long content
3. **Touch-friendly sizing** - Larger scrollbars on touch devices
4. **Accessibility improvements** - High contrast mode support