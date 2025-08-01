// Collection names and helper functions for Firestore
export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  MEMBERS: "members",
  ORGANIZATION_PERMISSIONS: "organization_permissions",
  RULES: "rules",
  // AI Insights collections
  INSIGHTS_CONFIG: "insights_config",
  INSIGHTS_HISTORY: "insights_history",
  INSIGHTS_ALERTS: "insights_alerts",
  ML_MODELS: "ml_models",
  INSIGHT_SUBSCRIPTIONS: "insight_subscriptions",
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
  cvURL: null, // CV/Resume file URL
  cvFileName: null, // Original CV file name
  cvUploadedAt: null, // When CV was uploaded
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

export const createRuleData = (
  organizationId,
  name,
  enabled,
  priority,
  conditions,
  styles,
) => ({
  organizationId,
  name: name.trim(),
  enabled: Boolean(enabled),
  priority: Number(priority),
  conditions: conditions || [],
  styles: styles || {},
  createdAt: new Date(),
  updatedAt: new Date(),
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

// Insights data creation functions
export const createInsightsConfigData = (organizationId, userId, config = {}) => ({
  organizationId,
  userId,
  alertThresholds: {
    managerOverload: config.managerOverload || 8, // Max direct reports
    successionRisk: config.successionRisk || 0.7, // Risk score threshold
    turnoverRisk: config.turnoverRisk || 0.6, // Turnover probability threshold
    diversityTarget: config.diversityTarget || 0.4, // Min diversity ratio
  },
  enabledMetrics: config.enabledMetrics || [
    "teamHealth",
    "successionRisk",
    "diversityMetrics",
    "managerLoad",
    "turnoverRisk",
  ],
  notificationPreferences: config.notificationPreferences || {
    email: true,
    inApp: true,
    frequency: "daily", // daily, weekly, immediate
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createInsightHistoryData = (
  organizationId,
  insightType,
  data,
  prediction = null,
) => ({
  organizationId,
  insightType, // teamHealth, succession, turnover, etc.
  timestamp: new Date(),
  data: data, // Actual metrics/values
  prediction: prediction, // AI predictions if any
  accuracy: null, // To be updated later with actual vs predicted
  metadata: {
    memberCount: data.memberCount || 0,
    departmentCount: data.departmentCount || 0,
  },
});

export const createInsightAlertData = (
  organizationId,
  alertType,
  severity,
  message,
  affectedMembers = [],
  recommendations = [],
) => ({
  organizationId,
  alertType, // managerOverload, successionGap, turnoverRisk, etc.
  severity, // low, medium, high, critical
  message,
  affectedMembers, // Array of member IDs
  recommendations, // AI-generated recommendations
  status: "active", // active, acknowledged, resolved
  createdAt: new Date(),
  acknowledgedAt: null,
  resolvedAt: null,
});

export const createMLModelData = (modelType, version, metrics) => ({
  modelType, // turnoverPrediction, successionPlanning, etc.
  version,
  trainedAt: new Date(),
  metrics: {
    accuracy: metrics.accuracy || 0,
    precision: metrics.precision || 0,
    recall: metrics.recall || 0,
    f1Score: metrics.f1Score || 0,
  },
  parameters: metrics.parameters || {},
  isActive: true,
  createdAt: new Date(),
});

export const createInsightSubscriptionData = (
  organizationId,
  userId,
  subscriptionType,
  filters = {},
) => ({
  organizationId,
  userId,
  subscriptionType, // alerts, reports, predictions
  filters: {
    departments: filters.departments || [],
    metrics: filters.metrics || [],
    severity: filters.severity || ["high", "critical"],
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
