import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "$lib/firebase";
import { COLLECTIONS } from "$lib/db/collections";
import type { Member, Organization } from "$lib/types";

export interface OrgHealthMetrics {
  managerLoad: ManagerLoadMetric[];
  teamSizes: TeamSizeMetric[];
  diversityMetrics: DiversityMetric;
  successionRisks: SuccessionRisk[];
  turnoverRisks: TurnoverRisk[];
  overallHealth: number;
}

export interface ManagerLoadMetric {
  managerId: string;
  managerName: string;
  directReports: number;
  recommendedMax: number;
  isOverloaded: boolean;
}

export interface TeamSizeMetric {
  department: string;
  size: number;
  avgTeamSize: number;
  variance: number;
}

export interface DiversityMetric {
  overall: number;
  byDepartment: Record<string, number>;
  byLevel: Record<number, number>;
}

export interface SuccessionRisk {
  position: string;
  memberId: string;
  riskScore: number;
  potentialSuccessors: string[];
  gaps: string[];
}

export interface TurnoverRisk {
  memberId: string;
  memberName: string;
  riskScore: number;
  factors: string[];
}

export class OrganizationAnalyzer {
  private organizationId: string;
  private members: Member[] = [];

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async loadMembers(): Promise<void> {
    const membersQuery = query(
      collection(db, COLLECTIONS.MEMBERS),
      where("organizationId", "==", this.organizationId),
      where("isActive", "==", true)
    );
    
    const snapshot = await getDocs(membersQuery);
    this.members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Member));
  }

  async analyzeOrganization(): Promise<OrgHealthMetrics> {
    if (this.members.length === 0) {
      await this.loadMembers();
    }

    const managerLoad = this.analyzeManagerLoad();
    const teamSizes = this.analyzeTeamSizes();
    const diversityMetrics = this.analyzeDiversity();
    const successionRisks = this.analyzeSuccessionRisks();
    const turnoverRisks = this.analyzeTurnoverRisks();
    const overallHealth = this.calculateOverallHealth({
      managerLoad,
      teamSizes,
      diversityMetrics,
      successionRisks,
      turnoverRisks
    });

    return {
      managerLoad,
      teamSizes,
      diversityMetrics,
      successionRisks,
      turnoverRisks,
      overallHealth
    };
  }

  private analyzeManagerLoad(): ManagerLoadMetric[] {
    const managerMap = new Map<string, Member[]>();
    
    // Group members by manager
    this.members.forEach(member => {
      if (member.managerId) {
        if (!managerMap.has(member.managerId)) {
          managerMap.set(member.managerId, []);
        }
        managerMap.get(member.managerId)!.push(member);
      }
    });

    // Calculate load for each manager
    return Array.from(managerMap.entries()).map(([managerId, reports]) => {
      const manager = this.members.find(m => m.id === managerId);
      return {
        managerId,
        managerName: manager?.name || "Unknown",
        directReports: reports.length,
        recommendedMax: 8,
        isOverloaded: reports.length > 8
      };
    });
  }

  private analyzeTeamSizes(): TeamSizeMetric[] {
    const departmentMap = new Map<string, Member[]>();
    
    // Group by department (using role as proxy for now)
    this.members.forEach(member => {
      const dept = this.extractDepartment(member.role);
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, []);
      }
      departmentMap.get(dept)!.push(member);
    });

    const sizes = Array.from(departmentMap.values()).map(team => team.length);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;

    return Array.from(departmentMap.entries()).map(([dept, members]) => ({
      department: dept,
      size: members.length,
      avgTeamSize: avgSize,
      variance: Math.abs(members.length - avgSize) / avgSize
    }));
  }

  private analyzeDiversity(): DiversityMetric {
    // Simplified diversity analysis based on name patterns
    // In production, this would use actual demographic data
    const byDepartment: Record<string, number> = {};
    const byLevel: Record<number, number> = {};
    
    const departmentGroups = new Map<string, Set<string>>();
    const levelGroups = new Map<number, Set<string>>();

    this.members.forEach(member => {
      const dept = this.extractDepartment(member.role);
      const namePattern = member.name.substring(0, 1).toLowerCase();
      
      if (!departmentGroups.has(dept)) {
        departmentGroups.set(dept, new Set());
      }
      departmentGroups.get(dept)!.add(namePattern);

      if (!levelGroups.has(member.level || 0)) {
        levelGroups.set(member.level || 0, new Set());
      }
      levelGroups.get(member.level || 0)!.add(namePattern);
    });

    // Calculate diversity scores
    departmentGroups.forEach((patterns, dept) => {
      byDepartment[dept] = patterns.size / 26; // Simplified metric
    });

    levelGroups.forEach((patterns, level) => {
      byLevel[level] = patterns.size / 26;
    });

    const overall = Object.values(byDepartment).reduce((a, b) => a + b, 0) / 
                   Object.values(byDepartment).length;

    return { overall, byDepartment, byLevel };
  }

  private analyzeSuccessionRisks(): SuccessionRisk[] {
    const risks: SuccessionRisk[] = [];
    const managers = this.members.filter(m => 
      this.members.some(other => other.managerId === m.id)
    );

    managers.forEach(manager => {
      const directReports = this.members.filter(m => m.managerId === manager.id);
      const potentialSuccessors = directReports.filter(m => 
        this.calculateSuccessionReadiness(m) > 0.6
      );

      const riskScore = potentialSuccessors.length === 0 ? 0.9 :
                       potentialSuccessors.length === 1 ? 0.6 :
                       0.3;

      risks.push({
        position: manager.role,
        memberId: manager.id!,
        riskScore,
        potentialSuccessors: potentialSuccessors.map(s => s.id!),
        gaps: this.identifySuccessionGaps(manager, potentialSuccessors)
      });
    });

    return risks;
  }

  private analyzeTurnoverRisks(): TurnoverRisk[] {
    // Simplified turnover risk based on tenure and position
    return this.members.map(member => {
      const factors: string[] = [];
      let riskScore = 0.3; // Base risk

      // New employee risk
      const tenure = this.calculateTenure(member.startDate);
      if (tenure < 0.5) {
        factors.push("New employee (< 6 months)");
        riskScore += 0.2;
      }

      // High performer risk
      if (member.role.toLowerCase().includes("senior") || 
          member.role.toLowerCase().includes("lead")) {
        factors.push("Key position");
        riskScore += 0.1;
      }

      // Manager overload risk
      if (member.managerId) {
        const managerLoad = this.members.filter(m => 
          m.managerId === member.managerId
        ).length;
        if (managerLoad > 8) {
          factors.push("Manager overloaded");
          riskScore += 0.15;
        }
      }

      return {
        memberId: member.id!,
        memberName: member.name,
        riskScore: Math.min(riskScore, 1),
        factors
      };
    }).filter(risk => risk.riskScore > 0.5);
  }

  private calculateOverallHealth(metrics: Omit<OrgHealthMetrics, 'overallHealth'>): number {
    let score = 100;

    // Deduct for overloaded managers
    const overloadedManagers = metrics.managerLoad.filter(m => m.isOverloaded).length;
    score -= overloadedManagers * 5;

    // Deduct for high succession risks
    const highSuccessionRisks = metrics.successionRisks.filter(r => r.riskScore > 0.7).length;
    score -= highSuccessionRisks * 8;

    // Deduct for high turnover risks
    const highTurnoverRisks = metrics.turnoverRisks.filter(r => r.riskScore > 0.7).length;
    score -= highTurnoverRisks * 3;

    // Bonus for good diversity
    if (metrics.diversityMetrics.overall > 0.4) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private extractDepartment(role: string): string {
    // Simple department extraction from role
    if (role.toLowerCase().includes("engineering")) return "Engineering";
    if (role.toLowerCase().includes("sales")) return "Sales";
    if (role.toLowerCase().includes("marketing")) return "Marketing";
    if (role.toLowerCase().includes("hr") || role.toLowerCase().includes("human")) return "HR";
    if (role.toLowerCase().includes("finance")) return "Finance";
    return "General";
  }

  private calculateTenure(startDate: Date | Timestamp | null): number {
    if (!startDate) return 0;
    const start = startDate instanceof Timestamp ? startDate.toDate() : startDate;
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }

  private calculateSuccessionReadiness(member: Member): number {
    let score = 0.5; // Base score
    
    // Tenure bonus
    const tenure = this.calculateTenure(member.startDate);
    if (tenure > 2) score += 0.2;
    if (tenure > 5) score += 0.1;

    // Role seniority bonus
    if (member.role.toLowerCase().includes("senior")) score += 0.2;
    if (member.role.toLowerCase().includes("lead")) score += 0.1;

    return Math.min(score, 1);
  }

  private identifySuccessionGaps(manager: Member, successors: Member[]): string[] {
    const gaps: string[] = [];
    
    if (successors.length === 0) {
      gaps.push("No identified successors");
    } else if (successors.length === 1) {
      gaps.push("Single point of failure - only one successor");
    }

    // Check for experience gaps
    const avgSuccessorTenure = successors.reduce((sum, s) => 
      sum + this.calculateTenure(s.startDate), 0
    ) / (successors.length || 1);

    if (avgSuccessorTenure < 2) {
      gaps.push("Successors lack experience (< 2 years average)");
    }

    return gaps;
  }
}