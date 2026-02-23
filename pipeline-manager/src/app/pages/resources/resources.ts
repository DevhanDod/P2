import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ResourceService, Resource } from '../../services/resource';

@Component({
  selector: 'app-resources',
  imports: [FormsModule, DatePipe],
  templateUrl: './resources.html',
  styleUrl: './resources.scss',
})
export class Resources {
  showModal = false;
  customerCode = '';

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
}
