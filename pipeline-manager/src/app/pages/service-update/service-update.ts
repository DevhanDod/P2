import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TrackService, Track } from '../../services/track';

@Component({
  selector: 'app-service-update',
  imports: [FormsModule, DatePipe],
  templateUrl: './service-update.html',
  styleUrl: './service-update.scss',
})
export class ServiceUpdate {
  tracks: Track[] = [];
  showModal = false;
  newTrackName = '';
  numberOfVersions = 1;

  constructor(
    private trackService: TrackService,
    private router: Router,
  ) {
    this.tracks = this.trackService.getTracks();
  }

  openNewTrackModal() {
    this.newTrackName = '';
    this.numberOfVersions = 1;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  createTrack() {
    if (!this.newTrackName.trim() || this.numberOfVersions < 1) return;

    const track = this.trackService.createTrack(
      this.newTrackName.trim(),
      this.numberOfVersions,
    );
    this.tracks = this.trackService.getTracks();
    this.showModal = false;
    this.router.navigate(['/service-update', track.id]);
  }

  openTrack(track: Track) {
    this.router.navigate(['/service-update', track.id]);
  }
}
