import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TrackService, Track, TrackVersion } from '../../services/track';
import { ResourceStatus, ResourceFeature, AVAILABLE_FEATURES } from '../../services/resource';
import { PayloadService, PipelinePayload } from '../../services/payload';

export type ScheduleMode = 'time' | 'chain';
export type TriggerStatus = 'pending' | 'triggering' | 'triggered' | 'failed';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking' | 'unknown';

export interface SelectedPipeline {
  pipeline: PipelinePayload;
  order: number;
  chainCondition: 'success' | 'failure' | 'any';
  scheduledTime: string;
  triggerStatus: TriggerStatus;
  pipelineUrl: string;
}

export interface HealthCheckItem {
  category: string;
  name: string;
  status: HealthStatus;
  detail: string;
}

export interface HealthCheckRun {
  id: string;
  triggeredBy: string;
  timestamp: Date;
  overallStatus: HealthStatus;
  items: HealthCheckItem[];
}

export type JobStatus = 'passed' | 'failed' | 'running' | 'pending' | 'skipped';

export interface PipelineJob {
  id: string;
  name: string;
  status: JobStatus;
  duration: string;
  isDownstreamTrigger?: boolean;
  downstreamId?: string;
  log: string;
}

export interface PipelineStage {
  name: string;
  jobs: PipelineJob[];
}

export interface DownstreamPipeline {
  id: string;
  name: string;
  url: string;
  status: JobStatus;
  triggeredByJobId: string;
  stages: PipelineStage[];
}

export interface PipelineDetailData {
  pipelineUrl: string;
  pipelineName: string;
  status: JobStatus;
  stages: PipelineStage[];
  downstream: DownstreamPipeline[];
}

@Component({
  selector: 'app-track-version-detail',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './track-version-detail.html',
  styleUrl: './track-version-detail.scss',
})
export class TrackVersionDetail implements OnInit {
  track: Track | undefined;
  version: TrackVersion | undefined;
  availablePipelines: PipelinePayload[] = [];
  selectedPipelines: SelectedPipeline[] = [];

  showScheduleModal = false;
  scheduleMode: ScheduleMode = 'chain';
  isAksSelected = false;
  expandedPipelineId: string | null = null;
  editingPipelineId: string | null = null;
  editPayload: PipelinePayload | null = null;

  showFeaturesModal = false;
  featureSelections: { feature: ResourceFeature; selected: boolean }[] = [];

  showHealthCheckModal = false;
  healthCheckRuns: HealthCheckRun[] = [];
  isRunningHealthCheck = false;
  activeHealthRunId: string | null = null;

  showDeleteModal = false;
  showPinModal = false;
  deleteSelections: { feature: ResourceFeature; selected: boolean }[] = [];
  securityPin = '';
  pinError = false;
  deleteMode: 'selected' | 'all' = 'selected';

  showPipelineDetailModal = false;
  pipelineDetailData: PipelineDetailData | null = null;
  selectedJob: PipelineJob | null = null;
  showDetailPayload = false;
  detailPipeline: SelectedPipeline | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackService: TrackService,
    private payloadService: PayloadService,
  ) {}

  ngOnInit() {
    const trackId = this.route.snapshot.paramMap.get('trackId');
    const versionId = this.route.snapshot.paramMap.get('versionId');
    if (!trackId || !versionId) {
      this.router.navigate(['/service-update']);
      return;
    }

    this.track = this.trackService.getTrackById(trackId);
    this.version = this.trackService.getVersionById(trackId, versionId);
    if (!this.track || !this.version) {
      this.router.navigate(['/service-update']);
      return;
    }

    this.availablePipelines = this.payloadService.getPipelines();

    if (trackId === 'jan-su' && versionId === 'v1') {
      this.setupDemoData();
    }
  }

  private setupDemoData() {
    const aksP = this.payloadService.getPipelineById('cld_aks');
    const deliveryP = this.payloadService.getPipelineById('cld_delivery');
    const cloningP = this.payloadService.getPipelineById('env_cloning');

    if (aksP) {
      this.selectedPipelines.push({
        pipeline: aksP,
        order: 1,
        chainCondition: 'success',
        scheduledTime: '',
        triggerStatus: 'triggered',
        pipelineUrl: 'https://gitlab.com/api/v4/projects/12345/pipelines/58321',
      });
      this.isAksSelected = true;
    }

    if (deliveryP) {
      this.selectedPipelines.push({
        pipeline: deliveryP,
        order: 2,
        chainCondition: 'success',
        scheduledTime: '',
        triggerStatus: 'triggering',
        pipelineUrl: '',
      });
    }

    if (cloningP) {
      this.selectedPipelines.push({
        pipeline: cloningP,
        order: 3,
        chainCondition: 'success',
        scheduledTime: '',
        triggerStatus: 'pending',
        pipelineUrl: '',
      });
    }
  }

  goBack() {
    if (this.track) {
      this.router.navigate(['/service-update', this.track.id]);
    } else {
      this.router.navigate(['/service-update']);
    }
  }

  getStatusClass(): string {
    return this.version?.status ?? 'unknown';
  }

  getStatusLabel(status?: ResourceStatus): string {
    switch (status ?? this.version?.status ?? 'unknown') {
      case 'running': return 'Running';
      case 'stopped': return 'Stopped';
      default: return 'Unknown';
    }
  }

  private setAllStatuses(status: ResourceStatus) {
    if (!this.version) return;
    this.version.status = status;
    this.version.environment.cluster.status = status;
    this.version.environment.vms.forEach((vm) => (vm.status = status));
  }

  startResources() { this.setAllStatuses('running'); }
  stopResources() { this.setAllStatuses('stopped'); }

  restartResources() {
    this.setAllStatuses('stopped');
    setTimeout(() => this.setAllStatuses('running'), 600);
  }

  startCluster() {
    if (!this.version) return;
    this.version.environment.cluster.status = 'running';
    this.updateOverallStatus();
  }

  startVMs() {
    if (!this.version) return;
    this.version.environment.vms.forEach((vm) => (vm.status = 'running'));
    this.updateOverallStatus();
  }

  private updateOverallStatus() {
    if (!this.version) return;
    const allStatuses = [
      this.version.environment.cluster.status,
      ...this.version.environment.vms.map((vm) => vm.status),
    ];
    if (allStatuses.every((s) => s === 'running')) this.version!.status = 'running';
    else if (allStatuses.every((s) => s === 'stopped')) this.version!.status = 'stopped';
    else if (allStatuses.some((s) => s === 'running')) this.version!.status = 'running';
  }

  onCommonVarsChange() {}

  isAksPipeline(pipeline: PipelinePayload): boolean {
    return pipeline.id === 'cld_aks';
  }

  isPipelineDisabled(pipeline: PipelinePayload): boolean {
    if (this.isAksPipeline(pipeline)) return false;
    return !this.isAksSelected;
  }

  isPipelineSelected(pipeline: PipelinePayload): boolean {
    return this.selectedPipelines.some((sp) => sp.pipeline.id === pipeline.id);
  }

  togglePipeline(pipeline: PipelinePayload) {
    if (this.isPipelineDisabled(pipeline)) return;

    if (this.isPipelineSelected(pipeline)) {
      if (this.isAksPipeline(pipeline)) {
        this.selectedPipelines = [];
        this.isAksSelected = false;
      } else {
        this.selectedPipelines = this.selectedPipelines.filter(
          (sp) => sp.pipeline.id !== pipeline.id,
        );
        this.reorderPipelines();
      }
    } else {
      this.selectedPipelines.push({
        pipeline,
        order: this.selectedPipelines.length + 1,
        chainCondition: 'success',
        scheduledTime: '',
        triggerStatus: 'pending',
        pipelineUrl: '',
      });
      if (this.isAksPipeline(pipeline)) this.isAksSelected = true;
    }
  }

  private reorderPipelines() {
    this.selectedPipelines.forEach((sp, i) => (sp.order = i + 1));
  }

  removePipelineFromTable(sp: SelectedPipeline) {
    if (this.isAksPipeline(sp.pipeline)) {
      this.selectedPipelines = [];
      this.isAksSelected = false;
    } else {
      this.selectedPipelines = this.selectedPipelines.filter((s) => s.pipeline.id !== sp.pipeline.id);
      this.reorderPipelines();
    }
  }

  movePipelineUp(index: number) {
    if (index <= 1) return;
    [this.selectedPipelines[index], this.selectedPipelines[index - 1]] = [this.selectedPipelines[index - 1], this.selectedPipelines[index]];
    this.reorderPipelines();
  }

  movePipelineDown(index: number) {
    if (index >= this.selectedPipelines.length - 1) return;
    [this.selectedPipelines[index], this.selectedPipelines[index + 1]] = [this.selectedPipelines[index + 1], this.selectedPipelines[index]];
    this.reorderPipelines();
  }

  hasToken(pipeline: PipelinePayload): boolean {
    return this.payloadService.hasToken(pipeline);
  }

  togglePayloadView(pipelineId: string) {
    this.expandedPipelineId = this.expandedPipelineId === pipelineId ? null : pipelineId;
  }

  isEditing(pipelineId: string): boolean {
    return this.editingPipelineId === pipelineId;
  }

  startEditPayload(pipeline: PipelinePayload) {
    this.editingPipelineId = pipeline.id;
    this.editPayload = { ...pipeline, variables: pipeline.variables.map((v) => ({ ...v })) };
  }

  cancelEditPayload() {
    this.editingPipelineId = null;
    this.editPayload = null;
  }

  saveEditPayload() {
    if (!this.editPayload) return;
    const updated = this.payloadService.updatePipeline(this.editPayload);
    const sp = this.selectedPipelines.find((s) => s.pipeline.id === this.editPayload!.id);
    if (sp) sp.pipeline = updated;
    this.editingPipelineId = null;
    this.editPayload = null;
  }

  toggleVarComment(index: number) {
    if (!this.editPayload) return;
    this.editPayload.variables[index].commented = !this.editPayload.variables[index].commented;
  }

  removeEditVar(index: number) {
    if (!this.editPayload) return;
    this.editPayload.variables.splice(index, 1);
  }

  addEditVar() {
    if (!this.editPayload) return;
    this.editPayload.variables.push({ key: '', value: '', commented: false });
  }

  openFeaturesModal() {
    if (!this.version) return;
    this.featureSelections = AVAILABLE_FEATURES.map((f) => ({
      feature: { ...f },
      selected: this.version!.enabledFeatures.some((ef) => ef.id === f.id),
    }));
    this.showFeaturesModal = true;
  }

  closeFeaturesModal() {
    this.showFeaturesModal = false;
  }

  saveFeatures() {
    if (!this.version) return;
    this.version.enabledFeatures = this.featureSelections
      .filter((fs) => fs.selected)
      .map((fs) => ({ ...fs.feature, enabled: true }));
    this.showFeaturesModal = false;
  }

  removeFeature(featureId: string) {
    if (!this.version) return;
    this.version.enabledFeatures = this.version.enabledFeatures.filter((f) => f.id !== featureId);
  }

  triggerPipeline(sp: SelectedPipeline) {
    if (sp.triggerStatus === 'triggering') return;
    sp.triggerStatus = 'triggering';
    sp.pipelineUrl = '';
    setTimeout(() => {
      const pipelineId = Math.floor(10000 + Math.random() * 90000);
      sp.pipelineUrl = sp.pipeline.triggerUrl.replace('/trigger/pipeline', `/pipelines/${pipelineId}`);
      sp.triggerStatus = 'triggered';
      this.runHealthCheck(`After ${sp.pipeline.name}`);
    }, 1500);
  }

  getTriggerStatusLabel(status: TriggerStatus): string {
    switch (status) {
      case 'pending': return 'Awaiting trigger';
      case 'triggering': return 'Triggering...';
      case 'triggered': return 'Triggered';
      case 'failed': return 'Failed';
    }
  }

  openScheduleModal() {
    if (this.selectedPipelines.length === 0) return;
    this.scheduleMode = 'chain';
    this.showScheduleModal = true;
  }

  closeScheduleModal() { this.showScheduleModal = false; }
  confirmSchedule() { this.showScheduleModal = false; }

  openHealthCheckModal() {
    this.showHealthCheckModal = true;
  }

  closeHealthCheckModal() {
    this.showHealthCheckModal = false;
  }

  runHealthCheck(triggeredBy: string = 'Manual') {
    if (this.isRunningHealthCheck || !this.version) return;

    const code = this.version.commonVars.customerCode || 'unknown';
    const run: HealthCheckRun = {
      id: `hc-${Date.now()}`,
      triggeredBy,
      timestamp: new Date(),
      overallStatus: 'checking',
      items: this.generateCheckItems(code),
    };

    this.healthCheckRuns.unshift(run);
    this.activeHealthRunId = run.id;
    this.isRunningHealthCheck = true;
    this.showHealthCheckModal = true;

    let idx = 0;
    const checkNext = () => {
      if (idx >= run.items.length) {
        const statuses = run.items.map((i) => i.status);
        if (statuses.some((s) => s === 'unhealthy')) run.overallStatus = 'unhealthy';
        else if (statuses.some((s) => s === 'degraded')) run.overallStatus = 'degraded';
        else run.overallStatus = 'healthy';
        this.isRunningHealthCheck = false;
        return;
      }

      run.items[idx].status = 'checking';
      setTimeout(() => {
        const roll = Math.random();
        run.items[idx].status = roll > 0.15 ? 'healthy' : (roll > 0.05 ? 'degraded' : 'unhealthy');
        run.items[idx].detail = this.getHealthDetail(run.items[idx]);
        idx++;
        checkNext();
      }, 400 + Math.random() * 300);
    };

    checkNext();
  }

  private generateCheckItems(code: string): HealthCheckItem[] {
    const items: HealthCheckItem[] = [
      { category: 'Cluster', name: 'Cluster Version', status: 'unknown', detail: '' },
      { category: 'Cluster', name: 'Cluster Status', status: 'unknown', detail: '' },
      { category: 'Cluster', name: 'Cluster Power State', status: 'unknown', detail: '' },
      { category: 'VM', name: `${code}_uat_ao1`, status: 'unknown', detail: '' },
      { category: 'VM', name: `${code}_uat_db1`, status: 'unknown', detail: '' },
    ];

    if (this.version) {
      for (const f of this.version.enabledFeatures) {
        if (['env_uat', 'env_cfg', 'env_prd'].includes(f.id)) {
          items.push({ category: 'Environment Pods', name: `${f.name} Pods`, status: 'unknown', detail: '' });
        }
        if (['oi', 'pso'].includes(f.id)) {
          items.push({ category: 'Feature Pods', name: `${f.name} Pods`, status: 'unknown', detail: '' });
        }
      }
    }

    return items;
  }

  private getHealthDetail(item: HealthCheckItem): string {
    if (item.status === 'healthy') {
      if (item.name === 'Cluster Version') return 'v1.28.5 (latest)';
      if (item.name === 'Cluster Status') return 'Provisioned & Ready';
      if (item.name === 'Cluster Power State') return 'Running';
      if (item.category === 'VM') return 'Running — Allocated';
      if (item.category === 'Environment Pods') return 'All pods healthy (3/3)';
      if (item.category === 'Feature Pods') return 'All pods healthy (2/2)';
    }
    if (item.status === 'degraded') {
      if (item.category === 'Environment Pods') return '2/3 pods running, 1 restarting';
      if (item.category === 'Feature Pods') return '1/2 pods running';
      return 'Partially available';
    }
    if (item.status === 'unhealthy') return 'Not responding';
    return 'Checking...';
  }

  getHealthStatusIcon(status: HealthStatus): string {
    switch (status) {
      case 'healthy': return 'check_circle';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      case 'checking': return 'sync';
      default: return 'help';
    }
  }

  getActiveRun(): HealthCheckRun | undefined {
    if (this.activeHealthRunId) {
      return this.healthCheckRuns.find((r) => r.id === this.activeHealthRunId);
    }
    return this.healthCheckRuns[0];
  }

  setActiveRun(run: HealthCheckRun) {
    this.activeHealthRunId = run.id;
  }

  getCategories(items: HealthCheckItem[]): string[] {
    return [...new Set(items.map((i) => i.category))];
  }

  getItemsByCategory(items: HealthCheckItem[], category: string): HealthCheckItem[] {
    return items.filter((i) => i.category === category);
  }

  openDeleteModal() {
    if (!this.version) return;
    this.deleteSelections = AVAILABLE_FEATURES.map((f) => ({
      feature: { ...f },
      selected: false,
    }));
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  deleteSelected() {
    const hasSelection = this.deleteSelections.some((ds) => ds.selected);
    if (!hasSelection) return;
    this.deleteMode = 'selected';
    this.showDeleteModal = false;
    this.openPinModal();
  }

  deleteAll() {
    this.deleteSelections.forEach((ds) => (ds.selected = true));
    this.deleteMode = 'all';
    this.showDeleteModal = false;
    this.openPinModal();
  }

  openPinModal() {
    this.securityPin = '';
    this.pinError = false;
    this.showPinModal = true;
  }

  closePinModal() {
    this.showPinModal = false;
    this.securityPin = '';
    this.pinError = false;
  }

  onPinInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value && index < 3) {
      const next = input.parentElement?.querySelector<HTMLInputElement>(`input:nth-child(${index + 2})`);
      next?.focus();
    }
  }

  get pinDigits(): string[] {
    return this.securityPin.padEnd(4, '').split('').slice(0, 4);
  }

  onPinChange(value: string, index: number) {
    const digits = this.securityPin.padEnd(4, ' ').split('');
    digits[index] = value.slice(-1) || ' ';
    this.securityPin = digits.join('').trim();
    this.pinError = false;
  }

  confirmPin() {
    if (this.securityPin.length !== 4) {
      this.pinError = true;
      return;
    }

    this.showPinModal = false;
    this.processDelete();
  }

  private processDelete() {
    if (!this.version) return;

    const featuresToDelete = this.deleteSelections
      .filter((ds) => ds.selected)
      .map((ds) => ds.feature);

    this.version.enabledFeatures = this.version.enabledFeatures
      .filter((ef) => !featuresToDelete.some((fd) => fd.id === ef.id));

    const startOrder = this.selectedPipelines.length + 1;
    featuresToDelete.forEach((feature, i) => {
      const deletePipeline: PipelinePayload = {
        id: `delete_${feature.id}_${Date.now()}`,
        name: `delete_${feature.name}`,
        description: `Delete ${feature.name} - ${feature.description}`,
        token: 'auto-generated',
        ref: 'master',
        triggerUrl: `https://gitlab.com/api/v4/projects/12345/trigger/pipeline`,
        isDefault: false,
        variables: [],
      };

      this.selectedPipelines.push({
        pipeline: deletePipeline,
        order: startOrder + i,
        chainCondition: 'success',
        scheduledTime: '',
        triggerStatus: i === 0 ? 'triggering' : 'pending',
        pipelineUrl: '',
      });
    });

    if (featuresToDelete.length > 0) {
      const firstDeleteIdx = startOrder - 1;
      const firstSp = this.selectedPipelines[firstDeleteIdx];
      if (firstSp && firstSp.triggerStatus === 'triggering') {
        setTimeout(() => {
          const pipelineId = Math.floor(10000 + Math.random() * 90000);
          firstSp.pipelineUrl = firstSp.pipeline.triggerUrl.replace('/trigger/pipeline', `/pipelines/${pipelineId}`);
          firstSp.triggerStatus = 'triggered';

          if (firstDeleteIdx + 1 < this.selectedPipelines.length) {
            this.selectedPipelines[firstDeleteIdx + 1].triggerStatus = 'triggering';
          }
        }, 3000);
      }
    }

    this.securityPin = '';
  }

  openPipelineDetail(sp: SelectedPipeline) {
    this.detailPipeline = sp;
    this.pipelineDetailData = this.generateMockPipelineDetail(sp);
    this.selectedJob = null;
    this.showDetailPayload = false;
    this.showPipelineDetailModal = true;
  }

  closePipelineDetail() {
    this.showPipelineDetailModal = false;
    this.pipelineDetailData = null;
    this.selectedJob = null;
    this.detailPipeline = null;
  }

  toggleDetailPayload() {
    this.showDetailPayload = !this.showDetailPayload;
  }

  selectJob(job: PipelineJob) {
    this.selectedJob = this.selectedJob?.id === job.id ? null : job;
  }

  getJobStatusIcon(status: JobStatus): string {
    switch (status) {
      case 'passed': return 'check_circle';
      case 'failed': return 'cancel';
      case 'running': return 'play_circle';
      case 'pending': return 'schedule';
      case 'skipped': return 'skip_next';
    }
  }

  getStageStatus(stage: PipelineStage): JobStatus {
    if (stage.jobs.some(j => j.status === 'failed')) return 'failed';
    if (stage.jobs.some(j => j.status === 'running')) return 'running';
    if (stage.jobs.every(j => j.status === 'passed')) return 'passed';
    if (stage.jobs.some(j => j.status === 'pending')) return 'pending';
    return 'passed';
  }

  getDownstreamForJob(jobId: string): DownstreamPipeline | undefined {
    return this.pipelineDetailData?.downstream.find(d => d.triggeredByJobId === jobId);
  }

  hasDownstream(): boolean {
    return (this.pipelineDetailData?.downstream.length ?? 0) > 0;
  }

  private generateMockPipelineDetail(sp: SelectedPipeline): PipelineDetailData {
    if (sp.pipeline.id === 'cld_aks' && sp.triggerStatus === 'triggered') {
      return this.generateAksDetail(sp);
    }
    if (sp.triggerStatus === 'triggering') {
      return this.generateRunningDetail(sp);
    }
    return this.generatePendingDetail(sp);
  }

  private generateAksDetail(sp: SelectedPipeline): PipelineDetailData {
    return {
      pipelineUrl: sp.pipelineUrl,
      pipelineName: sp.pipeline.name,
      status: 'passed',
      stages: [
        {
          name: 'validate', jobs: [
            { id: 'j1', name: 'lint', status: 'passed', duration: '0:12', log: '$ hadolint Dockerfile\n$ yamllint .gitlab-ci.yml\nAll files passed linting checks.\n\nJob succeeded' },
            { id: 'j2', name: 'validate_config', status: 'passed', duration: '0:05', log: '$ terraform validate\nSuccess! The configuration is valid.\n\n$ tflint --init\n$ tflint\n0 issue(s) found.\n\nJob succeeded' },
          ]
        },
        {
          name: 'plan', jobs: [
            { id: 'j3', name: 'terraform_plan', status: 'passed', duration: '0:34', log: '$ terraform init\nInitializing the backend...\nInitializing provider plugins...\n- Finding hashicorp/azurerm v3.75.0...\n- Installing hashicorp/azurerm v3.75.0...\n\nTerraform has been successfully initialized!\n\n$ terraform plan -out=tfplan\nPlan: 12 to add, 0 to change, 0 to destroy.\n\nSaved plan to: tfplan\n\nJob succeeded' },
          ]
        },
        {
          name: 'apply', jobs: [
            { id: 'j4', name: 'terraform_apply', status: 'passed', duration: '3:12', isDownstreamTrigger: true, downstreamId: 'ds1', log: '$ terraform apply tfplan\nazurerm_resource_group.aks_rg: Creating...\nazurerm_resource_group.aks_rg: Creation complete [id=/subscriptions/.../rg]\nazurerm_kubernetes_cluster.aks: Creating...\nazurerm_kubernetes_cluster.aks: Still creating... [10s]\nazurerm_kubernetes_cluster.aks: Still creating... [2m]\nazurerm_kubernetes_cluster.aks: Creation complete after 3m12s\n\nApply complete! Resources: 12 added, 0 changed, 0 destroyed.\n\nTriggering downstream pipeline: cld_aks_deploy...\nDownstream pipeline started: #92451\n\nJob succeeded' },
          ]
        },
        {
          name: 'verify', jobs: [
            { id: 'j5', name: 'health_check', status: 'passed', duration: '0:10', log: '$ kubectl get nodes\nNAME                       STATUS   ROLES   AGE   VERSION\naks-nodepool1-12345-vmss   Ready    agent   5m    v1.28.5\naks-nodepool1-12345-vmss   Ready    agent   5m    v1.28.5\n\n$ kubectl get pods -A | grep -v Running\nAll pods are in Running state.\n\nJob succeeded' },
            { id: 'j6', name: 'smoke_test', status: 'passed', duration: '0:08', log: '$ curl -s https://c3lo-aks.japaneast.cloudapp.azure.com/healthz\n{"status":"ok","version":"1.0.0"}\n\n$ curl -s https://c3lo-aks.japaneast.cloudapp.azure.com/ready\n{"ready":true}\n\nAll smoke tests passed.\n\nJob succeeded' },
          ]
        },
      ],
      downstream: [
        {
          id: 'ds1',
          name: 'cld_aks_deploy',
          url: 'https://gitlab.com/api/v4/projects/12345/pipelines/92451',
          status: 'passed',
          triggeredByJobId: 'j4',
          stages: [
            {
              name: 'init', jobs: [
                { id: 'ds1-j1', name: 'setup_environment', status: 'passed', duration: '0:08', log: '$ az login --service-principal\nLogged in successfully.\n\n$ az aks get-credentials --resource-group c3lo-aks-rg --name c3lo-aks\nMerged "c3lo-aks" as current context.\n\n$ helm repo update\nUpdate Complete.\n\nJob succeeded' },
              ]
            },
            {
              name: 'deploy', jobs: [
                { id: 'ds1-j2', name: 'deploy_aks_cluster', status: 'passed', duration: '1:45', log: '$ helm upgrade --install ifs-cloud ./charts/ifs-cloud \\\n  --namespace ifs-system \\\n  --set image.tag=24.1.0 \\\n  --set replicaCount=3\n\nRelease "ifs-cloud" has been upgraded.\nNAME: ifs-cloud\nSTATUS: deployed\nREVISION: 2\n\n$ kubectl rollout status deployment/ifs-cloud -n ifs-system\ndeployment "ifs-cloud" successfully rolled out\n\nJob succeeded' },
                { id: 'ds1-j3', name: 'configure_networking', status: 'passed', duration: '0:22', log: '$ kubectl apply -f networking/ingress.yml\ningress.networking.k8s.io/ifs-ingress configured\n\n$ kubectl apply -f networking/network-policy.yml\nnetworkpolicy.networking.k8s.io/ifs-netpol configured\n\n$ kubectl get ingress -n ifs-system\nNAME          CLASS   HOSTS                 ADDRESS         PORTS\nifs-ingress   nginx   c3lo.ifs.cloud.com    20.78.45.123    80, 443\n\nJob succeeded' },
              ]
            },
            {
              name: 'test', jobs: [
                { id: 'ds1-j4', name: 'integration_test', status: 'passed', duration: '0:15', log: '$ npm run test:integration\n\n  PASS  tests/api.test.ts\n    ✓ GET /api/health returns 200 (45ms)\n    ✓ GET /api/version returns correct version (32ms)\n    ✓ POST /api/validate accepts valid payload (120ms)\n\n  PASS  tests/db.test.ts\n    ✓ Database connection is established (89ms)\n    ✓ Migrations are up to date (156ms)\n\nTest Suites: 2 passed, 2 total\nTests:       5 passed, 5 total\n\nJob succeeded' },
              ]
            },
          ],
        },
      ],
    };
  }

  private generateRunningDetail(sp: SelectedPipeline): PipelineDetailData {
    return {
      pipelineUrl: sp.pipelineUrl || '',
      pipelineName: sp.pipeline.name,
      status: 'running',
      stages: [
        {
          name: 'prepare', jobs: [
            { id: 'r1', name: 'fetch_artifacts', status: 'passed', duration: '0:15', log: '$ curl -O https://artifacts.ifs.com/latest/manifest.json\n  % Total    Received  Time\n  100  2048  100  2048  0:00:15\n\nArtifacts downloaded successfully.\n\nJob succeeded' },
            { id: 'r2', name: 'validate_manifest', status: 'passed', duration: '0:08', log: '$ python validate.py manifest.json\nManifest schema: valid\nRequired fields: present\nVersion check: 24.1.0 (compatible)\n\nJob succeeded' },
          ]
        },
        {
          name: 'build', jobs: [
            { id: 'r3', name: 'build_images', status: 'running', duration: '1:22', log: '$ docker build -t ifs-cloud:24.1.0 .\nStep 1/12 : FROM node:18-alpine\n ---> abc123\nStep 2/12 : WORKDIR /app\n ---> Using cache\nStep 7/12 : RUN npm ci --production\n ---> Running...' },
          ]
        },
        {
          name: 'deploy', jobs: [
            { id: 'r4', name: 'deploy_to_env', status: 'pending', duration: '--', log: '' },
          ]
        },
        {
          name: 'notify', jobs: [
            { id: 'r5', name: 'send_notification', status: 'pending', duration: '--', isDownstreamTrigger: true, downstreamId: 'ds-r', log: '' },
          ]
        },
      ],
      downstream: [
        {
          id: 'ds-r',
          name: `${sp.pipeline.name}_post`,
          url: '',
          status: 'pending',
          triggeredByJobId: 'r5',
          stages: [
            { name: 'notify', jobs: [{ id: 'ds-r1', name: 'slack_notify', status: 'pending', duration: '--', log: '' }] },
            { name: 'update', jobs: [{ id: 'ds-r2', name: 'update_status', status: 'pending', duration: '--', log: '' }] },
          ],
        },
      ],
    };
  }

  private generatePendingDetail(sp: SelectedPipeline): PipelineDetailData {
    return {
      pipelineUrl: '',
      pipelineName: sp.pipeline.name,
      status: 'pending',
      stages: [
        {
          name: 'validate', jobs: [
            { id: 'p1', name: 'check_source', status: 'pending', duration: '--', log: '' },
            { id: 'p2', name: 'check_target', status: 'pending', duration: '--', log: '' },
          ]
        },
        {
          name: 'execute', jobs: [
            { id: 'p3', name: `run_${sp.pipeline.name}`, status: 'pending', duration: '--', log: '' },
          ]
        },
        {
          name: 'verify', jobs: [
            { id: 'p4', name: 'run_tests', status: 'pending', duration: '--', log: '' },
          ]
        },
      ],
      downstream: [],
    };
  }
}
