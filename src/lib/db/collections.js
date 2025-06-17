// Collection names and helper functions for Firestore
export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  MEMBERS: "members",
  ORGANIZATION_PERMISSIONS: "organization_permissions",
  COLLABORATIONS: "collaborations",
  SKILLS: "skills",
  PROJECTS: "projects",
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
  skills: [], // Array of skill objects: { name, level, category }
  mentors: [], // Array of member IDs who mentor this person
  mentees: [], // Array of member IDs this person mentors
  collaborators: [], // Array of collaboration objects: { memberId, frequency, projects }
  expertise: [], // Array of expertise areas this person is known for
  interests: [], // Array of areas this person wants to learn about
  personalityType: null, // MBTI, DISC, or other personality framework
  workingStyle: [], // Array of working style preferences
  bio: '', // Short bio or description
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

// Helper functions for Organizational DNA feature
export const createCollaborationData = (
  organizationId,
  member1Id,
  member2Id,
  frequency = 'occasional', // 'daily', 'weekly', 'monthly', 'occasional'
  type = 'general', // 'mentorship', 'project', 'general', 'cross-functional'
  strength = 3, // 1-5 scale
  projects = []
) => ({
  organizationId,
  member1Id,
  member2Id,
  frequency,
  type,
  strength,
  projects,
  lastInteraction: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
});

export const createSkillData = (
  name,
  category = 'technical', // 'technical', 'soft', 'domain', 'leadership'
  description = ''
) => ({
  name: name.trim(),
  category,
  description,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createProjectData = (
  organizationId,
  name,
  description,
  memberIds = [],
  status = 'active', // 'planning', 'active', 'completed', 'on-hold'
  startDate = null,
  endDate = null
) => ({
  organizationId,
  name: name.trim(),
  description,
  memberIds,
  status,
  startDate: startDate || new Date(),
  endDate,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Validation functions for new fields
export const validateSkillName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
};

export const validateSkillLevel = (level) => {
  return Number.isInteger(level) && level >= 1 && level <= 5;
};
