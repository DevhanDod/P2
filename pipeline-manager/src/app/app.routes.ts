import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { ServiceUpdate } from './pages/service-update/service-update';
import { TrackDetail } from './pages/track-detail/track-detail';
import { TrackVersionDetail } from './pages/track-version-detail/track-version-detail';
import { Resources } from './pages/resources/resources';
import { ResourceDetail } from './pages/resource-detail/resource-detail';
import { Payloads } from './pages/payloads/payloads';
import { Azure } from './pages/azure/azure';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'service-update', component: ServiceUpdate },
  { path: 'service-update/:trackId', component: TrackDetail },
  { path: 'service-update/:trackId/:versionId', component: TrackVersionDetail },
  { path: 'resources', component: Resources },
  { path: 'resources/:resourceId', component: ResourceDetail },
  { path: 'payloads', component: Payloads },
  { path: 'azure', component: Azure },
  { path: 'profile', component: Profile },
];
