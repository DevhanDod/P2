import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TrackService, Track, TrackVersion } from '../../services/track';

@Component({
  selector: 'app-track-detail',
  imports: [FormsModule, DatePipe],
  templateUrl: './track-detail.html',
  styleUrl: './track-detail.scss',
})
export class TrackDetail implements OnInit {
  track: Track | undefined;

  showCollabModal = false;
  collabEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackService: TrackService,
  ) {}

  ngOnInit() {
    const trackId = this.route.snapshot.paramMap.get('trackId');
    if (trackId) {
      this.track = this.trackService.getTrackById(trackId);
    }
    if (!this.track) {
      this.router.navigate(['/service-update']);
    }
  }

  goBack() {
    this.router.navigate(['/service-update']);
  }

  onVersionNameChange(version: TrackVersion, newName: string) {
    if (this.track) {
      this.trackService.updateVersionName(this.track.id, version.id, newName);
    }
  }

  onCustomerCodeChange(version: TrackVersion, code: string) {
    if (this.track) {
      this.trackService.updateVersionCustomerCode(this.track.id, version.id, code);
    }
  }

  openVersion(version: TrackVersion) {
    if (this.track) {
      this.router.navigate(['/service-update', this.track.id, version.id]);
    }
  }

  openCollabModal() {
    this.collabEmail = '';
    this.showCollabModal = true;
  }

  closeCollabModal() {
    this.showCollabModal = false;
  }

  addCollaborator() {
    if (!this.track || !this.collabEmail.trim()) return;
    this.trackService.addCollaborator(this.track.id, this.collabEmail.trim());
    this.collabEmail = '';
  }

  removeCollaborator(email: string) {
    if (!this.track) return;
    this.trackService.removeCollaborator(this.track.id, email);
  }
}
