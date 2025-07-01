// File upload constants and validation utilities

export const FILE_CONSTANTS = {
  IMAGE: {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    SUPPORTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    UNSUPPORTED_TYPES: ['image/heic', 'image/heif'],
    ERROR_MESSAGES: {
      INVALID_TYPE: 'Please upload an image file (JPG, PNG, GIF, WebP)',
      UNSUPPORTED_TYPE: 'HEIC/HEIF files are not supported. Please convert to JPG or PNG first.',
      SIZE_EXCEEDED: 'File size must be below 2MB'
    }
  },
  CV: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    ERROR_MESSAGES: {
      INVALID_TYPE: 'Please upload a PDF, DOC, or DOCX file',
      SIZE_EXCEEDED: 'CV file size must be below 5MB'
    }
  }
};

/**
 * Validates an image file
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: FILE_CONSTANTS.IMAGE.ERROR_MESSAGES.INVALID_TYPE };
  }

  // Check for unsupported formats
  if (FILE_CONSTANTS.IMAGE.UNSUPPORTED_TYPES.includes(file.type.toLowerCase())) {
    return { valid: false, error: FILE_CONSTANTS.IMAGE.ERROR_MESSAGES.UNSUPPORTED_TYPE };
  }

  // Check file size
  if (file.size > FILE_CONSTANTS.IMAGE.MAX_SIZE) {
    return { valid: false, error: FILE_CONSTANTS.IMAGE.ERROR_MESSAGES.SIZE_EXCEEDED };
  }

  return { valid: true };
}

/**
 * Validates a CV/resume file
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateCVFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type
  if (!FILE_CONSTANTS.CV.SUPPORTED_TYPES.includes(file.type)) {
    return { valid: false, error: FILE_CONSTANTS.CV.ERROR_MESSAGES.INVALID_TYPE };
  }

  // Check file size
  if (file.size > FILE_CONSTANTS.CV.MAX_SIZE) {
    return { valid: false, error: FILE_CONSTANTS.CV.ERROR_MESSAGES.SIZE_EXCEEDED };
  }

  return { valid: true };
}

/**
 * Creates a preview URL for an image file
 * @param {File} file - The image file
 * @returns {string|null} The preview URL or null
 */
export function createImagePreview(file) {
  if (!file || !file.type.startsWith('image/')) {
    return null;
  }
  return URL.createObjectURL(file);
}

/**
 * Cleans up a preview URL
 * @param {string} url - The preview URL to revoke
 */
export function revokePreviewUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Formats file size in a human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}