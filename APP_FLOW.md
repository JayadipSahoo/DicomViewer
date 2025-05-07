# DICOM Image Viewer Application Flow

## Overview

This document explains the complete flow of the DICOM Image Viewer application, from initial startup through image loading, selection, display, and metadata management. It demonstrates how Angular's dependency injection and the Observable pattern work together to create a responsive application with consolidated metadata handling.

## Visual Flow Diagram

```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  App Bootstrap      │────>│  Image Service    │────>│  Backend API    │
│  (AppModule)        │     │  Initialization   │     │  (HTTP GET)     │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
                                     │                         │
                                     │                         │
                                     │                         │
                                     ▼                         │
┌─────────────────────┐     ┌───────────────────┐             │
│                     │     │                   │             │
│  Gallery Component  │<────│  BehaviorSubject  │<────────────┘
│  (Display Images)   │     │  (Image List)     │  Images Array
│                     │     │                   │
└─────────────────────┘     └───────────────────┘
         │
         │ User selects image
         │
         ▼
┌─────────────────────┐
│                     │
│  DICOM Viewer       │
│  Component          │
│  (Display Image)    │
│                     │
└─────────────────────┘
         │
         │ First fetch metadata
         ▼
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  API Request        │────>│  Image Service    │────>│  Backend API    │
│  (Get Metadata)     │     │  getMetadata()    │     │  /metadata      │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
         │                                                    │
         │                                                    │
         │                                                    │
         ▼                                                    │
┌─────────────────────┐     ┌───────────────────┐             │
│                     │     │                   │             │
│  DicomMetadata      │<────│  DicomData Table  │<────────────┘
│  Object (initial)   │     │  (Database)       │  Metadata Fields
│                     │     │                   │
└─────────────────────┘     └───────────────────┘
         │
         │ Then load DICOM file
         │
         ▼
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  Cornerstone.js     │────>│  WADO Image       │────>│  Backend API    │
│  (Render DICOM)     │     │  Loader           │     │  (Get DICOM)    │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
         │
         │ Extract additional metadata
         │
         ▼
┌─────────────────────┐
│                     │
│  Merge Metadata     │
│  (API + DICOM File) │
│                     │
└─────────────────────┘
         │
         │ Display & save merged metadata
         │
         ▼
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  Display Image      │     │  Update Metadata  │────>│  Backend API    │
│  & Metadata         │     │  PUT Request      │     │  Save Metadata  │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
```

## Detailed Process Flow

### 1. Application Startup

When the Angular application starts, the following process takes place:

```typescript
// Root module initialization (app.module.ts)
@NgModule({
  declarations: [...],
  imports: [...],
  providers: [ImageService], // Service is registered here
  bootstrap: [AppComponent]
})
export class AppModule { }
```

**Key Steps:**
1. Angular bootstraps the application
2. Angular's dependency injection system prepares to inject services
3. `ImageService` is instantiated when first requested (lazy initialization)

### 2. ImageService Initialization

When the `ImageService` is first injected into any component, its constructor runs:

```typescript
// image.service.ts
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:5028/api/image';
  private images = new BehaviorSubject<DicomImage[]>([]);

  constructor(private http: HttpClient) {
    this.loadImages(); // Initial server request
  }
  
  // ...
}
```

**Key Steps:**
1. `BehaviorSubject` is created with an empty array as initial value
2. Constructor calls `loadImages()` method
3. HTTP request is made to the backend API

### 3. Initial Data Loading

The `loadImages()` method in the service makes an HTTP request and updates the BehaviorSubject:

```typescript
// image.service.ts
loadImages() {
  this.http.get<DicomImage[]>(this.apiUrl)
    .subscribe({
      next: (images) => {
        console.log('DICOM images loaded from server:', images);
        this.images.next(images);  // <-- Updates the BehaviorSubject
      },
      error: (error) => {
        console.error('Error loading DICOM images from server:', error);
        this.images.next([]);
      }
    });
}
```

**Key Steps:**
1. HTTP GET request is made to the backend API
2. When response arrives, the `next()` method is called on the BehaviorSubject
3. All subscribers to the BehaviorSubject are notified with the new image list

### 4. Gallery Component Initialization

When the GalleryComponent is loaded, it subscribes to the ImageService:

```typescript
// gallery.component.ts
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
  
  // ...
}
```

**Key Steps:**
1. Component's `ngOnInit` lifecycle hook calls `loadImages()`
2. Component subscribes to the service's Observable via `getImages()`
3. If the BehaviorSubject already has data (from step 3), it immediately receives it
4. Component updates its `allImages` property with the received data
5. Angular's change detection renders the gallery view with the images

### 5. Image Selection Process

When a user clicks on an image in the gallery:

```typescript
// gallery.component.ts
selectImage(image: DicomImage) {
  this.selectedImage = image;
}
```

**Key Steps:**
1. User clicks an image in the UI
2. Click event calls `selectImage()` method
3. Component updates `selectedImage` property
4. Angular's change detection triggers updates in the view
5. The DicomViewerComponent receives the selected image via its @Input property

### 6. Metadata Fetching

The DicomViewerComponent first fetches metadata from the API:

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
      // First fetch metadata from API to ensure we have database values
      this.fetchMetadataFromApi();
      
      // Then load the DICOM image with slight delay to ensure API fetch completes
      setTimeout(() => {
        this.loadAndDisplayImage();
      }, 100);
    }
  }
}

private fetchMetadataFromApi(): void {
  if (!this.selectedImage) return;
  
  // Initialize metadata with empty values first
  this.dicomMetadata = {
    // Patient information
    patientName: '',
    patientId: '',
    // ... other fields initialized ...
  };
  
  this.imageService.getImageMetadata(this.selectedImage.id).subscribe({
    next: (response) => {
      // Map API field names to frontend field names when needed
      const mappedMetadata = {
        // ... mapping fields ...
      };
      
      // Copy all mapped non-null, non-empty values
      Object.keys(mappedMetadata).forEach(key => {
        const value = (mappedMetadata as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          (this.dicomMetadata as any)[key] = value;
        }
      });
    },
    error: (error) => {
      console.error('Error fetching metadata from API:', error);
    }
  });
}
```

**Key Steps:**
1. Component detects a new selected image
2. Initializes an empty metadata object with default values
3. API request is made to fetch metadata for the selected image
4. Received metadata is mapped to the DicomMetadata interface
5. Values are copied into the metadata object

### 7. DICOM File Loading

After fetching metadata, the component loads the actual DICOM file:

```typescript
loadAndDisplayImage(): void {
  // ... setup code ...
  
  // Create the imageId for wado
  const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
  
  // Load and display the image
  cornerstone.loadAndCacheImage(imageId)
    .then(image => {
      this.displayImage(image);
      this.extractDicomMetadata(image);
      // ... state updates ...
    })
    .catch(error => {
      // ... error handling ...
    });
}
```

**Key Steps:**
1. Component creates a WADO URI for the DICOM file
2. Cornerstone.js loads the file via HTTP
3. Image is displayed in the viewport
4. Additional metadata is extracted from the DICOM file

### 8. Metadata Merging

The component merges metadata from both sources:

```typescript
extractDicomMetadata(image: cornerstone.Image): void {
  try {
    // Access the dataset from the image object
    const dataset = (image as any).data.elements;

    // Create metadata object from DICOM tags
    const extractedMetadata = {
      // ... extract all metadata fields from DICOM tags ...
    };
    
    // Merge extracted metadata with existing metadata (if any)
    // Priority: values from DB (this.dicomMetadata) > values from DICOM file (extractedMetadata)
    if (this.dicomMetadata) {
      // Create a copy of the current metadata
      const mergedMetadata = { ...this.dicomMetadata } as DicomMetadata;
      
      // For each key in extracted metadata
      Object.keys(extractedMetadata).forEach(key => {
        // If current metadata doesn't have this value, use the extracted one
        if (!mergedMetadata[key] || 
            mergedMetadata[key] === '' || 
            mergedMetadata[key] === null || 
            mergedMetadata[key] === undefined || 
            mergedMetadata[key] === 0 ||
            mergedMetadata[key] === 'Not available') {
          mergedMetadata[key] = (extractedMetadata as any)[key];
        }
      });
      
      this.dicomMetadata = mergedMetadata;
    } else {
      // No existing metadata, use extracted
      this.dicomMetadata = extractedMetadata as DicomMetadata;
    }

    // Save metadata to server for storage
    this.saveMetadataToServer();
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
  }
}
```

**Key Steps:**
1. Extracts metadata from the loaded DICOM file
2. Merges it with the metadata from the API
3. Database values take priority over file values
4. Missing values in database are filled with values from the file
5. Complete metadata is saved back to the server

### 9. Metadata Display and Update

The component displays metadata and allows toggling its visibility:

```typescript
toggleMetadata(): void {
  this.showMetadata = !this.showMetadata;
}

private saveMetadataToServer(): void {
  if (!this.dicomMetadata || !this.selectedImage) return;
  
  // Create payload with image ID and extracted metadata
  const payload = {
    imageId: this.selectedImage.id,
    metadata: this.dicomMetadata
  };
  
  // Send metadata to server for storage in SQL database
  this.imageService.updateImageMetadata(payload).subscribe({
    next: (response) => {
      console.log('Metadata saved to server:', response);
    },
    error: (error) => {
      console.error('Error saving metadata to server:', error);
    }
  });
}
```

**Key Features:**
1. Complete metadata can be toggled on/off in the UI
2. Merged metadata is sent back to the server
3. Backend stores the complete metadata in the DicomData table

## Understanding the Consolidated Database Approach

### Single Table Design

The application uses a consolidated `DicomData` table that contains:
1. Image file information (path, filename)
2. Complete DICOM metadata (patient, study, series, etc.)
3. Annotation data (when present)

This single-table approach offers several benefits:
- No joins needed to fetch complete information
- Simplified API endpoints
- Reduced complexity in database queries
- Single source of truth for all image data

### Metadata Prioritization

The application uses a clear priority for metadata values:
1. Values from the database (from previous user edits or uploads)
2. Values extracted from the DICOM file itself
3. Default values for missing fields

This ensures data consistency while still displaying all available information.

## Summary of Complete Application Flow

1. **Startup**:
   - App bootstraps
   - ImageService initializes
   - Initial HTTP request made
   - BehaviorSubject updated with image list

2. **Gallery Viewing**:
   - Gallery component subscribes to image list
   - Images displayed in UI
   - User views available DICOM images

3. **Image Selection**:
   - User clicks an image
   - Selected image passed to DICOM viewer
   - Viewer begins loading process

4. **Metadata Loading**:
   - API request fetches metadata from DicomData table
   - Metadata initialized with default values
   - API response mapped to frontend model

5. **DICOM Viewing**:
   - Specific DICOM file requested from server
   - File loaded and parsed by Cornerstone.js
   - Additional metadata extracted from file
   - Metadata from both sources merged
   - Image rendered in viewport
   - User can toggle metadata display
   - User can interact with image (zoom, pan)

6. **Metadata Update**:
   - Complete metadata saved back to server
   - DicomData table updated with merged values
   - Single source of truth maintained

This complete flow demonstrates how the consolidated approach creates a more robust and maintainable application architecture with consistent metadata handling.

## Understanding BehaviorSubject and The Observer Pattern

### What is a BehaviorSubject?

A `BehaviorSubject` is a special type of RxJS Subject that:
1. Requires an initial value when created
2. Emits its current value to new subscribers
3. Maintains a "current value" that can be accessed anytime
4. Notifies all subscribers when that value changes

### Why Use This Pattern?

The BehaviorSubject pattern is ideal for managing application state because:

1. **Decoupling**: Components don't need to know where the data comes from
2. **Caching**: The service can cache data and avoid repeated HTTP requests
3. **Reactivity**: Components automatically update when data changes
4. **Consistency**: All components see the same data at the same time
5. **Late subscribers**: Components can subscribe at any time and get current data

### Real-world Analogy

Think of a BehaviorSubject like a news bulletin board in a town square:

1. When first installed, it starts with an initial notice (initial value)
2. New people who visit the square immediately see the current notices (new subscribers get current value)
3. When new notices are posted (calling `next()`), everyone in the square is alerted
4. People can come and go, but the board always shows the latest notices
5. The town clerk can check what's currently posted without waiting for updates (getValue())

### Code Example with Real Situation

```typescript
// ImageService holds a BehaviorSubject of DICOM images
private images = new BehaviorSubject<DicomImage[]>([]);  // Initially empty

// In a real app scenario:
// 1. App starts with no images
// 2. Component A subscribes → gets empty array []
// 3. HTTP request completes → images.next([img1, img2])
// 4. Component A receives update → [img1, img2]
// 5. Component B subscribes later → immediately gets [img1, img2]
// 6. User uploads new image → images.next([img1, img2, img3])
// 7. Both Component A and B receive update → [img1, img2, img3]
```

### Why Use This Pattern?

The BehaviorSubject pattern is ideal for managing application state because:

1. **Decoupling**: Components don't need to know where the data comes from
2. **Caching**: The service can cache data and avoid repeated HTTP requests
3. **Reactivity**: Components automatically update when data changes
4. **Consistency**: All components see the same data at the same time
5. **Late subscribers**: Components can subscribe at any time and get current data

## Summary of Complete Application Flow

1. **Startup**:
   - App bootstraps
   - ImageService initializes
   - Initial HTTP request made
   - BehaviorSubject updated with image list

2. **Gallery Viewing**:
   - Gallery component subscribes to image list
   - Images displayed in UI
   - User views available DICOM images

3. **Image Selection**:
   - User clicks an image
   - Selected image passed to DICOM viewer
   - Viewer begins loading process

4. **Metadata Loading**:
   - API request fetches metadata from DicomData table
   - Metadata initialized with default values
   - API response mapped to frontend model

5. **DICOM Viewing**:
   - Specific DICOM file requested from server
   - File loaded and parsed by Cornerstone.js
   - Additional metadata extracted from file
   - Metadata from both sources merged
   - Image rendered in viewport
   - User can toggle metadata display
   - User can interact with image (zoom, pan)

6. **Metadata Update**:
   - Complete metadata saved back to server
   - DicomData table updated with merged values
   - Single source of truth maintained

This complete flow demonstrates how the consolidated approach creates a more robust and maintainable application architecture with consistent metadata handling. 