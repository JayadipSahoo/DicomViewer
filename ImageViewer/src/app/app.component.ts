import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="app-toolbar">
        <span class="app-title">DICOM Viewer</span>
        <span class="spacer"></span>
        <nav class="app-nav">
          <a mat-button routerLink="/upload" routerLinkActive="active">
            <mat-icon>cloud_upload</mat-icon>
            Upload
          </a>
          <a mat-button routerLink="/gallery" routerLinkActive="active">
            <mat-icon>grid_view</mat-icon>
            View DICOM Images
          </a>
        </nav>
      </mat-toolbar>
      
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      background-color: #f9f9f9;
    }
    
    .app-toolbar {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #304FFE 0%, #00B8D4 100%);
      color: white;
      padding: 0 24px;
      height: 64px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
    
    .app-title {
      font-size: 1.7rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-right: 40px;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .app-nav {
      display: flex;
      gap: 16px;
    }
    
    .nav-link {
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .nav-link:hover {
      background-color: rgba(255,255,255,0.1);
      color: white;
    }
    
    .nav-link.active {
      background-color: rgba(255,255,255,0.2);
      color: white;
    }
    
    .app-content {
      flex: 1;
      padding: 24px;
      overflow: auto;
      position: relative;
    }
    
    .viewer-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 140px);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      overflow: hidden;
      background-color: #f0f0f0;
    }
    
    .file-upload-section {
      padding: 24px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      margin-bottom: 24px;
    }
    
    .upload-instruction {
      margin-bottom: 16px;
      color: #555;
    }
    
    .file-input-wrapper {
      margin-bottom: 16px;
    }
  `]
})
export class AppComponent {
  title = 'DICOM Viewer';
}
