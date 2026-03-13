import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ResourceService, Resource } from '../../services/resource';

export interface SharedMember {
  email: string;
  role: 'viewer' | 'editor';
  addedAt: Date;
}

@Component({
  selector: 'app-resources',
  imports: [FormsModule, DatePipe],
  templateUrl: './resources.html',
  styleUrl: './resources.scss',
})
export class Resources {
  showModal = false;
  customerCode = '';

  showShareModal = false;
  shareResource: Resource | null = null;
  shareLink = '';
  linkCopied = false;
  newMemberEmail = '';
  newMemberRole: 'viewer' | 'editor' = 'viewer';
  sharedMembers: SharedMember[] = [];

  constructor(
    private resourceService: ResourceService,
    private router: Router,
  ) {}

  get resources(): Resource[] {
    return this.resourceService.getResources();
  }

  openCreateModal() {
    this.customerCode = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  createResource() {
    if (!this.customerCode.trim()) return;
    this.resourceService.createResource(this.customerCode.trim());
    this.showModal = false;
  }

  openResource(resource: Resource) {
    this.router.navigate(['/resources', resource.id]);
  }

  removeResource(event: Event, id: string) {
    event.stopPropagation();
    this.resourceService.removeResource(id);
  }

  openShareModal(event: Event, resource: Resource) {
    event.stopPropagation();
    this.shareResource = resource;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com';
    this.shareLink = `${origin}/resources/${resource.id}`;
    this.linkCopied = false;
    this.newMemberEmail = '';
    this.newMemberRole = 'viewer';
    this.sharedMembers = this.resourceService.getSharedMembers(resource.id);
    this.showShareModal = true;
  }

  closeShareModal() {
    this.showShareModal = false;
    this.shareResource = null;
  }

  copyShareLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.shareLink);
    }
    this.linkCopied = true;
    setTimeout(() => (this.linkCopied = false), 2000);
  }

  addMember() {
    if (!this.newMemberEmail.trim() || !this.shareResource) return;
    if (this.sharedMembers.some(m => m.email === this.newMemberEmail.trim())) return;

    const member: SharedMember = {
      email: this.newMemberEmail.trim(),
      role: this.newMemberRole,
      addedAt: new Date(),
    };
    this.sharedMembers.push(member);
    this.resourceService.setSharedMembers(this.shareResource.id, this.sharedMembers);
    this.newMemberEmail = '';
  }

  removeMember(email: string) {
    if (!this.shareResource) return;
    this.sharedMembers = this.sharedMembers.filter(m => m.email !== email);
    this.resourceService.setSharedMembers(this.shareResource.id, this.sharedMembers);
  }

  updateMemberRole(email: string, role: 'viewer' | 'editor') {
    const member = this.sharedMembers.find(m => m.email === email);
    if (member && this.shareResource) {
      member.role = role;
      this.resourceService.setSharedMembers(this.shareResource.id, this.sharedMembers);
    }
  }
}
