import { Routes } from '@angular/router';
import { GalleryComponent } from './components/gallery/gallery.component';
import { UploadComponent } from './components/upload/upload.component';

export const routes: Routes = [
  { path: '', redirectTo: 'gallery', pathMatch: 'full' },
  { path: 'gallery', component: GalleryComponent },
  { path: 'upload', component: UploadComponent }
];
