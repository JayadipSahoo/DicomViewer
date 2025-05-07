import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    FormsModule,
    ImageCropperComponent,
    MatIconModule
  ],
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.scss']
})
export class ImageEditorComponent implements OnInit {
  saveAsNew = false;
  croppedImage: ImageCroppedEvent | null = null;
  rotation = 0;
  transform = {
    scale: 1,
    flipH: false,
    flipV: false
  };
  isImageLoaded = false;

  constructor(
    public dialogRef: MatDialogRef<ImageEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { imageUrl: string, name: string },
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    console.log('Editor opened with image URL:', this.data.imageUrl);
  }

  imageCropped(event: ImageCroppedEvent) {
    console.log('Image cropped:', event);
    this.croppedImage = event;
  }

  imageLoaded() {
    console.log('Image loaded successfully');
    this.isImageLoaded = true;
  }

  loadImageFailed() {
    console.error('Failed to load image');
    this.snackBar.open('Failed to load image', 'Close', { duration: 3000 });
  }

  rotateLeft() {
    this.rotation = (this.rotation - 90) % 360;
  }

  rotateRight() {
    this.rotation = (this.rotation + 90) % 360;
  }

  flipHorizontal() {
    this.transform = {
      ...this.transform,
      flipH: !this.transform.flipH
    };
  }

  flipVertical() {
    this.transform = {
      ...this.transform,
      flipV: !this.transform.flipV
    };
  }

  downloadEditedImage() {
    if (!this.croppedImage?.blob) {
      this.snackBar.open('No image to download', 'Close', { duration: 3000 });
      return;
    }

    try {
      const url = window.URL.createObjectURL(this.croppedImage.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${this.data.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.snackBar.open('Image downloaded successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error downloading image:', error);
      this.snackBar.open('Failed to download image', 'Close', { duration: 3000 });
    }
  }

  async save() {
    if (!this.croppedImage?.blob) {
      this.snackBar.open('No image to save', 'Close', { duration: 3000 });
      return;
    }

    try {
      const fileName = this.saveAsNew ? `edited_${this.data.name}` : this.data.name;
      const file = new File([this.croppedImage.blob], fileName, { type: 'image/png' });
      
      this.dialogRef.close({
        file,
        saveAsNew: this.saveAsNew
      });
    } catch (error) {
      console.error('Error saving image:', error);
      this.snackBar.open('Failed to save image', 'Close', { duration: 3000 });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
