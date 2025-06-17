import { writable, derived } from "svelte/store";
import { db } from "$lib/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { COLLECTIONS, createCollaborationData, createSkillData, createProjectData } from "$lib/db/collections.js";

function createOrganizationalDNAStore() {
  const { subscribe, set, update } = writable({
    collaborations: [],
    skills: [],
    projects: [],
    loading: true,
    error: null,
    viewMode: 'hierarchy', // 'hierarchy', 'skills', 'collaboration', 'dna'
    selectedSkill: null,
    selectedCollaborationType: 'all',
    networkStrength: 3, // Minimum strength threshold for showing connections
  });

  let collaborationsUnsubscribe = null;
  let skillsUnsubscribe = null;
  let projectsUnsubscribe = null;

  return {
    subscribe,

    // Start listening for DNA data of given organizationId
    listen: (organizationId) => {
      if (!organizationId) {
        set({
          collaborations: [],
          skills: [],
          projects: [],
          loading: false,
          error: null,
          viewMode: 'hierarchy',
          selectedSkill: null,
          selectedCollaborationType: 'all',
          networkStrength: 3,
        });
        return;
      }

      update(state => ({ ...state, loading: true, error: null }));

      // Listen for collaborations
      const collaborationsQuery = query(
        collection(db, COLLECTIONS.COLLABORATIONS),
        where("organizationId", "==", organizationId)
      );
      collaborationsUnsubscribe = onSnapshot(
        collaborationsQuery,
        (snapshot) => {
          const collaborations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          update(state => ({ ...state, collaborations }));
        },
        (error) => {
          console.error("Collaborations listener error", error);
          update(state => ({ ...state, error: error.message }));
        }
      );

      // Listen for skills
      const skillsQuery = query(collection(db, COLLECTIONS.SKILLS));
      skillsUnsubscribe = onSnapshot(
        skillsQuery,
        (snapshot) => {
          const skills = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          update(state => ({ ...state, skills }));
        },
        (error) => {
          console.error("Skills listener error", error);
          update(state => ({ ...state, error: error.message }));
        }
      );

      // Listen for projects
      const projectsQuery = query(
        collection(db, COLLECTIONS.PROJECTS),
        where("organizationId", "==", organizationId)
      );
      projectsUnsubscribe = onSnapshot(
        projectsQuery,
        (snapshot) => {
          const projects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          update(state => ({ ...state, projects, loading: false }));
        },
        (error) => {
          console.error("Projects listener error", error);
          update(state => ({ ...state, error: error.message, loading: false }));
        }
      );
    },

    // Stop all listeners
    stop: () => {
      if (collaborationsUnsubscribe) collaborationsUnsubscribe();
      if (skillsUnsubscribe) skillsUnsubscribe();
      if (projectsUnsubscribe) projectsUnsubscribe();
      collaborationsUnsubscribe = null;
      skillsUnsubscribe = null;
      projectsUnsubscribe = null;
    },

    // Add or update collaboration relationship
    addCollaboration: async (organizationId, member1Id, member2Id, frequency, type, strength, projects = []) => {
      try {
        const data = createCollaborationData(organizationId, member1Id, member2Id, frequency, type, strength, projects);
        await addDoc(collection(db, COLLECTIONS.COLLABORATIONS), data);
      } catch (error) {
        console.error("Failed to add collaboration", error);
        throw error;
      }
    },

    // Update collaboration
    updateCollaboration: async (collaborationId, updates) => {
      try {
        const collaborationRef = doc(db, COLLECTIONS.COLLABORATIONS, collaborationId);
        await updateDoc(collaborationRef, {
          ...updates,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to update collaboration", error);
        throw error;
      }
    },

    // Delete collaboration
    deleteCollaboration: async (collaborationId) => {
      try {
        await deleteDoc(doc(db, COLLECTIONS.COLLABORATIONS, collaborationId));
      } catch (error) {
        console.error("Failed to delete collaboration", error);
        throw error;
      }
    },

    // Add new skill to global skills library
    addSkill: async (name, category, description = '') => {
      try {
        const data = createSkillData(name, category, description);
        await addDoc(collection(db, COLLECTIONS.SKILLS), data);
      } catch (error) {
        console.error("Failed to add skill", error);
        throw error;
      }
    },

    // Add project
    addProject: async (organizationId, name, description, memberIds = [], status = 'active', startDate = null, endDate = null) => {
      try {
        const data = createProjectData(organizationId, name, description, memberIds, status, startDate, endDate);
        await addDoc(collection(db, COLLECTIONS.PROJECTS), data);
      } catch (error) {
        console.error("Failed to add project", error);
        throw error;
      }
    },

    // Update project
    updateProject: async (projectId, updates) => {
      try {
        const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
        await updateDoc(projectRef, {
          ...updates,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to update project", error);
        throw error;
      }
    },

    // Set view mode
    setViewMode: (mode) => {
      update(state => ({ ...state, viewMode: mode }));
    },

    // Set selected skill filter
    setSelectedSkill: (skill) => {
      update(state => ({ ...state, selectedSkill: skill }));
    },

    // Set collaboration type filter
    setCollaborationType: (type) => {
      update(state => ({ ...state, selectedCollaborationType: type }));
    },

    // Set network strength threshold
    setNetworkStrength: (strength) => {
      update(state => ({ ...state, networkStrength: strength }));
    },

    // Analytics functions
    getCollaborationNetwork: (members, collaborations, strengthThreshold = 3) => {
      const network = {
        nodes: members.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          skills: member.skills || [],
          expertise: member.expertise || [],
          x: member.position?.x || 0,
          y: member.position?.y || 0,
        })),
        links: []
      };

      collaborations.forEach(collab => {
        if (collab.strength >= strengthThreshold) {
          network.links.push({
            source: collab.member1Id,
            target: collab.member2Id,
            strength: collab.strength,
            type: collab.type,
            frequency: collab.frequency,
          });
        }
      });

      return network;
    },

    getSkillsNetwork: (members, selectedSkill = null) => {
      const skillConnections = new Map();
      
      members.forEach(member => {
        const memberSkills = member.skills || [];
        if (selectedSkill) {
          // Filter to only show connections for selected skill
          const hasSkill = memberSkills.some(skill => skill.name === selectedSkill);
          if (hasSkill) {
            skillConnections.set(member.id, memberSkills);
          }
        } else {
          skillConnections.set(member.id, memberSkills);
        }
      });

      return skillConnections;
    },

    getInfluenceScore: (memberId, collaborations) => {
      const connections = collaborations.filter(c => 
        c.member1Id === memberId || c.member2Id === memberId
      );
      
      const totalStrength = connections.reduce((sum, c) => sum + c.strength, 0);
      const uniqueConnections = connections.length;
      
      return {
        totalStrength,
        uniqueConnections,
        influenceScore: totalStrength * uniqueConnections,
      };
    },

    getKnowledgeBrokers: (members, collaborations, skillsData) => {
      // Find members who bridge different skill domains or teams
      const brokers = [];
      
      members.forEach(member => {
        const memberCollabs = collaborations.filter(c => 
          c.member1Id === member.id || c.member2Id === member.id
        );
        
        const connectedSkillDomains = new Set();
        const connectedTeams = new Set();
        
        memberCollabs.forEach(collab => {
          const otherId = collab.member1Id === member.id ? collab.member2Id : collab.member1Id;
          const otherMember = members.find(m => m.id === otherId);
          
          if (otherMember) {
            connectedTeams.add(otherMember.role);
            (otherMember.skills || []).forEach(skill => {
              connectedSkillDomains.add(skill.category);
            });
          }
        });
        
        if (connectedSkillDomains.size > 2 || connectedTeams.size > 2) {
          brokers.push({
            member,
            skillDomains: Array.from(connectedSkillDomains),
            teams: Array.from(connectedTeams),
            brokerScore: connectedSkillDomains.size * connectedTeams.size,
          });
        }
      });
      
      return brokers.sort((a, b) => b.brokerScore - a.brokerScore);
    },
  };
}

export const organizationalDNAStore = createOrganizationalDNAStore();