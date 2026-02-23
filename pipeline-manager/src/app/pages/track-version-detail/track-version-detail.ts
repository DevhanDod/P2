import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TrackService, Track, TrackVersion } from '../../services/track';
import { ResourceStatus, ResourceFeature, AVAILABLE_FEATURES } from '../../services/resource';
import { PayloadService, PipelinePayload } from '../../services/payload';

export type ScheduleMode = 'time' | 'chain';
export type TriggerStatus = 'pending' | 'triggering' | 'triggered' | 'failed';

export interface SelectedPipeline {
  pipeline: PipelinePayload;
  order: number;
  chainCondition: 'success' | 'failure' | 'any';
  scheduledTime: string;
  triggerStatus: TriggerStatus;
  pipelineUrl: string;
}

@Component({
  selector: 'app-track-version-detail',
  imports: [FormsModule, DatePipe],
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
}
