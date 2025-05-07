import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { ImageService, DicomImage } from '../../services/image.service';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { DicomViewerComponent } from '../dicom-viewer/dicom-viewer.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatListModule,
    DicomViewerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit {
  allImages: DicomImage[] = [];
  selectedImage: DicomImage | null = null;

  constructor(public imageService: ImageService) {}

  ngOnInit() {
    this.loadImages();
  }

  loadImages() {
    this.imageService.getImages().subscribe(images => {
      this.allImages = images;
      console.log('Loaded DICOM images:', images);
    });
  }

  selectImage(image: DicomImage) {
    this.selectedImage = image;
  }

  clearSelected() {
    this.selectedImage = null;
  }

  deleteImage(image: DicomImage) {
    if (confirm(`Are you sure you want to delete DICOM image: ${image.name}?`)) {
      this.imageService.deleteImage(image.id).subscribe({
        next: () => {
          if (this.selectedImage?.id === image.id) {
            this.selectedImage = null;
          }
        },
        error: (error: any) => {
          console.error('Error deleting DICOM image:', error);
        }
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      // Only allow DICOM files
      const dicomFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom'
      );
      
      if (dicomFiles.length === 0) {
        alert('Please select valid DICOM files (.dcm)');
        return;
      }
      
      if (dicomFiles.length !== files.length) {
        alert(`Only ${dicomFiles.length} of ${files.length} files are valid DICOM files and will be uploaded.`);
      }
      
      // Handle uploading multiple files one by one
      const uploadObservables = dicomFiles.map(file => this.imageService.uploadImage(file));
      
      forkJoin(uploadObservables).subscribe({
        next: (uploadedImages: any[]) => {
          console.log('Successfully uploaded DICOM images:', uploadedImages);
          this.loadImages(); // Reload images from server
          
          // Select the first uploaded image if available
          if (uploadedImages.length > 0 && uploadedImages[0].id) {
            this.selectImage(uploadedImages[0]);
          }
        },
        error: (error: any) => {
          console.error('Error uploading DICOM images:', error);
        }
      });
    }
  }
}

