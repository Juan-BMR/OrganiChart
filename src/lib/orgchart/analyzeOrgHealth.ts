// Member interface based on the store structure
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  managerId: string | null;
  organizationId: string;
  photoURL?: string | null;
  cvURL?: string | null;
  cvFileName?: string | null;
  position?: { x: number; y: number };
  startDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHealthMetrics {
  totalMembers: number;
  maxDepth: number;
  averageSpanOfControl: number;
  managersWithIssues: ManagerIssue[];
  orphanedMembers: Member[];
  teamDistribution: TeamDistribution[];
  communicationRisk: CommunicationRisk[];
  successionGaps: SuccessionGap[];
}

export interface ManagerIssue {
  manager: Member;
  directReports: number;
  issue: "too_many" | "too_few" | "none";
  recommendation: string;
}

export interface TeamDistribution {
  level: number;
  count: number;
  percentage: number;
}

export interface CommunicationRisk {
  member: Member;
  riskLevel: "high" | "medium" | "low";
  reason: string;
}

export interface SuccessionGap {
  position: Member;
  hasSuccessor: boolean;
  risk: "critical" | "high" | "medium" | "low";
}

export function analyzeOrgHealth(members: Member[]): OrgHealthMetrics {
  const memberMap = new Map(members.map(m => [m.id, m]));
  
  // Build hierarchy
  const hierarchy = buildHierarchy(members, memberMap);
  
  // Calculate metrics
  const maxDepth = calculateMaxDepth(hierarchy);
  const spanOfControl = analyzeSpanOfControl(members, memberMap);
  const orphaned = findOrphanedMembers(members, memberMap);
  const distribution = calculateTeamDistribution(hierarchy, members.length);
  const commRisks = identifyCommunicationRisks(members, memberMap, hierarchy);
  const succession = analyzeSuccessionPlanning(members, memberMap);
  
  return {
    totalMembers: members.length,
    maxDepth,
    averageSpanOfControl: spanOfControl.average,
    managersWithIssues: spanOfControl.issues,
    orphanedMembers: orphaned,
    teamDistribution: distribution,
    communicationRisk: commRisks,
    successionGaps: succession
  };
}

function buildHierarchy(members: Member[], memberMap: Map<string, Member>) {
  const hierarchy = new Map<string, { member: Member; children: string[]; level: number }>();
  const roots: string[] = [];
  
  // Initialize hierarchy
  members.forEach(m => {
    hierarchy.set(m.id, { member: m, children: [], level: 0 });
    if (!m.managerId) {
      roots.push(m.id);
    }
  });
  
  // Build parent-child relationships
  members.forEach(m => {
    if (m.managerId && hierarchy.has(m.managerId)) {
      hierarchy.get(m.managerId)!.children.push(m.id);
    }
  });
  
  // Calculate levels
  function setLevels(id: string, level: number) {
    const node = hierarchy.get(id);
    if (node) {
      node.level = level;
      node.children.forEach(childId => setLevels(childId, level + 1));
    }
  }
  
  roots.forEach(rootId => setLevels(rootId, 0));
  
  return hierarchy;
}

function calculateMaxDepth(hierarchy: Map<string, any>): number {
  let maxDepth = 0;
  hierarchy.forEach(node => {
    maxDepth = Math.max(maxDepth, node.level);
  });
  return maxDepth + 1; // Convert from 0-indexed to 1-indexed
}

function analyzeSpanOfControl(members: Member[], memberMap: Map<string, Member>) {
  const managerReports = new Map<string, number>();
  
  // Count direct reports for each manager
  members.forEach(m => {
    if (m.managerId) {
      managerReports.set(m.managerId, (managerReports.get(m.managerId) || 0) + 1);
    }
  });
  
  const issues: ManagerIssue[] = [];
  let totalSpan = 0;
  let managerCount = 0;
  
  managerReports.forEach((count, managerId) => {
    const manager = memberMap.get(managerId);
    if (!manager) return;
    
    totalSpan += count;
    managerCount++;
    
    if (count > 7) {
      issues.push({
        manager,
        directReports: count,
        issue: "too_many",
        recommendation: `Consider restructuring - ${manager.name} has ${count} direct reports (recommended: 5-7)`
      });
    } else if (count === 1) {
      issues.push({
        manager,
        directReports: count,
        issue: "too_few",
        recommendation: `${manager.name} has only 1 direct report - consider consolidation`
      });
    }
  });
  
  // Check for managers with no reports (leaf managers)
  members.forEach(m => {
    if (m.role?.toLowerCase().includes("manager") && !managerReports.has(m.id)) {
      issues.push({
        manager: m,
        directReports: 0,
        issue: "none",
        recommendation: `${m.name} has "Manager" in title but no direct reports`
      });
    }
  });
  
  return {
    average: managerCount > 0 ? totalSpan / managerCount : 0,
    issues
  };
}

function findOrphanedMembers(members: Member[], memberMap: Map<string, Member>): Member[] {
  return members.filter(m => {
    if (m.managerId && !memberMap.has(m.managerId)) {
      return true;
    }
    return false;
  });
}

function calculateTeamDistribution(hierarchy: Map<string, any>, total: number): TeamDistribution[] {
  const levelCounts = new Map<number, number>();
  
  hierarchy.forEach(node => {
    levelCounts.set(node.level, (levelCounts.get(node.level) || 0) + 1);
  });
  
  const distribution: TeamDistribution[] = [];
  levelCounts.forEach((count, level) => {
    distribution.push({
      level,
      count,
      percentage: (count / total) * 100
    });
  });
  
  return distribution.sort((a, b) => a.level - b.level);
}

function identifyCommunicationRisks(
  members: Member[],
  memberMap: Map<string, Member>,
  hierarchy: Map<string, any>
): CommunicationRisk[] {
  const risks: CommunicationRisk[] = [];
  
  hierarchy.forEach((node, memberId) => {
    const member = memberMap.get(memberId);
    if (!member) return;
    
    // High risk: Deep in hierarchy (> 4 levels)
    if (node.level > 4) {
      risks.push({
        member,
        riskLevel: "high",
        reason: `${node.level + 1} levels from top - information may be distorted`
      });
    }
    
    // Medium risk: Cross-functional role with many stakeholders
    if (member.role?.toLowerCase().includes("cross") || 
        member.role?.toLowerCase().includes("liaison")) {
      risks.push({
        member,
        riskLevel: "medium",
        reason: "Cross-functional role may face communication challenges"
      });
    }
  });
  
  return risks;
}

function analyzeSuccessionPlanning(members: Member[], memberMap: Map<string, Member>): SuccessionGap[] {
  const gaps: SuccessionGap[] = [];
  const criticalRoles = ["CEO", "CTO", "CFO", "COO", "VP", "Director"];
  
  members.forEach(member => {
    const isCritical = criticalRoles.some(role => 
      member.role?.toUpperCase().includes(role)
    );
    
    if (isCritical) {
      // Check if there's a potential successor (simplified check)
      const potentialSuccessors = members.filter(m => 
        m.managerId === member.id && 
        (m.role?.toLowerCase().includes("deputy") || 
         m.role?.toLowerCase().includes("assistant") ||
         m.role?.toLowerCase().includes("senior"))
      );
      
      gaps.push({
        position: member,
        hasSuccessor: potentialSuccessors.length > 0,
        risk: potentialSuccessors.length > 0 ? "low" : 
              member.role?.toUpperCase().includes("CEO") ? "critical" : "high"
      });
    }
  });
  
  return gaps;
}