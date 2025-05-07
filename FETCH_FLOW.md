# DICOM Fetch and Viewing Flow Documentation

## Overview

This document explains the complete process of fetching and displaying DICOM files in our application, from the initial API request through rendering in the browser using Cornerstone.js, including the metadata consolidation process.

## Visual Flow Diagram

```
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────┐
│  User      │     │   Frontend     │     │    Backend       │     │   Database     │     │  File       │
│  Browser   │────>│   Angular      │────>│    .NET Core     │────>│   SQL Server   │     │  System     │
└─────────────┘     └────────────────┘     └──────────────────┘     └────────────────┘     └─────────────┘
      │                     │                      │                        │                     │
      │  Request Image      │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │  API Request         │                        │                     │
      │                     │─────────────────────>│                        │                     │
      │                     │                      │  Query Database        │                     │
      │                     │                      │───────────────────────>│                     │
      │                     │                      │                        │                     │
      │                     │                      │  Return Metadata       │                     │
      │                     │                      │  & File Path           │                     │
      │                     │                      │<───────────────────────│                     │
      │                     │                      │                        │                     │
      │                     │                      │  Read DICOM File       │                     │
      │                     │                      │  from Disk             │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  Return File           │                     │
      │                     │                      │  Binary Data           │                     │
      │                     │                      │<─────────────────────────────────────────────│
      │                     │                      │                        │                     │
      │                     │  Send DICOM binary   │                        │                     │
      │                     │<─────────────────────│                        │                     │
      │                     │                      │                        │                     │
      │  Request Metadata   │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │  API Get Metadata    │                        │                     │
      │                     │─────────────────────>│                        │                     │
      │                     │                      │  Query DicomData       │                     │
      │                     │                      │  Table                 │                     │
      │                     │                      │───────────────────────>│                     │
      │                     │                      │                        │                     │
      │                     │                      │  Return All            │                     │
      │                     │                      │  Metadata Fields       │                     │
      │                     │                      │<───────────────────────│                     │
      │                     │                      │                        │                     │
      │                     │  Return JSON         │                        │                     │
      │                     │  Metadata            │                        │                     │
      │                     │<─────────────────────│                        │                     │
      │                     │                      │                        │                     │
      │                     │  Parse DICOM with    │                        │                     │
      │                     │  Cornerstone WADO    │                        │                     │
      │                     │  Image Loader        │                        │                     │
      │                     │                      │                        │                     │
      │                     │  Merge API Metadata  │                        │                     │
      │                     │  with DICOM File     │                        │                     │
      │                     │  Metadata            │                        │                     │
      │                     │                      │                        │                     │
      │  Display Image with │                      │                        │                     │
      │  Cornerstone.js &   │                      │                        │                     │
      │  Show Metadata      │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
      │                     │                      │                        │                     │
      │  User Interacts     │                      │                        │                     │
      │  (Zoom, Pan, etc)   │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │  Cornerstone        │                      │                        │                     │
      │  Updates Display    │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
```

## Step-by-Step Process

### 1. Frontend: User Interface Initialization (DicomViewerComponent)

**Component Setup:**
```typescript
export class DicomViewerComponent implements AfterViewInit, OnChanges {
  @Input() selectedImage: DicomImage | null = null;
  @ViewChild('dicomContainer') dicomContainer!: ElementRef;
  
  private element: HTMLElement | null = null;
  private viewport: cornerstone.Viewport | null = null;
  private cornerstoneInitialized = false;
  
  isLoading = false;
  isImageLoaded = false;
  loadError: string | null = null;
  dicomMetadata: DicomMetadata | null = null;
  showMetadata = false;

  constructor(private imageService: ImageService) {
    // Initialize cornerstone and its dependencies
    this.initCornerstoneWADOImageLoader();
  }
  // ...
}
```

- Component receives a selectedImage input from parent component
- A DOM element is referenced via ViewChild for Cornerstone to render into
- State variables track loading status and errors
- dicomMetadata object will hold all metadata from both API and DICOM file
- Initialization of Cornerstone libraries happens in constructor

**Cornerstone Library Initialization:**
```typescript
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

- Cornerstone.js and related libraries are configured
- WADO Image Loader is connected to Cornerstone core
- dicomParser is registered for parsing DICOM files
- HTML element is enabled for Cornerstone rendering

### 2. Frontend: DICOM Image Load Request

**Image Loading Trigger:**
```typescript
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

- When selectedImage input changes, loading process begins
- State is reset for the new image
- First, we fetch metadata from the API to get database values
- A small delay ensures API fetch completes before loading the image
- loadAndDisplayImage method is called to fetch the actual DICOM file

### 3. Frontend: Metadata Fetch Process

**Fetching Metadata from API:**
```typescript
private fetchMetadataFromApi(): void {
  if (!this.selectedImage) return;
  
  // Initialize metadata with empty values first
  this.dicomMetadata = {
    // Patient information
    patientName: '',
    patientId: '',
    patientBirthDate: '',
    patientSex: '',
    
    // Modality information
    modality: '',
    rows: 0,
    columns: 0,
    imageType: '',
    
    // Study information
    studyId: '',
    studyInstanceUid: '',
    studyDate: '',
    studyTime: '',
    
    // Series information
    seriesInstanceUid: '',
    seriesNumber: '',
    seriesDescription: '',
    
    // Anatomical information
    bodyPart: '',
    
    // Image information
    imageId: '',
    instanceNumber: '',
    windowCenter: 0,
    windowWidth: 0
  };
  
  this.imageService.getImageMetadata(this.selectedImage.id).subscribe({
    next: (response) => {
      console.log('Raw API response:', response);
      
      // Create a proper typed object
      const metadata = response as any;
      
      // Map API field names to frontend field names when needed
      const mappedMetadata = {
        // Patient information
        patientName: metadata.patientName,
        patientId: metadata.patientId,
        patientBirthDate: metadata.patientBirthDate,
        patientSex: metadata.patientSex,
        
        // Modality information
        modality: metadata.modality,
        rows: metadata.rows,
        columns: metadata.columns,
        imageType: metadata.imageType,
        
        // Study information
        studyId: metadata.studyId,
        studyInstanceUid: metadata.studyInstanceUid,
        studyDate: metadata.studyDate,
        studyTime: metadata.studyTime,
        
        // Series information
        seriesInstanceUid: metadata.seriesInstanceUid,
        seriesNumber: metadata.seriesNumber,
        seriesDescription: metadata.seriesDescription,
        
        // Anatomical information
        bodyPart: metadata.bodyPart,
        
        // Image information
        instanceNumber: metadata.instanceNumber,
        windowCenter: metadata.windowCenter,
        windowWidth: metadata.windowWidth
      };
      
      // Copy all mapped non-null, non-empty values
      Object.keys(mappedMetadata).forEach(key => {
        const value = (mappedMetadata as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          (this.dicomMetadata as any)[key] = value;
        }
      });
      
      console.log('Metadata after API fetch:', this.dicomMetadata);
    },
    error: (error) => {
      console.error('Error fetching metadata from API:', error);
    }
  });
}
```

- First initializes an empty metadata object with all fields
- Makes HTTP request to the backend API to get metadata
- Maps API field names to frontend field names (handles potential naming discrepancies)
- Copies all non-null, non-empty values to the metadata object
- Logs the metadata for debugging purposes

### 4. Frontend: DICOM Image Loading Process

**Image Loading Process:**
```typescript
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

**Key Steps in This Process:**
1. Validation that all prerequisites are met
2. Set loading state to show progress indicator
3. Reset any existing image in the viewport
4. Create a WADO URI using the image's ID
5. Request image loading via Cornerstone
6. Upon success, display the image and extract metadata
7. Handle success or failure with appropriate UI updates

### 5. Frontend: Metadata Extraction and Merging

**Extracting Metadata from DICOM File:**
```typescript
extractDicomMetadata(image: cornerstone.Image): void {
  try {
    // Access the dataset from the image object
    const dataset = (image as any).data.elements;

    // Create metadata object from DICOM tags
    const extractedMetadata = {
      // Patient information
      patientName: this.getTagValue(dataset, 'x00100010') || this.getTagValue(dataset, 'PatientName'),
      patientId: this.getTagValue(dataset, 'x00100020') || this.getTagValue(dataset, 'PatientID'),
      patientBirthDate: this.formatDate(this.getTagValue(dataset, 'x00100030') || this.getTagValue(dataset, 'PatientBirthDate')),
      patientSex: this.getTagValue(dataset, 'x00100040') || this.getTagValue(dataset, 'PatientSex'),
      
      // Modality information
      modality: this.getTagValue(dataset, 'x00080060') || this.getTagValue(dataset, 'Modality'),
      rows: parseInt(this.getTagValue(dataset, 'x00280010') || this.getTagValue(dataset, 'Rows') || '0'),
      columns: parseInt(this.getTagValue(dataset, 'x00280011') || this.getTagValue(dataset, 'Columns') || '0'),
      imageType: this.getTagValue(dataset, 'x00080008') || this.getTagValue(dataset, 'ImageType'),
      
      // Study information
      studyId: this.getTagValue(dataset, 'x00200010') || this.getTagValue(dataset, 'StudyID'),
      studyInstanceUid: this.getTagValue(dataset, 'x0020000D') || this.getTagValue(dataset, 'StudyInstanceUID'),
      studyDate: this.formatDate(this.getTagValue(dataset, 'x00080020') || this.getTagValue(dataset, 'StudyDate')),
      studyTime: this.getTagValue(dataset, 'x00080030') || this.getTagValue(dataset, 'StudyTime'),
      
      // Series information
      seriesInstanceUid: this.getTagValue(dataset, 'x0020000E') || this.getTagValue(dataset, 'SeriesInstanceUID'),
      seriesNumber: this.getTagValue(dataset, 'x00200011') || this.getTagValue(dataset, 'SeriesNumber'),
      seriesDescription: this.getTagValue(dataset, 'x0008103E') || this.getTagValue(dataset, 'SeriesDescription'),
      
      // Anatomical information
      bodyPart: this.getTagValue(dataset, 'x00180015') || this.getTagValue(dataset, 'BodyPartExamined'),
      
      // Image information
      imageId: image.imageId,
      instanceNumber: this.getTagValue(dataset, 'x00200013') || this.getTagValue(dataset, 'InstanceNumber'),
      windowCenter: image.windowCenter || 0,
      windowWidth: image.windowWidth || 0
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

    // Log final metadata for debugging
    console.log('Final merged DICOM metadata:', this.dicomMetadata);

    // Send metadata to server for storage
    this.saveMetadataToServer();
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
  }
}
```

**Merging Process:**
1. Extract metadata from DICOM file using dicomParser
2. If we already have metadata from the API, merge the two sets
3. API metadata takes precedence (values from database override file values)
4. If a field is empty, null, undefined, 0, or "Not available" in API data, use the value from the DICOM file
5. After merging, save the complete metadata back to the server

### 6. Backend: API Controller (ImageController)

**DICOM Metadata Retrieval:**
```csharp
[HttpGet("{id}/metadata")]
public async Task<ActionResult> GetMetadata(int id)
{
    try
    {
        var dicomData = await _context.DicomData.FindAsync(id);
        
        if (dicomData == null)
        {
            _logger.LogWarning("Image not found: {Id}", id);
            return NotFound($"Image with ID {id} not found");
        }

        _logger.LogInformation("Retrieved DICOM data for metadata - ID: {Id}, StudyID: {StudyId}, StudyUID: {StudyUID}",
            dicomData.Id, dicomData.StudyId, dicomData.StudyInstanceUid);
        
        // Map to format frontend expects - include ALL fields from DicomMetadata interface
        // Force property names to camelCase to match JavaScript conventions
        var result = new {
            // Patient information
            patientName = dicomData.PatientName ?? string.Empty,
            patientId = dicomData.PatientId ?? string.Empty,
            patientBirthDate = dicomData.PatientBirthDate?.ToString("yyyy-MM-dd") ?? string.Empty,
            patientSex = dicomData.PatientSex ?? string.Empty,
            
            // Modality information
            modality = dicomData.Modality ?? string.Empty,
            rows = dicomData.Rows ?? 0,
            columns = dicomData.Columns ?? 0,
            imageType = dicomData.ImageType ?? string.Empty,
            
            // Study information
            studyId = dicomData.StudyId ?? string.Empty,
            studyInstanceUid = dicomData.StudyInstanceUid ?? string.Empty,
            studyDate = dicomData.StudyDate?.ToString("yyyy-MM-dd") ?? string.Empty,
            studyTime = dicomData.StudyTime ?? string.Empty,
            
            // Series information
            seriesInstanceUid = dicomData.SeriesInstanceUid ?? string.Empty,
            seriesNumber = dicomData.SeriesNumber ?? string.Empty,
            seriesDescription = dicomData.SeriesDescription ?? string.Empty,
            
            // Anatomical information
            bodyPart = dicomData.BodyPart ?? string.Empty,
            
            // Image information
            instanceNumber = dicomData.InstanceNumber ?? string.Empty,
            windowCenter = dicomData.WindowCenter ?? 0,
            windowWidth = dicomData.WindowWidth ?? 0
        };
        
        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving image metadata for ID: {Id}", id);
        return StatusCode(500, new { error = "Error retrieving image metadata", message = ex.Message });
    }
}
```

**Key Features:**
1. Queries the consolidated DicomData table for the image's metadata
2. Uses null-coalescing operators (`??`) to ensure no null values are returned
3. Properly formats dates and numeric values
4. Returns all metadata fields in a format that matches the frontend's expectations
5. Uses camelCase property names for JavaScript compatibility

### 7. Backend: Metadata Update Process

**Updating Metadata in Database:**
```csharp
[HttpPut("{id}/metadata")]
public async Task<IActionResult> UpdateMetadata(int id, [FromBody] DicomMetadataDto metadata)
{
    try
    {
        var dicomData = await _context.DicomData.FindAsync(id);
        if (dicomData == null)
        {
            _logger.LogWarning("Image not found when updating metadata: {Id}", id);
            return NotFound($"Image with ID {id} not found");
        }
        
        // Update metadata fields
        dicomData.PatientName = metadata.PatientName;
        dicomData.PatientId = metadata.PatientId;
        dicomData.PatientBirthDate = ParseDateOrNull(metadata.PatientBirthDate);
        dicomData.PatientSex = metadata.PatientSex;
        
        dicomData.Modality = metadata.Modality;
        dicomData.Rows = metadata.Rows;
        dicomData.Columns = metadata.Columns;
        dicomData.ImageType = metadata.ImageType;
        
        dicomData.StudyId = metadata.StudyId;
        dicomData.StudyInstanceUid = metadata.StudyInstanceUid;
        dicomData.StudyDate = ParseDateOrNull(metadata.StudyDate);
        dicomData.StudyTime = metadata.StudyTime;
        
        dicomData.SeriesInstanceUid = metadata.SeriesInstanceUid;
        dicomData.SeriesNumber = metadata.SeriesNumber;
        dicomData.SeriesDescription = metadata.SeriesDescription;
        
        dicomData.BodyPart = metadata.BodyPart;
        
        dicomData.WindowCenter = metadata.WindowCenter;
        dicomData.WindowWidth = metadata.WindowWidth;
        dicomData.InstanceNumber = metadata.InstanceNumber;
        
        dicomData.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("DICOM metadata updated successfully for image ID: {Id}", id);
        return Ok(new { message = "Metadata updated successfully" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating metadata for image ID: {Id}", id);
        return StatusCode(500, new { error = "Error updating metadata", message = ex.Message });
  }
}
```

**Key Features:**
1. Updates the consolidated DicomData table with merged metadata
2. All fields from the frontend are mapped to the database model
3. Dates are properly parsed and validated
4. UpdatedAt timestamp is automatically set for auditing
5. SaveChangesAsync commits the changes to the database

### 8. Frontend: Displaying Metadata

**HTML Template for Metadata Display:**
```html
<mat-card class="dicom-metadata" *ngIf="dicomMetadata && showMetadata">
  <mat-card-header>
    <mat-card-title>DICOM Metadata</mat-card-title>
    <button mat-icon-button class="close-metadata" (click)="toggleMetadata()">
      <mat-icon>close</mat-icon>
    </button>
  </mat-card-header>
  <mat-card-content>
    <div class="metadata-section">
      <h3>Patient Information</h3>
      <div class="metadata-row">
        <span class="metadata-label">Patient Name:</span>
        <span class="metadata-value">{{dicomMetadata.patientName || 'Not available'}}</span>
      </div>
      <!-- More patient fields... -->
    </div>

    <div class="metadata-section">
      <h3>Study Information</h3>
      <div class="metadata-row">
        <span class="metadata-label">Study ID:</span>
        <span class="metadata-value">{{dicomMetadata.studyId || 'Not available'}}</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Study Instance UID:</span>
        <span class="metadata-value" title="{{dicomMetadata.studyInstanceUid}}">
          {{dicomMetadata.studyInstanceUid || 'Not available'}}
        </span>
      </div>
      <!-- More study fields... -->
    </div>
    
    <!-- Additional metadata sections... -->
  </mat-card-content>
</mat-card>
```

**Key Features:**
1. Uses Angular's conditional display (`*ngIf`) to show metadata only when available
2. Organizes metadata into logical sections (Patient, Study, Series, etc.)
3. Uses fallback values ('Not available') when data is missing
4. Title attribute shows full text for long values like UIDs
5. Numerical values are properly checked before display

## Data Flow Summary

1. **Initial Load**:
   - Angular component initializes
   - Cornerstone libraries are prepared
   - User selects an image from gallery
   
2. **Metadata Retrieval**:
   - API request fetches metadata from DicomData table
   - Metadata is initialized with empty values in frontend
   - API response values are mapped to frontend model
   
3. **DICOM File Loading**:
   - Backend serves the raw DICOM file with proper MIME type
   - Cornerstone WADO Image Loader fetches and parses the file
   - Additional metadata is extracted from the DICOM file
   - Metadata from API and DICOM file are merged with priority to API values
   
4. **Rendering & Display**:
   - Cornerstone displays the image in the viewport
   - User can toggle metadata display
   - User can interact with the image (zoom, pan, etc.)
   - Merged metadata is saved back to the server

5. **Storage Architecture**:
   - Consolidated DicomData table holds all metadata and file references
   - DICOM files stored on filesystem for efficient retrieval
   - Metadata is synchronized between database and display

## Advantages of the Consolidated Approach

1. **Data Consistency**:
   - Single source of truth for metadata
   - No need to join multiple tables for complete information
   - Simplified API endpoints and database queries

2. **Complete Metadata**:
   - All DICOM metadata fields available in one place
   - Frontend can display comprehensive information
   - Better data for filtering and searching

3. **Efficient Updates**:
   - Merged metadata (from file and user edits) stored in one location
   - Simplified update process with a single table
   - Reduced risk of data inconsistency between tables

4. **Better Error Handling**:
   - Null-safe operations throughout the pipeline
   - Proper initialization with default values
   - Clear error messages and fallback displays

## Libraries and Technologies

### Cornerstone.js Ecosystem

**Core Libraries:**
- **cornerstone-core**: The main library for medical image display
- **cornerstone-wado-image-loader**: Loads DICOM images from WADO servers
- **dicom-parser**: Parses DICOM files into JavaScript objects

**How They Work Together:**
1. **dicom-parser**: Handles raw DICOM binary data parsing
2. **cornerstone-wado-image-loader**: Fetches and prepares DICOM images
3. **cornerstone-core**: Renders prepared images and manages viewport

### WADO URI Format

WADO (Web Access to DICOM Objects) is a standard for accessing DICOM objects over the web. The specific format used is:

```
wadouri:{url}
```

Where `{url}` is the URL to the DICOM file. This tells Cornerstone to use the WADO Image Loader to fetch and parse the DICOM file from the specified URL.
``` 