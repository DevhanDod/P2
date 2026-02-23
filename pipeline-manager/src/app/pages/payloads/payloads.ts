import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PayloadService, PipelinePayload, PayloadVariable } from '../../services/payload';

@Component({
  selector: 'app-payloads',
  imports: [FormsModule],
  templateUrl: './payloads.html',
  styleUrl: './payloads.scss',
})
export class Payloads {
  showPayloadModal = false;
  showAddModal = false;
  activePipeline: PipelinePayload | null = null;
  isEditing = false;

  editToken = '';
  editRef = '';
  editVariables: PayloadVariable[] = [];

  newPipelineName = '';
  newPipelineDesc = '';

  constructor(private payloadService: PayloadService) {}

  get pipelines(): PipelinePayload[] {
    return this.payloadService.getPipelines();
  }

  hasToken(pipeline: PipelinePayload): boolean {
    return this.payloadService.hasToken(pipeline);
  }

  openPayloadModal(pipeline: PipelinePayload) {
    this.activePipeline = pipeline;
    this.isEditing = false;
    this.loadEditFields(pipeline);
    this.showPayloadModal = true;
  }

  closePayloadModal() {
    this.showPayloadModal = false;
    this.activePipeline = null;
    this.isEditing = false;
  }

  getPayloadPreview(): string {
    if (!this.activePipeline) return '';
    return this.payloadService.formatPayloadPreview(this.activePipeline);
  }

  startEditing() {
    if (this.activePipeline) {
      this.loadEditFields(this.activePipeline);
    }
    this.isEditing = true;
  }

  cancelEditing() {
    this.isEditing = false;
  }

  private loadEditFields(pipeline: PipelinePayload) {
    this.editToken = pipeline.token;
    this.editRef = pipeline.ref;
    this.editVariables = pipeline.variables.map((v) => ({ ...v }));
  }

  savePayload() {
    if (!this.activePipeline) return;

    const updated: PipelinePayload = {
      ...this.activePipeline,
      token: this.editToken,
      ref: this.editRef,
      variables: this.editVariables.map((v) => ({ ...v })),
    };

    const result = this.payloadService.updatePipeline(updated);
    this.activePipeline = result;
    this.isEditing = false;
  }

  addVariable() {
    this.editVariables.push({ key: '', value: '', commented: false });
  }

  removeVariable(index: number) {
    this.editVariables.splice(index, 1);
  }

  openAddModal() {
    this.newPipelineName = '';
    this.newPipelineDesc = '';
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  addPipeline() {
    if (!this.newPipelineName.trim()) return;
    this.payloadService.addPipeline(
      this.newPipelineName.trim(),
      this.newPipelineDesc.trim(),
    );
    this.showAddModal = false;
  }
}
