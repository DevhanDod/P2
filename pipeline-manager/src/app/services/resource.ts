import { Injectable } from '@angular/core';

export type ResourceStatus = 'unknown' | 'running' | 'stopped';

export interface VirtualMachine {
  name: string;
  type: string;
  status: ResourceStatus;
}

export interface Cluster {
  name: string;
  status: ResourceStatus;
}

export interface Environment {
  name: string;
  vms: VirtualMachine[];
  cluster: Cluster;
}

export interface CommonVariables {
  customerCode: string;
  customerId: string;
  customerName: string;
  snow: string;
  region: string;
}

export interface ResourceFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const AVAILABLE_FEATURES: ResourceFeature[] = [
  { id: 'env_uat', name: 'env_UAT', description: 'User Acceptance Testing environment', enabled: false },
  { id: 'env_cfg', name: 'env_CFG', description: 'Configuration environment', enabled: false },
  { id: 'env_prd', name: 'env_PRD', description: 'Production environment', enabled: false },
  { id: 'oi', name: 'OI', description: 'Operational Intelligence', enabled: false },
  { id: 'pso', name: 'PSO', description: 'Planning & Scheduling Optimization', enabled: false },
  { id: 'ha', name: 'HA', description: 'High Availability', enabled: false },
  { id: 'dr', name: 'DR', description: 'Disaster Recovery', enabled: false },
  { id: 'pso_standalone', name: 'PSO_Stand_alone', description: 'PSO Standalone deployment', enabled: false },
];

export interface Resource {
  id: string;
  customerCode: string;
  createdAt: Date;
  status: ResourceStatus;
  environment: Environment;
  commonVars: CommonVariables;
  enabledFeatures: ResourceFeature[];
}

export interface SharedMember {
  email: string;
  role: 'viewer' | 'editor';
  addedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private resources: Resource[] = [];
  private sharedMembersMap: Map<string, SharedMember[]> = new Map();

  getResources(): Resource[] {
    return this.resources;
  }

  getResourceById(id: string): Resource | undefined {
    return this.resources.find((r) => r.id === id);
  }

  createResource(customerCode: string): Resource {
    const code = customerCode.toLowerCase();
    const resource: Resource = {
      id: Date.now().toString(),
      customerCode,
      createdAt: new Date(),
      status: 'unknown',
      commonVars: { customerCode, customerId: '', customerName: '', snow: '', region: '' },
      environment: {
        name: 'uat',
        cluster: { name: `${code}_p`, status: 'unknown' },
        vms: [
          { name: `${code}_uat_ao1`, type: 'App Object Server', status: 'unknown' },
          { name: `${code}_uat_db1`, type: 'Database Server', status: 'unknown' },
        ],
      },
      enabledFeatures: [],
    };
    this.resources.push(resource);
    return resource;
  }

  updateStatus(id: string, status: ResourceStatus, target: 'all' | 'cluster' | 'vms') {
    const resource = this.getResourceById(id);
    if (!resource) return;

    if (target === 'all') {
      resource.status = status;
      resource.environment.cluster.status = status;
      resource.environment.vms.forEach((vm) => (vm.status = status));
    } else if (target === 'cluster') {
      resource.environment.cluster.status = status;
    } else if (target === 'vms') {
      resource.environment.vms.forEach((vm) => (vm.status = status));
    }
  }

  updateFeatures(id: string, features: ResourceFeature[]) {
    const resource = this.getResourceById(id);
    if (resource) {
      resource.enabledFeatures = features;
    }
  }

  removeResource(id: string) {
    this.resources = this.resources.filter((r) => r.id !== id);
  }

  getStatusLabel(status: ResourceStatus): string {
    switch (status) {
      case 'running': return 'Running';
      case 'stopped': return 'Stopped';
      default: return 'Unknown';
    }
  }

  getSharedMembers(resourceId: string): SharedMember[] {
    return [...(this.sharedMembersMap.get(resourceId) || [])];
  }

  setSharedMembers(resourceId: string, members: SharedMember[]) {
    this.sharedMembersMap.set(resourceId, [...members]);
  }

  getSharedCount(resourceId: string): number {
    return this.sharedMembersMap.get(resourceId)?.length || 0;
  }
}
