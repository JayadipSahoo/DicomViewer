# DICOM Metadata Flow

## Overview

This document explains the complete lifecycle of DICOM metadata in our application - from extraction during upload, through storage, to retrieval and display in the frontend. Understanding how metadata flows through the system is crucial for both development and maintenance.

## Visual Flow Diagram

```
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────┐
│  User      │     │   Frontend     │     │    Backend       │     │   Database     │     │  File       │
│  Browser   │────>│   Angular      │────>│    .NET Core     │────>│   SQL Server   │     │  System     │
└─────────────┘     └────────────────┘     └──────────────────┘     └────────────────┘     └─────────────┘
      │                     │                      │                        │                     │
      │                     │                      │                        │                     │
      │  1. SELECT DICOM    │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │                     │  2. READ DICOM       │                        │                     │
      │                     │  & EXTRACT METADATA  │                        │                     │
      │                     │  (dicomParser.js)    │                        │                     │
      │                     │                      │                        │                     │
      │                     │  3. SEND FILE +      │                        │                     │
      │                     │  JSON METADATA       │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │                        │                     │
      │                     │                      │  4. STORE FILE         │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  5. SAVE METADATA      │                     │
      │                     │                      │  TO DATABASE           │                     │
      │                     │                      │─────────────────────>  │                     │
      │                     │                      │                        │                     │
      │                     │  6. CONFIRM UPLOAD   │                        │                     │
      │                     │  WITH BASIC METADATA │                        │                     │
      │                     │<─────────────────────                         │                     │
      │                     │                      │                        │                     │
      │                     ├──────────────────────┘                        │                     │
      │                     │                                               │                     │
      │                     │                            LATER - VIEWING    │                     │
      │                     │                                               │                     │
      │  7. REQUEST LIST    │                                               │                     │
      │  OF IMAGES          │                                               │                     │
      │─────────────────────>                                               │                     │
      │                     │                                               │                     │
      │                     │  8. GET ALL IMAGES                            │                     │
      │                     │  WITH METADATA       │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │  9. QUERY METADATA     │                     │
      │                     │                      │───────────────────────>│                     │
      │                     │                      │                        │                     │
      │                     │                      │  10. RETURN            │                     │
      │                     │                      │  METADATA RECORDS      │                     │
      │                     │                      │<───────────────────────│                     │
      │                     │                      │                        │                     │
      │                     │  11. RETURN IMAGE    │                        │                     │
      │                     │  LIST WITH METADATA  │                        │                     │
      │                     │<─────────────────────                         │                     │
      │                     │                      │                        │                     │
      │  12. DISPLAY IMAGE  │                      │                        │                     │
      │  LIST WITH METADATA │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
      │                     │                      │                        │                     │
      │  13. SELECT IMAGE   │                      │                        │                     │
      │  TO VIEW            │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │                     │  14. REQUEST IMAGE   │                        │                     │
      │                     │  BY ID               │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │  15. GET FILE PATH     │                     │
      │                     │                      │───────────────────────>│                     │
      │                     │                      │                        │                     │
      │                     │                      │  16. RETURN PATH       │                     │
      │                     │                      │<───────────────────────│                     │
      │                     │                      │                        │                     │
      │                     │                      │  17. READ FILE FROM    │                     │
      │                     │                      │  DISK                  │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  18. RETURN DICOM      │                     │
      │                     │                      │  FILE BYTES            │                     │
      │                     │                      │<─────────────────────────────────────────────│
      │                     │                      │                        │                     │
      │                     │  19. RETURN DICOM    │                        │                     │
      │                     │  FILE BYTES          │                        │                     │
      │                     │<─────────────────────                         │                     │
      │                     │                      │                        │                     │
      │                     │  20. PARSE DICOM     │                        │                     │
      │                     │  & EXTRACT METADATA  │                        │                     │
      │                     │  (Cornerstone)       │                        │                     │
      │                     │                      │                        │                     │
      │  21. DISPLAY IMAGE  │                      │                        │                     │
      │  WITH METADATA      │                      │                        │                     │
      │  OVERLAYS           │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
```

## Detailed Flow Analysis

### Phase 1: Metadata Extraction and Storage (Upload Flow)

#### 1. User Selects DICOM File
- User navigates to the upload page
- User selects a DICOM (.dcm) file using the file input control
- The file is stored in memory on the client-side

#### 2. Frontend Metadata Extraction
```typescript
// In image.service.ts
private parseMetadataFromFile(file: File): Observable<DicomMetadata | null> {
  return new Observable(observer => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          observer.error('Failed to read file as ArrayBuffer');
          return;
        }
        
        // Parse DICOM data
        const byteArray = new Uint8Array(arrayBuffer);
        let dataset = dicomParser.parseDicom(byteArray);
        
        // Extract tag values
        const getTag = (tag: string): string => {
          try {
            const value = dataset.string(tag);
            if (value) return value;
            return '';
          } catch (error) {
            return '';
          }
        };
        
        // Create metadata object with extracted values
        const metadata: DicomMetadata = {
          patientName: getTag('00100010') || '',
          patientId: getTag('00100020') || '',
          patientBirthDate: formatDate(getTag('00100030') || ''),
          // ... other metadata fields ...
        };
        
        observer.next(metadata);
        observer.complete();
        
      } catch (error) {
        console.error('Error parsing DICOM file:', error);
        observer.next(null);
        observer.complete();
      }
    };
    
    // Read the file as ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}
```

- The frontend uses dicomParser.js to read the binary DICOM file
- It extracts standard DICOM tags (patient information, study details, etc.)
- The extracted metadata is converted into a structured `DicomMetadata` object
- Key tags extracted include:
  - Patient Name, ID, Birth date, Sex
  - Study Instance UID, Study ID, Date
  - Series Instance UID, Number, Description
  - Modality
  - Image dimensions (rows, columns)
  - Window settings (level/width for proper display)

#### 3. Upload File with Metadata
```typescript
uploadImage(file: File): Observable<any> {
  // Create FormData to send the file
  const formData = new FormData();
  formData.append('file', file, file.name);
  
  // Parse metadata and include it in the upload
  return this.parseMetadataFromFile(file).pipe(
    map(metadata => {
      // Add metadata to form data
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      // Send file with metadata to server
      return this.http.post<any>(this.apiUrl, formData);
    }),
    switchMap((observable: Observable<any>) => observable)
  );
}
```

- The DICOM file and extracted metadata are packaged together
- Metadata is JSON-stringified and added to the form data
- Both are sent to the backend in a single HTTP POST request

#### 4-5. Backend Processing and Storage
```csharp
// In ImageController.cs
[HttpPost("upload")]
public async Task<IActionResult> UploadImage(IFormFile file)
{
    // ... file validation and saving ...
    
    // Save file to disk
    string uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
    string filePath = Path.Combine(_uploadsFolder, uniqueFileName);
    using (var fileStream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(fileStream);
    }
    
    // Check if metadata was sent
    string metadataJson = Request.Form["metadata"];
    DicomMetadata? dicomMetadata = null;
    
    if (!string.IsNullOrEmpty(metadataJson))
    {
        try {
            dicomMetadata = JsonSerializer.Deserialize<DicomMetadata>(metadataJson, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex) {
            _logger.LogWarning(ex, "Error deserializing DICOM metadata");
            // Continue with default values if metadata parsing fails
        }
    }
    
    // Create database record with metadata
    var image = new Image {
        Name = file.FileName,
        FilePath = uniqueFileName,
        ContentType = "application/dicom",
        FileSize = file.Length,
        // ... other basic properties ...
    };
    
    // Apply metadata from JSON if available
    if (dicomMetadata != null) {
        image.PatientName = dicomMetadata.PatientName;
        image.PatientId = dicomMetadata.PatientId;
        // ... copy all metadata fields ...
    }
    else {
        // Set default values if no metadata provided
        image.PatientName = "Unknown";
        image.PatientId = "Unknown";
    }
    
    // Save to database
    _context.Images.Add(image);
    await _context.SaveChangesAsync();
    
    // Return basic info to confirm upload
    return Ok(new {
        id = image.Id,
        name = image.Name,
        patientName = image.PatientName,
        // ... other basic info ...
        message = "DICOM image uploaded successfully"
    });
}
```

- The backend saves the DICOM file to the filesystem with a unique name
- Extracts and deserializes the JSON metadata if provided
- Creates a database record with the file information and metadata
- Uses default values for critical fields if metadata is missing
- The database now contains a comprehensive record with all DICOM metadata

#### 6. Upload Confirmation
- The backend returns a success response with basic metadata
- The frontend updates the UI to show the upload was successful

### Phase 2: Metadata Retrieval and Display (Viewing Flow)

#### 7-12. Listing Images with Metadata
```csharp
// In ImageController.cs
[HttpGet]
public async Task<IActionResult> GetAllImages()
{
    try
    {
        var images = await _context.Images
            .Select(i => new { 
                i.Id, 
                i.Name,
                i.PatientId,
                i.PatientName,
                i.PatientBirthDate,
                i.PatientSex,
                i.Modality,
                i.StudyInstanceUid,
                i.StudyDate,
                i.SeriesDescription,
                // ... other metadata fields ...
                dicomUrl = $"/api/image/{i.Id}" 
            })
            .ToListAsync();

        return Ok(images);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving images");
        return StatusCode(500, "Error retrieving images");
    }
}
```

- The frontend requests a list of all available DICOM images
- The backend queries the database for all image records
- Includes all stored metadata in the response
- Returns a structured JSON response with metadata and image URLs
- The frontend displays this list with key metadata fields (patient name, study date, etc.)

#### 13-21. Viewing Single Image with Metadata

```typescript
// In dicom-viewer.component.ts
loadAndDisplayImage(): void {
  // ... setup and validation ...
  
  const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
  
  cornerstone.loadAndCacheImage(imageId)
    .then(image => {
      // Display the image
      cornerstone.displayImage(this.element, image);
      
      // Access metadata from cornerstone image object
      const metadata = cornerstone.metaData.get('patient', imageId);
      const studyMetadata = cornerstone.metaData.get('study', imageId);
      
      // Update UI with metadata
      this.patientName = metadata.patientName;
      this.patientId = metadata.patientId;
      this.studyDate = studyMetadata.studyDate;
      // ... other metadata fields ...
      
      // Apply window settings from metadata
      this.viewport = cornerstone.getViewport(this.element);
      if (image.windowCenter !== undefined && image.windowWidth !== undefined) {
        this.viewport.voi.windowCenter = image.windowCenter;
        this.viewport.voi.windowWidth = image.windowWidth;
      }
      cornerstone.setViewport(this.element, this.viewport);
    });
}
```

- User selects an image to view from the list
- Frontend requests the specific image by ID
- Backend:
  1. Queries database for image metadata and file path
  2. Reads the DICOM file from disk
  3. Returns raw DICOM file bytes
- Frontend (Cornerstone.js):
  1. Parses the raw DICOM data
  2. Extracts metadata again (from the actual file)
  3. Uses metadata for:
     - Displaying patient/study information
     - Setting correct window level/width for optimal display
     - Providing zoom/pan reference values
     - Adding image annotations if available
  4. Renders the image with metadata overlays

## Key Metadata Components

### 1. DICOM Tags Extracted and Stored

| Tag          | Description            | Usage                        |
|--------------|------------------------|------------------------------|
| 00100010     | Patient Name           | Identification, List Display |
| 00100020     | Patient ID             | Identification, Grouping     |
| 00100030     | Patient Birth Date     | Patient Information          |
| 00100040     | Patient Sex            | Patient Information          |
| 00080060     | Modality               | Filtering, Display           |
| 00280010     | Rows                   | Image Display                |
| 00280011     | Columns                | Image Display                |
| 00080008     | Image Type             | Classification               |
| 00200010     | Study ID               | Grouping, Organization       |
| 0020000D     | Study Instance UID     | Unique Study Identifier      |
| 00080020     | Study Date             | Temporal Organization        |
| 00080030     | Study Time             | Temporal Organization        |
| 0020000E     | Series Instance UID    | Series Grouping              |
| 00200011     | Series Number          | Series Ordering              |
| 0008103E     | Series Description     | Display, Search              |
| 00180015     | Body Part              | Anatomical Reference         |
| 00200013     | Instance Number        | Image Ordering               |
| 00281050     | Window Center          | Display Contrast Setting     |
| 00281051     | Window Width           | Display Contrast Range       |

### 2. Database Storage Model

```csharp
public class Image
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public required string Name { get; set; }
    
    [Required]
    public required string FilePath { get; set; }
    
    [Required]
    public required string ContentType { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // File information
    public long FileSize { get; set; }

    // DICOM specific metadata
    public string? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }
    public string? Modality { get; set; }
    public int? Rows { get; set; }
    public int? Columns { get; set; }
    public string? ImageType { get; set; }
    public string? StudyId { get; set; }
    public string? StudyInstanceUid { get; set; }
    public DateTime? StudyDate { get; set; }
    public string? StudyTime { get; set; }
    public string? SeriesInstanceUid { get; set; }
    public string? SeriesNumber { get; set; }
    public string? SeriesDescription { get; set; }
    public string? BodyPart { get; set; }
    public string? InstanceNumber { get; set; }
    public float? WindowCenter { get; set; }
    public float? WindowWidth { get; set; }
    // ... additional fields ...
}
```

## Different Metadata Paths in the System

### 1. Frontend-Extracted Metadata Path
- Extracted in browser using dicomParser.js
- Sent to backend with file in FormData
- Stored directly in database
- Used for quick listings and filtering

### 2. Backend Retrieval Metadata Path
- Database metadata queried from SQL
- Returned as JSON to frontend 
- Used for listings, filtering, and search

### 3. Direct DICOM File Metadata Path
- Original DICOM file retrieved from disk
- Sent to frontend as raw binary
- Re-parsed by Cornerstone.js
- Used for actual image rendering and display

## Metadata Use Cases

### 1. Search and Filter
- Patient name, ID, and demographics
- Study date and type
- Modality and body part
- Custom annotations and notes

### 2. Image Organization
- Grouping by study UID
- Sorting by series/instance numbers
- Filtering by modality or date

### 3. Display Optimization
- Window center/width for proper contrast
- Image dimensions for layout
- Pixel spacing for measurements
- Orientation for proper positioning

### 4. Clinical Context
- Patient information for identification
- Study context and acquisition parameters
- Anatomical references
- Diagnostic notes and annotations

## Summary

The DICOM metadata flow in this application follows a hybrid approach, where metadata is:

1. **Extracted twice**:
   - First in the frontend during upload (using dicomParser.js)
   - Again in the frontend during viewing (using Cornerstone.js)

2. **Stored in the database**:
   - Separated from the actual image data (stored on disk)
   - Linked to image via file paths and database relationships
   - Structured for efficient querying

3. **Used throughout the application**:
   - For image listings and search functionality
   - For proper image display and rendering
   - For contextual information about the patient and study

This approach provides optimal performance by keeping large binary data on the filesystem while making metadata quickly accessible through database queries. It also provides redundancy by allowing metadata to be re-extracted from the original files if needed.
