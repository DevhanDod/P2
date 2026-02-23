import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Service Update', route: '/service-update', icon: 'sync' },
    { label: 'Resources', route: '/resources', icon: 'storage' },
    { label: 'Payloads', route: '/payloads', icon: 'code' },
    { label: 'Azure', route: '/azure', icon: 'cloud' },
  ];

  profileItem: NavItem = { label: 'Profile', route: '/profile', icon: 'person' };

  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
