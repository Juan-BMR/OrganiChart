// Collection names and helper functions for Firestore
export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  MEMBERS: "members",
  ORGANIZATION_PERMISSIONS: "organization_permissions",
};

// Organization permission roles
export const PERMISSION_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  VIEWER: "viewer",
};

// Data validation schemas
export const createUserData = (user) => ({
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL || null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
});

export const createOrganizationData = (name, logoURL, ownerId) => ({
  name: name.trim(),
  logoURL: logoURL || null,
  ownerId,
  chartColor: "#6366F1", // Default chart color
  createdAt: new Date(),
  updatedAt: new Date(),
  memberCount: 0,
  isActive: true,
});

export const createMemberData = (
  organizationId,
  name,
  email,
  role,
  photoURL = null,
  managerId = null,
  startDate = null,
) => ({
  organizationId,
  name: name.trim(),
  email: email.toLowerCase().trim(),
  role: role.trim(),
  photoURL,
  managerId,
  startDate: startDate || new Date(), // Default to today if not provided
  level: 0, // Will be calculated based on hierarchy
  position: null, // Chart positioning
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
});

export const createPermissionData = (
  organizationId,
  userId,
  role,
  invitedBy = null,
) => ({
  organizationId,
  userId,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
  invitedBy,
});

// Helper to generate permission document ID
export const getPermissionDocId = (userId, organizationId) =>
  `${userId}_${organizationId}`;

// Validation functions
export const validateOrganizationName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
};

export const validateMemberEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateMemberName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
};
