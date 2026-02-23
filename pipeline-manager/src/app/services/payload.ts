import { Injectable } from '@angular/core';

export interface PayloadVariable {
  key: string;
  value: string;
  commented: boolean;
}

export interface PipelinePayload {
  id: string;
  name: string;
  description: string;
  token: string;
  ref: string;
  variables: PayloadVariable[];
  isDefault: boolean;
  triggerUrl: string;
}

const DEFAULT_VARS: PayloadVariable[] = [
  { key: 'TF_VAR_azure_subscription_id', value: '25bfa5c3-1ebe-42af-b986-9572d0c75fd8', commented: false },
  { key: 'TF_VAR_azure_subscription_id', value: '5798509e-04d0-473b-b004-de10150cf854', commented: true },
  { key: 'TF_VAR_customer_code', value: 'c3lp', commented: false },
  { key: 'custurl', value: 'ifsrndc3lp', commented: false },
  { key: 'TF_VAR_obfuscated_place_id', value: 'dabc3lp', commented: false },
  { key: 'TF_VAR_App_EnvSiz', value: 'M', commented: false },
  { key: 'TF_VAR_AppsDBSiz', value: 'STD', commented: false },
  { key: 'placetype', value: 'u', commented: false },
  { key: 'placenum', value: '1', commented: false },
];

@Injectable({
  providedIn: 'root',
})
export class PayloadService {
  private pipelines: PipelinePayload[] = [
    { id: 'cld_aks', name: 'cld_aks', description: 'AKS cluster provisioning pipeline', token: '', ref: 'master', triggerUrl: 'https://gitlab.com/api/v4/projects/12345/trigger/pipeline', isDefault: true, variables: DEFAULT_VARS.map((v) => ({ ...v })) },
    { id: 'cld_env', name: 'cld_env', description: 'Cloud environment setup pipeline', token: '', ref: 'master', triggerUrl: 'https://gitlab.com/api/v4/projects/12346/trigger/pipeline', isDefault: true, variables: DEFAULT_VARS.map((v) => ({ ...v })) },
    { id: 'cld_delivery', name: 'cld_delivery', description: 'Cloud delivery and deployment pipeline', token: '', ref: 'master', triggerUrl: 'https://gitlab.com/api/v4/projects/12347/trigger/pipeline', isDefault: true, variables: DEFAULT_VARS.map((v) => ({ ...v })) },
    { id: 'env_cloning', name: 'env_cloning', description: 'Environment cloning pipeline', token: '', ref: 'master', triggerUrl: 'https://gitlab.com/api/v4/projects/12348/trigger/pipeline', isDefault: true, variables: DEFAULT_VARS.map((v) => ({ ...v })) },
    { id: 'cld_reconfigure', name: 'cld_reconfigure', description: 'Cloud reconfiguration pipeline', token: '', ref: 'master', triggerUrl: 'https://gitlab.com/api/v4/projects/12349/trigger/pipeline', isDefault: true, variables: DEFAULT_VARS.map((v) => ({ ...v })) },
  ];

  getPipelines(): PipelinePayload[] {
    return this.pipelines;
  }

  getPipelineById(id: string): PipelinePayload | undefined {
    return this.pipelines.find((p) => p.id === id);
  }

  updatePipeline(pipeline: PipelinePayload): PipelinePayload {
    const idx = this.pipelines.findIndex((p) => p.id === pipeline.id);
    if (idx >= 0) {
      this.pipelines[idx] = { ...pipeline };
    }
    return this.pipelines[idx];
  }

  addPipeline(name: string, description: string): PipelinePayload {
    const pipeline: PipelinePayload = {
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name,
      description,
      token: '',
      ref: 'master',
      triggerUrl: '',
      isDefault: false,
      variables: [],
    };
    this.pipelines.push(pipeline);
    return pipeline;
  }

  hasToken(pipeline: PipelinePayload): boolean {
    return (pipeline.token ?? '').trim().length > 0;
  }

  formatPayloadPreview(pipeline: PipelinePayload): string {
    const lines: string[] = [];
    lines.push(`token:${pipeline.token || '{{  }}'}`);
    lines.push(`ref:${pipeline.ref}`);
    pipeline.variables.forEach((v) => {
      const prefix = v.commented ? '//' : '';
      lines.push(`${prefix}variables[${v.key}]:${v.value}`);
    });
    return lines.join('\n');
  }
}
