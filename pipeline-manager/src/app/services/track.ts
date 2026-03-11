import { Injectable } from '@angular/core';
import { CommonVariables, ResourceFeature, ResourceStatus, Environment } from './resource';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
}

export interface Collaborator {
  email: string;
  addedAt: Date;
}

export interface TrackVersion {
  id: string;
  name: string;
  customerCode: string;
  features: Pipeline[];
  status: ResourceStatus;
  commonVars: CommonVariables;
  enabledFeatures: ResourceFeature[];
  environment: Environment;
}

export interface Track {
  id: string;
  name: string;
  createdAt: Date;
  versions: TrackVersion[];
  collaborators: Collaborator[];
}

function createDefaultEnvironment(code: string): Environment {
  return {
    name: 'uat',
    cluster: { name: code ? `${code}_p` : '', status: 'unknown' },
    vms: code ? [
      { name: `${code}_uat_ao1`, type: 'App Object Server', status: 'unknown' },
      { name: `${code}_uat_db1`, type: 'Database Server', status: 'unknown' },
    ] : [],
  };
}

function createDefaultCommonVars(customerCode: string): CommonVariables {
  return { customerCode, customerId: '', customerName: '', snow: '', region: '' };
}

@Injectable({
  providedIn: 'root',
})
export class TrackService {
  private tracks: Track[] = [
    {
      id: 'jan-su',
      name: 'JAN SU',
      createdAt: new Date('2026-01-15'),
      collaborators: [],
      versions: [
        {
          id: 'v1', name: 'Track 01', customerCode: 'c3lo',
          features: [],
          status: 'running',
          commonVars: {
            customerCode: 'c3lo',
            customerId: '1223',
            customerName: 'IFS',
            snow: 'SN1223',
            region: 'japaneast',
          },
          enabledFeatures: [
            { id: 'env_uat', name: 'env_UAT', description: 'User Acceptance Testing environment', enabled: true },
            { id: 'env_prd', name: 'env_PRD', description: 'Production environment', enabled: true },
            { id: 'oi', name: 'OI', description: 'Operational Intelligence', enabled: true },
            { id: 'ha', name: 'HA', description: 'High Availability', enabled: true },
          ],
          environment: {
            name: 'uat',
            cluster: { name: 'c3lo_p', status: 'running' },
            vms: [
              { name: 'c3lo_uat_ao1', type: 'App Object Server', status: 'running' },
              { name: 'c3lo_uat_db1', type: 'Database Server', status: 'running' },
            ],
          },
        },
        {
          id: 'v2', name: 'Track 02', customerCode: '', features: [],
          status: 'unknown', commonVars: createDefaultCommonVars(''), enabledFeatures: [], environment: createDefaultEnvironment(''),
        },
      ],
    },
    {
      id: 'feb-su',
      name: 'FEB SU',
      createdAt: new Date('2026-02-01'),
      collaborators: [],
      versions: [
        {
          id: 'v1', name: 'Track 01', customerCode: '', features: [],
          status: 'unknown', commonVars: createDefaultCommonVars(''), enabledFeatures: [], environment: createDefaultEnvironment(''),
        },
      ],
    },
  ];

  getTracks(): Track[] {
    return this.tracks;
  }

  getTrackById(id: string): Track | undefined {
    return this.tracks.find((t) => t.id === id);
  }

  getVersionById(trackId: string, versionId: string): TrackVersion | undefined {
    const track = this.getTrackById(trackId);
    return track?.versions.find((v) => v.id === versionId);
  }

  createTrack(name: string, numberOfVersions: number): Track {
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const versions: TrackVersion[] = [];

    for (let i = 1; i <= numberOfVersions; i++) {
      versions.push({
        id: `v${i}`,
        name: `Track ${String(i).padStart(2, '0')}`,
        customerCode: '',
        features: [],
        status: 'unknown',
        commonVars: createDefaultCommonVars(''),
        enabledFeatures: [],
        environment: createDefaultEnvironment(''),
      });
    }

    const track: Track = { id, name, createdAt: new Date(), versions, collaborators: [] };
    this.tracks.push(track);
    return track;
  }

  updateVersionName(trackId: string, versionId: string, newName: string): void {
    const version = this.getVersionById(trackId, versionId);
    if (version) version.name = newName;
  }

  updateVersionCustomerCode(trackId: string, versionId: string, code: string): void {
    const version = this.getVersionById(trackId, versionId);
    if (!version) return;
    version.customerCode = code;
    const lc = code.toLowerCase();
    version.commonVars.customerCode = code;
    version.environment = createDefaultEnvironment(lc);
  }

  addCollaborator(trackId: string, email: string): void {
    const track = this.getTrackById(trackId);
    if (!track) return;
    if (track.collaborators.some((c) => c.email === email)) return;
    track.collaborators.push({ email, addedAt: new Date() });
  }

  removeCollaborator(trackId: string, email: string): void {
    const track = this.getTrackById(trackId);
    if (!track) return;
    track.collaborators = track.collaborators.filter((c) => c.email !== email);
  }

  addFeaturesToVersion(trackId: string, versionId: string, pipelines: Pipeline[]): void {
    const version = this.getVersionById(trackId, versionId);
    if (!version) return;
    pipelines.forEach((p) => {
      if (!version.features.find((f) => f.id === p.id)) {
        version.features.push({ ...p });
      }
    });
  }

  removeFeatureFromVersion(trackId: string, versionId: string, pipelineId: string): void {
    const version = this.getVersionById(trackId, versionId);
    if (version) {
      version.features = version.features.filter((f) => f.id !== pipelineId);
    }
  }
}
