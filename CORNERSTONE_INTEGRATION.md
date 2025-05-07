# Cornerstone.js Integration Guide

## Overview

This document explains how Cornerstone.js is integrated into our DICOM viewer application, detailing the initialization process, file structure, and core functionality implementation. Cornerstone.js is a powerful JavaScript library for medical imaging that provides tools for displaying, manipulating, and analyzing DICOM images in web applications.

## File Structure and Responsibilities

| File | Purpose |
|------|---------|
| `ImageViewer/src/app/components/dicom-viewer/dicom-viewer.component.ts` | Main component that initializes and manages Cornerstone |
| `ImageViewer/src/app/components/dicom-viewer/dicom-viewer.component.html` | Template with the viewport element and UI controls |
| `ImageViewer/src/app/components/dicom-viewer/dicom-viewer.component.scss` | Styling for the viewer component |
| `ImageViewer/src/app/services/image.service.ts` | Service that handles API requests for DICOM files |
| `ImageViewer/src/index.html` | Contains the script imports for Cornerstone libraries |

## Cornerstone Initialization Process

### 1. Library Imports

Cornerstone and its dependencies are imported at the top of the DicomViewerComponent:

```typescript
// ImageViewer/src/app/components/dicom-viewer/dicom-viewer.component.ts
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
```

### 2. Library Configuration

Cornerstone is initialized in two main steps:

#### 2.1 WADO Image Loader Configuration

The WADO Image Loader is configured in the component's constructor:

```typescript
// dicom-viewer.component.ts
constructor(private imageService: ImageService) {
  // Initialize cornerstone and its dependencies
  this.initCornerstoneWADOImageLoader();
}

private initCornerstoneWADOImageLoader(): void {
  try {
    // Configure cornerstone
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    console.log('Cornerstone WADO Image Loader initialized');
  } catch (error) {
    console.error('Error initializing Cornerstone WADO Image Loader:', error);
    this.loadError = 'Failed to initialize DICOM viewer';
  }
}
```

This step connects the WADO Image Loader to both the Cornerstone core library and the DICOM parser.

#### 2.2 HTML Element Initialization

The HTML element for rendering is enabled for Cornerstone in the `ngAfterViewInit` lifecycle hook:

```typescript
// dicom-viewer.component.ts
ngAfterViewInit(): void {
  console.log('ngAfterViewInit - dicomContainer:', this.dicomContainer);
  if (this.dicomContainer && this.dicomContainer.nativeElement) {
    this.element = this.dicomContainer.nativeElement;
    console.log('Element initialized:', this.element);
    this.initCornerstoneElement();
    
    if (this.selectedImage) {
      this.loadAndDisplayImage();
    }
  } else {
    console.error('dicomContainer not found or not initialized properly');
    this.loadError = 'Failed to initialize viewer - element not found';
  }
}

private initCornerstoneElement(): void {
  if (!this.element) return;
  
  try {
    // Enable the cornerstone element
    cornerstone.enable(this.element);
    this.cornerstoneInitialized = true;
    console.log('Cornerstone enabled on element');
  } catch (error) {
    console.error('Error enabling Cornerstone on element:', error);
    this.loadError = 'Failed to initialize DICOM viewer';
  }
}
```

The HTML element that will contain the DICOM image is referenced via ViewChild and then enabled for Cornerstone rendering.

## DICOM Image Loading Process

### 1. Load Triggering

Image loading is triggered in two main places:

1. When the component first initializes and has a selected image (`ngAfterViewInit`)
2. When the selected image changes (`ngOnChanges`)

```typescript
// dicom-viewer.component.ts
ngOnChanges(changes: SimpleChanges): void {
  if (changes['selectedImage'] && this.element) {
    // Reset state when image changes
    this.loadError = null;
    this.isImageLoaded = false;
    this.dicomMetadata = null;
    this.showMetadata = false;
    
    if (this.selectedImage) {
      console.log('Selected image changed, loading new image:', this.selectedImage);
      
      // First fetch metadata from API to ensure we have database values
      this.fetchMetadataFromApi();
      
      // Then load the DICOM image (with slight delay to allow API fetch to complete first)
      setTimeout(() => {
        // Then load the DICOM image and extract additional metadata
        this.loadAndDisplayImage();
      }, 100);
    }
  }
}
```

### 2. Image Loading with Cornerstone

The actual loading happens in the `loadAndDisplayImage` method:

```typescript
// dicom-viewer.component.ts
loadAndDisplayImage(): void {
  if (!this.element || !this.selectedImage || !this.cornerstoneInitialized) {
    console.warn('Cannot load image - element, image, or cornerstone not initialized');
    this.loadError = 'DICOM viewer not properly initialized';
    return;
  }
  
  this.isLoading = true;
  this.loadError = null;
  
  // Clear any existing image
  try {
    cornerstone.reset(this.element);
  } catch (error) {
    console.warn('Error resetting cornerstone element:', error);
  }
  
  // Create the imageId for wado
  const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
  console.log('Loading DICOM image with imageId:', imageId);
  
  // Load and display the image
  cornerstone.loadAndCacheImage(imageId)
    .then(image => {
      console.log('DICOM image loaded successfully');
      this.displayImage(image);
      this.extractDicomMetadata(image);
      this.isLoading = false;
      this.isImageLoaded = true;
    })
    .catch(error => {
      console.error('Error loading DICOM image:', error);
      this.isLoading = false;
      this.loadError = 'Failed to load DICOM image. The file may be corrupted or in an unsupported format.';
    });
}
```

Key steps in this process:
1. Reset any existing image with `cornerstone.reset()`
2. Create a WADO URI for the DICOM file
3. Load and cache the image using `cornerstone.loadAndCacheImage()`
4. Display the image in the viewport with `this.displayImage(image)`
5. Extract metadata with `this.extractDicomMetadata(image)`

### 3. Image Display

The loaded image is displayed using Cornerstone's rendering engine:

```typescript
// dicom-viewer.component.ts
displayImage(image: cornerstone.Image): void {
  if (!this.element) return;

  try {
    // Display the image
    cornerstone.displayImage(this.element, image);
    
    // Get the current viewport and ensure it's properly initialized
    this.viewport = cornerstone.getViewport(this.element);
    
    // Fit the image to the viewport initially
    this.viewport.scale = 1.0;
    this.viewport.translation.x = 0;
    this.viewport.translation.y = 0;
    cornerstone.setViewport(this.element, this.viewport);
    
    // Add border style to show the container boundaries
    this.element.style.border = "1px solid #333";
    
    console.log('DICOM image displayed successfully');
    this.isImageLoaded = true;
  } catch (error) {
    console.error('Error displaying DICOM image:', error);
    this.loadError = 'Failed to display DICOM image';
    this.isImageLoaded = false;
  }
}
```

Key steps in this process:
1. Call `cornerstone.displayImage()` to render the image
2. Get the viewport (controls display properties)
3. Set initial viewport parameters (scale, translation)
4. Apply the viewport with `cornerstone.setViewport()`

## User Interaction Implementation

The component implements several methods for user interaction with the DICOM image:

### 1. Zoom Controls

```typescript
// dicom-viewer.component.ts
zoomIn(): void {
  if (!this.element || !this.viewport) return;
  
  try {
    this.viewport.scale += 0.25;
    cornerstone.setViewport(this.element, this.viewport);
  } catch (error) {
    console.error('Error zooming in:', error);
  }
}

zoomOut(): void {
  if (!this.element || !this.viewport) return;
  
  try {
    this.viewport.scale -= 0.25;
    if (this.viewport.scale < 0.25) this.viewport.scale = 0.25;
    cornerstone.setViewport(this.element, this.viewport);
  } catch (error) {
    console.error('Error zooming out:', error);
  }
}
```

### 2. Reset View

```typescript
// dicom-viewer.component.ts
resetView(): void {
  if (!this.element || !this.viewport) return;
  
  try {
    this.viewport.scale = 1;
    this.viewport.translation.x = 0;
    this.viewport.translation.y = 0;
    cornerstone.setViewport(this.element, this.viewport);
  } catch (error) {
    console.error('Error resetting view:', error);
  }
}
```

### 3. Retry Loading

```typescript
// dicom-viewer.component.ts
retryLoad(): void {
  if (this.selectedImage) {
    this.loadError = null;
    this.loadAndDisplayImage();
  }
}
```

## Cornerstone HTML Integration

The HTML template provides the container element for Cornerstone rendering:

```html
<!-- dicom-viewer.component.html -->
<div #dicomContainer class="viewer-canvas">
  <div *ngIf="isLoading" class="loading-indicator">
    <mat-spinner diameter="50"></mat-spinner>
    <p>Loading DICOM image...</p>
  </div>
  <div *ngIf="loadError" class="error-overlay">
    <mat-icon color="warn">error</mat-icon>
    <p>{{loadError}}</p>
    <button mat-raised-button color="primary" (click)="retryLoad()">
      Try Again
    </button>
  </div>
</div>
```

The `#dicomContainer` reference is captured in the component via ViewChild and used as the rendering target for Cornerstone.

## Metadata Extraction from DICOM

Cornerstone provides access to the full DICOM dataset, which is used to extract metadata:

```typescript
// dicom-viewer.component.ts
extractDicomMetadata(image: cornerstone.Image): void {
  try {
    // Access the dataset from the image object
    const dataset = (image as any).data.elements;

    // Create metadata object from DICOM tags
    const extractedMetadata = {
      // Patient information
      patientName: this.getTagValue(dataset, 'x00100010') || this.getTagValue(dataset, 'PatientName'),
      patientId: this.getTagValue(dataset, 'x00100020') || this.getTagValue(dataset, 'PatientID'),
      // ... more fields ...
    };
    
    // ... metadata merging logic ...
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
  }
}

private getTagValue(dataset: any, tagName: string): string {
  try {
    if (!dataset) return '';
    
    // Try to access tag by name or tag by hex code
    const value = dataset[tagName]?.value;
    
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle array values (like image type)
    if (Array.isArray(value)) {
      return value.join('\\');
    }
    
    return value.toString();
  } catch (error) {
    console.warn(`Error reading DICOM tag ${tagName}:`, error);
    return '';
  }
}
```

This extraction process allows access to all DICOM tags in the file, which can then be merged with database metadata and displayed to the user.

## Behind the Scenes: How Cornerstone Works

### 1. WADO Image Loader Process

When `cornerstone.loadAndCacheImage(imageId)` is called:

1. The WADO Image Loader parses the URI format (`wadouri:{url}`)
2. An HTTP request is made to fetch the raw DICOM data
3. The dicomParser library parses the binary data:
   - DICOM metadata (tags) are extracted
   - Pixel data is separated from metadata
   - Decompression is applied if needed (JPEG, JPEG2000, RLE)
4. A Cornerstone Image object is created containing:
   - Pixel data in a web-friendly format
   - Metadata needed for display
   - Methods for retrieving pixel values
5. Image data is cached in memory for faster subsequent access

### 2. Rendering Process

When `cornerstone.displayImage(element, image)` is called:

1. Cornerstone creates or gets a rendering context for the element
2. The viewport is initialized or updated
3. The pixel data is transformed based on the viewport properties:
   - Window level/width values are applied
   - Zoom scale is applied
   - Pan translations are applied
4. The transformed pixel data is rendered to a canvas element
5. Additional overlays or annotations may be rendered on top

### 3. Viewport Manipulation

The viewport contains properties that control how the image is displayed:

```typescript
// Example of a viewport object
this.viewport = {
  scale: 1.0,            // Zoom level
  translation: {
    x: 0,                // Horizontal pan
    y: 0                 // Vertical pan
  },
  voi: {
    windowWidth: 255,    // Contrast
    windowCenter: 127    // Brightness
  },
  invert: false,         // Color inversion
  pixelReplication: false,
  rotation: 0,           // Image rotation
  hflip: false,          // Horizontal flip
  vflip: false           // Vertical flip
};
```

Modifying these properties and calling `cornerstone.setViewport()` updates the display without reloading the image data.

## Technical Architecture

The Cornerstone.js integration in our application follows this technical architecture:

```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  DicomViewer        │────>│  Cornerstone Core │────>│  HTML Canvas    │
│  Component          │     │  Rendering Engine │     │  Element        │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
         │                         │    ▲
         │                         │    │
         │                         ▼    │
         │                  ┌───────────────────┐
         │                  │                   │
         │                  │  Image Cache      │
         │                  │                   │
         │                  └───────────────────┘
         │                         ▲
         │                         │
         ▼                         │
┌─────────────────────┐     ┌───────────────────┐
│                     │     │                   │
│  Image Service      │────>│  WADO Image       │
│  API Client         │     │  Loader           │
│                     │     │                   │
└─────────────────────┘     └───────────────────┘
```

## Summary

The Cornerstone.js integration in our application involves:

1. **Initialization**: Set up in the DicomViewerComponent constructor and ngAfterViewInit
2. **Configuration**: Connect Cornerstone Core with WADO Image Loader and DICOM Parser
3. **Element Setup**: Enable a specific DOM element for Cornerstone rendering
4. **Image Loading**: Use the WADO Image Loader to fetch and parse DICOM files
5. **Rendering**: Display images and apply viewport transformations
6. **Interaction**: Implement zoom, pan, and other manipulation features
7. **Metadata**: Extract DICOM tags for display and storage

This integration provides a powerful and flexible way to view and interact with DICOM medical images in a web browser, with no plugins or specialized software required. 