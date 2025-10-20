/**
 * File upload utility functions for handling file validation and processing
 */

/**
 * Validates a file based on provided constraints
 * @param {File} file - The file to validate
 * @param {Object} constraints - Validation constraints
 * @param {Array<string>} constraints.allowedTypes - Array of allowed MIME types
 * @param {Array<string>} constraints.blockedTypes - Array of blocked MIME types (optional)
 * @param {number} constraints.maxSize - Maximum file size in bytes
 * @param {string} constraints.errorMessages - Error messages for different validation failures
 * @returns {Object} - {isValid: boolean, error?: string}
 */
export function validateFile(file, constraints) {
  const {
    allowedTypes,
    blockedTypes = [],
    maxSize,
    errorMessages,
  } = constraints;

  // Check allowed types
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: errorMessages?.invalidType || "Invalid file type",
    };
  }

  // Check blocked types
  if (
    blockedTypes.length > 0 &&
    blockedTypes.some((type) => file.type.toLowerCase().includes(type))
  ) {
    return {
      isValid: false,
      error: errorMessages?.blockedType || "File type not supported",
    };
  }

  // Check file size
  if (maxSize && file.size > maxSize) {
    return {
      isValid: false,
      error:
        errorMessages?.tooLarge ||
        `File size must be below ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Creates a file handler function for use in Svelte components
 * @param {Object} config - Configuration for the file handler
 * @param {Function} config.setFile - Function to set the file state
 * @param {Function} config.setPreviewUrl - Function to set preview URL (for images)
 * @param {Function} config.setError - Function to set error state
 * @param {Function} config.resetInput - Function to reset file input element
 * @param {Object} config.validation - Validation constraints (see validateFile)
 * @returns {Function} - File change handler function
 */
export function createFileHandler(config) {
  const { setFile, setPreviewUrl, setError, resetInput, validation } = config;

  return function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validationResult = validateFile(file, validation);

    if (!validationResult.isValid) {
      setError(validationResult.error);
      resetInput();
      return;
    }

    // File is valid
    setFile(file);
    setError("");

    // Set preview URL for images
    if (setPreviewUrl && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
}

/**
 * Creates a file removal handler
 * @param {Object} config - Configuration for the removal handler
 * @param {Function} config.setFile - Function to clear the file state
 * @param {Function} config.setPreviewUrl - Function to clear preview URL
 * @param {Function} config.resetInput - Function to reset file input element
 * @returns {Function} - File removal handler function
 */
export function createFileRemovalHandler(config) {
  const { setFile, setPreviewUrl, resetInput } = config;

  return function () {
    if (setPreviewUrl) {
      setPreviewUrl(null);
    }
    setFile(null);
    resetInput();
  };
}

// Predefined configurations for common file types
export const FILE_CONSTRAINTS = {
  photo: {
    allowedTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
    blockedTypes: ["heic", "heif"],
    maxSize: 2 * 1024 * 1024, // 2MB
    errorMessages: {
      invalidType: "Please upload an image file (JPG, PNG, GIF, WebP)",
      blockedType:
        "HEIC/HEIF files are not supported. Please convert to JPG or PNG first.",
      tooLarge: "File size must be below 2MB",
    },
  },
  cv: {
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    errorMessages: {
      invalidType: "Please upload a PDF, DOC, or DOCX file",
      tooLarge: "CV file size must be below 5MB",
    },
  },
};
