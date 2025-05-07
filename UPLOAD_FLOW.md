# DICOM Upload Flow Documentation

## Overview

This document explains the complete process of uploading DICOM files in our application, from the frontend user interface through the backend processing, filesystem storage, and metadata extraction.

## Visual Flow Diagram

```
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────┐
│  User      │     │   Frontend     │     │    Backend       │     │   Database     │     │  File       │
│  Browser   │────>│   Angular      │────>│    .NET Core     │────>│   SQL Server   │     │  System     │
└─────────────┘     └────────────────┘     └──────────────────┘     └────────────────┘     └─────────────┘
      │                     │                      │                        │                     │
      │  Select File        │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │                     │  Validate File       │                        │                     │
      │                     │  & Send to API       │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Server-side           │                     │
      │                     │                      │  File Validation       │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Generate Unique       │                     │
      │                     │                      │  Filename              │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Save DICOM File       │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  Create Initial        │                     │
      │                     │                      │  DicomData Record      │                     │
      │                     │                      │  with Default Values   │                     │
      │                     │                      │─────────────────────>  │                     │
      │                     │                      │                        │                     │
      │                     │  Return Success +    │                        │                     │
      │                     │  Image ID            │                        │                     │
      │  Show Success &     │<─────────────────────                         │                     │
      │  Redirect to Viewer │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
      │                     │                      │                        │                     │
      │  View Image         │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │  Load Image &        │                        │                     │
      │                     │  Extract Metadata    │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Update DicomData      │                     │
      │                     │                      │  with Complete         │                     │
      │                     │                      │  Metadata              │                     │
      │                     │                      │─────────────────────>  │                     │
      │                     │                      │                        │                     │
      │  Display Image      │                      │                        │                     │
      │  with Metadata      │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
```

## Step-by-Step Process

### 1. Frontend: User Interface (UploadComponent)

**File Selection:**
- User navigates to the upload page
- User selects a DICOM (.dcm) file using the file input control
- Component stores the selected file in memory

**File Validation:**
```typescript
private validateFile(file: File): boolean {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.dcm')) {
    this.errorMessage = 'Please select a valid DICOM (.dcm) file';
    return false;
  }
  
  // Check file size
  if (file.size > this.maxFileSize) {
    this.errorMessage = `File is too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`;
    return false;
  }
  
  return true;
}
```

**Upload Triggering:**
- When user clicks the upload button, `uploadFile()` method is called
- Upload progress indicator is displayed
- The file is passed to the DICOM service

### 2. Frontend: Service Layer (ImageService)

**HTTP Request Preparation:**
```typescript
uploadDicomFile(file: File): Observable<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  return this.http.post(`${this.apiUrl}/upload`, formData)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
}
```

- File is packaged into a FormData object (multipart/form-data format)
- HTTP POST request is made to the backend API endpoint
- Request includes retry logic and error handling

**Batch Upload Handling:**
```typescript
uploadImages(files: File[]): Observable<DicomImage[]> {
  // Create an array of upload observables
  const uploadObservables = files.map(file => {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<DicomImage>(`${this.apiUrl}/upload`, formData).pipe(
      tap(response => console.log(`Successfully uploaded ${file.name}:`, response)),
      catchError(error => {
        console.error(`Error uploading ${file.name}:`, error);
        return of(null);
      })
    );
  });

  // Use forkJoin to process all uploads in parallel
  return forkJoin(uploadObservables).pipe(
    map(results => results.filter((result): result is DicomImage => result !== null)),
    tap(successfulUploads => {
      if (successfulUploads.length > 0) {
        const currentImages = this.images.value;
        const updatedImages = [...currentImages, ...successfulUploads];
        this.images.next(updatedImages);
      }
    })
  );
}
```

- Multiple files can be uploaded in parallel using RxJS forkJoin
- Each file gets its own FormData object and HTTP request
- Successful uploads are tracked and combined into a single response
- Failed uploads are logged but don't prevent other files from being processed
- The BehaviorSubject is updated with the new images

### 3. Backend: API Controller (ImageController)

**File Reception and Validation:**
```csharp
[HttpPost("upload")]
public async Task<IActionResult> Upload(IFormFile file)
{
    if (file == null || file.Length == 0)
    {
        return BadRequest("No file uploaded");
    }
    
    try
    {
        _logger.LogInformation("Processing uploaded file: {FileName}, Size: {Size}", 
            file.FileName, file.Length);
        
        // Create directory if it doesn't exist
        var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "DICOM");
        if (!Directory.Exists(uploadDir))
        {
            Directory.CreateDirectory(uploadDir);
            _logger.LogInformation("Created directory: {Dir}", uploadDir);
        }
        
        // Generate unique filename to prevent overwriting
        var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
        var filePath = Path.Combine(uploadDir, uniqueFileName);
        
        _logger.LogInformation("Saving file to: {Path}", filePath);
        
        // Save the file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        // Create record in database with default values
        var dicomData = new DicomDataModel
        {
            FileName = file.FileName,
            FileSize = file.Length,
            StoragePath = filePath,
            UploadDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            
            // Add default values for all required fields
            HasAnnotations = false,
            AnnotationData = "{}",  // Default empty JSON object
            AnnotationLabel = "",
            AnnotationType = "",
            
            // Additional required fields with default values
            PatientName = "Anonymous",
            PatientId = "UNKNOWN",
            PatientSex = "U",
            
            Modality = "OT", // Other
            ImageType = "UNKNOWN",
            
            StudyId = "UNKNOWN",
            StudyInstanceUid = Guid.NewGuid().ToString(),
            StudyTime = DateTime.Now.ToString("HHmmss"),
            
            SeriesInstanceUid = Guid.NewGuid().ToString(),
            SeriesNumber = "1",
            SeriesDescription = "Imported Series",
            
            BodyPart = "UNKNOWN",
            
            InstanceNumber = "1"
        };
        
        _context.DicomData.Add(dicomData);
        await _context.SaveChangesAsync();
        
        // Return success response with basic information
        return Ok(new { 
            id = dicomData.Id,
            name = dicomData.FileName,
            patientName = dicomData.PatientName,
            patientId = dicomData.PatientId,
            modality = dicomData.Modality,
            studyInstanceUid = dicomData.StudyInstanceUid,
            message = "DICOM image uploaded successfully"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error uploading file: {FileName}", file?.FileName);
        return StatusCode(500, new { error = "Error uploading file", message = ex.Message });
    }
}
```

**Key Steps:**
1. Validate the uploaded file
2. Create upload directory if needed
3. Generate a unique filename for the uploaded file
4. Save the file to the filesystem
5. Create a new DicomDataModel record with:
   - Basic file information (name, size, path)
   - Default values for all required metadata fields
   - Empty annotation placeholders
6. Save the record to the consolidated DicomData table
7. Return success response with the image ID and basic information

### 4. Metadata Completion Process

After upload, when the user views the image for the first time, the following occurs:

**1. Metadata API Fetch:**
```typescript
// dicom-viewer.component.ts
private fetchMetadataFromApi(): void {
  if (!this.selectedImage) return;
  
  // Initialize metadata with empty values first
  this.dicomMetadata = {
    // Patient information
    patientName: '',
    patientId: '',
    patientBirthDate: '',
    patientSex: '',
    
    // ... other fields initialized ...
  };
  
  this.imageService.getImageMetadata(this.selectedImage.id).subscribe({
    next: (response) => {
      // Map API field names to frontend field names
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

**2. DICOM File Metadata Extraction:**
```typescript
// dicom-viewer.component.ts
extractDicomMetadata(image: cornerstone.Image): void {
  try {
    // Access the dataset from the image object
    const dataset = (image as any).data.elements;

    // Extract metadata from DICOM tags
    const extractedMetadata = {
      // Patient information
      patientName: this.getTagValue(dataset, 'x00100010') || this.getTagValue(dataset, 'PatientName'),
      patientId: this.getTagValue(dataset, 'x00100020') || this.getTagValue(dataset, 'PatientID'),
      
      // ... other fields extracted ...
    };
    
    // Merge extracted metadata with existing metadata
    // Priority: values from DB > values from DICOM file
    if (this.dicomMetadata) {
      const mergedMetadata = { ...this.dicomMetadata } as DicomMetadata;
      
      Object.keys(extractedMetadata).forEach(key => {
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
      this.dicomMetadata = extractedMetadata as DicomMetadata;
    }
    
    // Save complete metadata back to server
    this.saveMetadataToServer();
  } catch (error) {
    console.error('Error extracting DICOM metadata:', error);
  }
}
```

**3. Metadata Update to Server:**
```typescript
// dicom-viewer.component.ts
private saveMetadataToServer(): void {
  if (!this.dicomMetadata || !this.selectedImage) return;
  
  // Create payload with image ID and extracted metadata
  const payload = {
    imageId: this.selectedImage.id,
    metadata: this.dicomMetadata
  };
  
  // Send metadata to server for storage
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

**4. Backend Metadata Update:**
```csharp
// ImageController.cs
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
        
        // Update all metadata fields
        dicomData.PatientName = metadata.PatientName;
        dicomData.PatientId = metadata.PatientId;
        dicomData.PatientBirthDate = ParseDateOrNull(metadata.PatientBirthDate);
        dicomData.PatientSex = metadata.PatientSex;
        
        // ... update other fields ...
        
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

## Data Flow Summary

The upload and metadata process follows these stages:

1. **Initial Upload**:
   - File validation on frontend
   - File transfer via HTTP multipart/form-data
   - File storage on the server filesystem
   - Creation of initial DicomData record with default values
   - Return of basic image information to frontend

2. **First View Post-Upload**:
   - Frontend requests metadata for the image
   - Basic default metadata returned from DicomData table
   - DICOM file loaded and parsed by Cornerstone.js
   - Complete metadata extracted from DICOM file
   - Metadata merged (prioritizing existing values)
   - Complete metadata saved back to DicomData table

3. **Subsequent Views**:
   - Complete and accurate metadata available immediately
   - No need for re-extraction unless metadata changes
   - Single source of truth maintained in DicomData table

## Advantages of the Consolidated Approach

### 1. Database Structure

The consolidated DicomData table offers several advantages:

- **Complete Information**: All metadata, file references, and annotations in one place
- **Simplified Queries**: No joins needed to fetch complete information
- **Reduced Complexity**: Simpler API endpoints and frontend logic
- **Transaction Safety**: All related data updated in a single transaction

### 2. Metadata Management

The two-stage metadata process provides benefits:

- **Fast Initial Upload**: Files are uploaded and available immediately with basic placeholders
- **Progressive Enhancement**: Metadata is completed when the image is first viewed
- **Priority System**: Values in database take precedence over values in DICOM file
- **Completeness**: All relevant DICOM metadata fields are stored and available

### 3. Performance and Scalability

The approach balances performance and completeness:

- **Filesystem Storage**: Efficient for large binary files
- **Lazy Metadata Extraction**: Only performed when actually needed
- **Cached Results**: Extracted metadata stored for future use
- **Update Mechanism**: Simple way to correct or enhance metadata
- **Independent Scaling**: File storage can be migrated to distributed systems

## Future Enhancements

Potential improvements to the upload process include:

1. **Background Processing**: Move metadata extraction to a background job
2. **Better Validation**: Validate DICOM format before accepting upload
3. **Multiple Uploads**: Enhanced UI for batch uploading
4. **Progress Tracking**: Real-time progress for large files
5. **Client-Side Extraction**: Extract basic metadata in the browser before upload 