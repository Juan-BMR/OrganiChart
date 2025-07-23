import { adminDb } from "$lib/firebase-admin.js";
import { COLLECTIONS } from "$lib/db/collections.js";

export interface GetOrgAnalysisArgs {
  organizationId: string;
}

export async function getOrgAnalysis({ organizationId }: GetOrgAnalysisArgs) {
  const membersCol = adminDb.collection(COLLECTIONS.MEMBERS);
  
  const membersQuery = await membersCol
    .where("organizationId", "==", organizationId)
    .get();

  const members = membersQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  const analysis = {
    totalMembers: members.length,
    hierarchy: analyzeHierarchy(members),
    departments: analyzeDepartments(members),
    managementSpan: analyzeManagementSpan(members),
    demographics: analyzeDemographics(members),
    suggestions: generateSuggestions(members),
  };

  return analysis;
}

function analyzeHierarchy(members: any[]) {
  const levels = new Map();
  const roots = members.filter(m => !m.managerId);
  
  function calculateLevel(member: any, level = 0): number {
    if (levels.has(member.id)) return levels.get(member.id);
    
    levels.set(member.id, level);
    const subordinates = members.filter(m => m.managerId === member.id);
    
    let maxSubLevel = level;
    subordinates.forEach(sub => {
      const subLevel = calculateLevel(sub, level + 1);
      maxSubLevel = Math.max(maxSubLevel, subLevel);
    });
    
    return maxSubLevel;
  }

  roots.forEach(root => calculateLevel(root));
  const maxDepth = Math.max(...Array.from(levels.values()));

  return {
    maxDepth,
    rootMembers: roots.length,
    levelDistribution: Array.from(levels.values()).reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
  };
}

function analyzeDepartments(members: any[]) {
  const roleGroups = members.reduce((acc, member) => {
    const role = member.role || 'Unassigned';
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(roleGroups).map(([role, memberList]) => ({
    role,
    count: memberList.length,
    members: memberList.map(m => ({ id: m.id, name: m.name })),
  }));
}

function analyzeManagementSpan(members: any[]) {
  const managers = members.filter(m => 
    members.some(sub => sub.managerId === m.id)
  );

  const spans = managers.map(manager => {
    const subordinates = members.filter(m => m.managerId === manager.id);
    return {
      managerId: manager.id,
      managerName: manager.name,
      subordinateCount: subordinates.length,
      subordinates: subordinates.map(s => ({ id: s.id, name: s.name })),
    };
  });

  const avgSpan = spans.length > 0 ? 
    spans.reduce((sum, s) => sum + s.subordinateCount, 0) / spans.length : 0;

  return {
    totalManagers: managers.length,
    averageSpan: Math.round(avgSpan * 10) / 10,
    spans,
    wideSpans: spans.filter(s => s.subordinateCount > 7),
    narrowSpans: spans.filter(s => s.subordinateCount < 3),
  };
}

function analyzeDemographics(members: any[]) {
  const withPhotos = members.filter(m => m.photoURL).length;
  const withCVs = members.filter(m => m.cvURL).length;
  const withStartDates = members.filter(m => m.startDate).length;

  return {
    completeness: {
      photos: Math.round((withPhotos / members.length) * 100),
      cvs: Math.round((withCVs / members.length) * 100),
      startDates: Math.round((withStartDates / members.length) * 100),
    },
    profileCompletion: Math.round(((withPhotos + withCVs + withStartDates) / (members.length * 3)) * 100),
  };
}

function generateSuggestions(members: any[]) {
  const suggestions = [];
  
  // Check for wide management spans
  const managers = members.filter(m => 
    members.some(sub => sub.managerId === m.id)
  );

  managers.forEach(manager => {
    const subordinateCount = members.filter(m => m.managerId === manager.id).length;
    if (subordinateCount > 8) {
      suggestions.push({
        type: 'management_span',
        severity: 'high',
        message: `${manager.name} manages ${subordinateCount} people. Consider adding middle management.`,
        affectedMembers: [manager.id],
      });
    }
  });

  // Check for orphaned members
  const orphans = members.filter(m => 
    m.managerId && !members.find(manager => manager.id === m.managerId)
  );

  if (orphans.length > 0) {
    suggestions.push({
      type: 'orphaned_members',
      severity: 'high',
      message: `${orphans.length} members have invalid manager references.`,
      affectedMembers: orphans.map(m => m.id),
    });
  }

  // Check for incomplete profiles
  const incompleteProfiles = members.filter(m => !m.photoURL || !m.email);
  if (incompleteProfiles.length > 0) {
    suggestions.push({
      type: 'incomplete_profiles',
      severity: 'medium',
      message: `${incompleteProfiles.length} members have incomplete profiles.`,
      affectedMembers: incompleteProfiles.map(m => m.id),
    });
  }

  return suggestions;
}