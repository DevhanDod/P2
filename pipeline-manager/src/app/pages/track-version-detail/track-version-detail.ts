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
}
