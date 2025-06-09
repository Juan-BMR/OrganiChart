import imageCompression from "browser-image-compression";

/**
 * Compress image file in browser.
 * @param {File} file Original image file
 * @param {number} quality 0-1
 * @param {number} maxWidth Max width/height in px
 * @returns {Promise<Blob>} compressed image blob
 */
export async function compressImage(file, quality = 0.8, maxWidth = 1024) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    initialQuality: quality,
  };
  const compressedFile = await imageCompression(file, options);
  return compressedFile;
}