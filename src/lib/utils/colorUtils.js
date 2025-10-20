/**
 * Color utility functions for hex color manipulation
 */

const HEX_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Normalizes a hex color to uppercase with # prefix
 * @param {string} val - Color value to normalize
 * @returns {string} Normalized hex color
 */
export function normalizeHex(val) {
  if (!val) return "";
  return val.startsWith("#") ? val.toUpperCase() : `#${val.toUpperCase()}`;
}

/**
 * Validates if a string is a valid hex color
 * @param {string} val - Value to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHex(val) {
  return HEX_REGEX.test(val.startsWith("#") ? val.slice(1) : val);
}

/**
 * Adjusts the brightness of a hex color
 * @param {string} hex - Hex color to adjust
 * @param {number} percent - Percentage to adjust (-100 to 100)
 * @returns {string} Adjusted hex color
 */
export function adjustColor(hex, percent) {
  const h = normalizeHex(hex).slice(1);
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  const adjust = (c) => {
    const amt = Math.round((percent / 100) * 255);
    return Math.min(255, Math.max(0, c + amt));
  };

  r = adjust(r);
  g = adjust(g);
  b = adjust(b);

  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Sets CSS custom properties for chart colors
 * @param {string} baseColor - Base hex color
 */
export function setColorVariables(baseColor) {
  document.documentElement.style.setProperty("--chart-primary", baseColor);
  document.documentElement.style.setProperty(
    "--chart-primary-dark",
    adjustColor(baseColor, -15),
  );
  document.documentElement.style.setProperty(
    "--chart-primary-light",
    adjustColor(baseColor, 15),
  );
}

