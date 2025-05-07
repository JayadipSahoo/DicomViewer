import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageService } from '../../services/image.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private imageService: ImageService,
    private router: Router
  ) {}
  
  handleFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No files selected';
      return;
    }

    this.uploadDicomFiles(Array.from(input.files));
  }

  handleFolderSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No folder selected';
      return;
    }

    this.loading = true;
    this.error = null;

    const files = Array.from(input.files).filter(file => 
      file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom'
    );

    if (files.length === 0) {
      this.error = 'No DICOM files found in the selected folder';
      this.loading = false;
      return;
    }

    this.uploadDicomFiles(files);
  }
  
  private uploadDicomFiles(files: File[]) {
    this.loading = true;
    this.error = null;
    
    console.log(`Attempting to upload ${files.length} DICOM files`);
    
    // Keep track of successful uploads
    let successCount = 0;
    let failCount = 0;
    const totalFiles = files.length;
    
    // Upload files one by one, with metadata parsing for each
    for (const file of files) {
      console.log(`DICOM file to upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      this.imageService.uploadImage(file).subscribe({
        next: (response) => {
          console.log(`Upload successful for file: ${file.name}`, response);
          successCount++;
          
          // Check if all uploads are complete
          if (successCount + failCount === totalFiles) {
            this.finishUpload(successCount, failCount);
          }
        },
        error: (error) => {
          console.error(`Upload failed for file: ${file.name}`, error);
          failCount++;
          
          // Check if all uploads are complete
          if (successCount + failCount === totalFiles) {
            this.finishUpload(successCount, failCount);
          }
        }
      });
    }
  }
  
  private finishUpload(successCount: number, failCount: number) {
    console.log(`Upload completed: ${successCount} successful, ${failCount} failed`);
    
    if (successCount > 0) {
      // Navigate to gallery view if at least one upload succeeded
      this.router.navigate(['/gallery']);
    } else if (failCount > 0) {
      this.error = 'No DICOM images were uploaded successfully';
    }
    
    this.loading = false;
  }
}
