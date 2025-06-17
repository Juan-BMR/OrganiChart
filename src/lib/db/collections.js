// Collection names and helper functions for Firestore
export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  MEMBERS: "members",
  ORGANIZATION_PERMISSIONS: "organization_permissions",
  PULSE_METRICS: "pulse_metrics", // Stores calculated team-level metrics (engagement, workload, etc.)
  PULSE_SURVEYS: "pulse_surveys", // Stores raw, anonymised survey answers
  PULSE_INSIGHTS: "pulse_insights", // Stores AI-generated insights & recommendations
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

// ------------------------------
// Team-Pulse helper factories
// ------------------------------

/**
 * Factory – returns a new pulse-metric document skeleton.
 * Every metric document is attached to an organisation and optionally to a team / member tree node.
 * @param {string} organizationId – owning organisation
 * @param {string} metricKey        – e.g. "engagement_score" | "workload_distribution" | custom defined key
 * @param {any}    value            – numeric or object value representing the metric
 * @param {object} [meta]           – arbitrary meta information (e.g. "period": "2024-Q2")
 */
export const createPulseMetricData = (
  organizationId,
  metricKey,
  value,
  meta = {},
) => ({
  organizationId,
  metricKey: metricKey.trim(),
  value,
  meta,
  createdAt: new Date(),
});

/**
 * Factory – returns a new pulse-survey document skeleton.
 * @param {string} organizationId
 * @param {string} questionId – identifier of the question asked so the frontend can group answers later
 * @param {string} answer     – raw (anonymised) answer text / selected option
 * @param {object} [meta]     – optional contextual meta data, e.g. { sentiment: "positive" }
 */
export const createPulseSurveyData = (
  organizationId,
  questionId,
  answer,
  meta = {},
) => ({
  organizationId,
  questionId: questionId.trim(),
  answer,
  meta,
  createdAt: new Date(),
});

/**
 * Factory – returns a new AI insight document skeleton.
 * @param {string} organizationId
 * @param {string} title         – short headline of the generated insight
 * @param {string} description   – detailed explanation / recommendation
 * @param {object} [relatedData] – references to underlying metric / survey ids that triggered insight
 */
export const createPulseInsightData = (
  organizationId,
  title,
  description,
  relatedData = {},
) => ({
  organizationId,
  title: title.trim(),
  description: description.trim(),
  relatedData,
  createdAt: new Date(),
});
