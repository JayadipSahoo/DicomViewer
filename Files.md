# ImageController.cs Explained

## Overview

The `ImageController.cs` file is a central component of the DICOM image management system, responsible for handling HTTP requests related to DICOM images. It provides endpoints for uploading, retrieving, listing, and deleting DICOM files, serving as the bridge between the frontend and the server's storage system.

## File Structure Breakdown

### Imports and Namespace Declaration

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using System.Net.Mime;
using System.IO.Compression;
using System.Text.Json;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageController : ControllerBase
    {
        // ...
    }
}
```

**Purpose:**
- Imports necessary libraries for web API functionality, database access, and file handling
- Defines the controller in the `API.Controllers` namespace
- Applies attributes that:
  - `[ApiController]`: Enables API-specific behaviors like automatic model validation
  - `[Route("api/[controller]")]`: Routes requests to "api/image" based on the controller name

### Private Fields and Constructor

```csharp
private readonly ApplicationDbContext _context;
private readonly ILogger<ImageController> _logger;
private readonly IWebHostEnvironment _environment;
private readonly string _uploadsFolder;

public ImageController(ApplicationDbContext context, ILogger<ImageController> logger, IWebHostEnvironment environment)
{
    _context = context; //dbcontext
    _logger = logger;
    _environment = environment;
    
    // Create uploads folder
    //constructs a full file system path 
    _uploadsFolder = Path.Combine(_environment.ContentRootPath, "Uploads", "DICOM");
    if (!Directory.Exists(_uploadsFolder))
    {
        Directory.CreateDirectory(_uploadsFolder);
    }
}
```

**Purpose:**
- **_context**: Database context for accessing the database through Entity Framework
- **_logger**: Logging service for recording operations and errors
- **_environment**: Provides information about the hosting environment
- **_uploadsFolder**: Path to the folder where DICOM files will be stored

**Constructor Operations:**
- Initializes dependencies through dependency injection
- Determines the absolute path for storing DICOM files (e.g., `C:\MyApp\Uploads\DICOM\`)
- Creates the upload directory if it doesn't exist
- This ensures the application has a place to store files as soon as it starts

### Upload Endpoint

```csharp
[HttpPost("upload")]
public async Task<IActionResult> UploadImage(IFormFile file)
{
    try
    {
        if (file == null || file.Length == 0)
        {
            _logger.LogWarning("Upload attempted with no file");
            return BadRequest("No file uploaded");
        }

        // Log the incoming file details
        _logger.LogInformation("File upload attempted: Name={Name}, ContentType={ContentType}, Length={Length}", 
            file.FileName, file.ContentType, file.Length);
        
        // Use file extension to determine if it's a DICOM file
        // We'll be more lenient with content type as browsers may not recognize DICOM correctly
        var isDicomFile = file.FileName.EndsWith(".dcm", StringComparison.OrdinalIgnoreCase) ||
                          file.ContentType.Equals("application/dicom", StringComparison.OrdinalIgnoreCase) ||
                          file.ContentType.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase);
        
        if (!isDicomFile)
        {
            _logger.LogWarning("Upload attempted with non-DICOM file: {ContentType}", file.ContentType);
            return BadRequest("Only DICOM files (.dcm) are supported");
        }

        // Generate unique filename for storage
        string uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        string filePath = Path.Combine(_uploadsFolder, uniqueFileName);
        
        // Save the file to disk
        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }
        
        _logger.LogInformation("DICOM file saved to disk: {FilePath}", filePath);

        // Check if metadata was sent with the file
        string metadataJson = Request.Form["metadata"];
        DicomMetadata? dicomMetadata = null;
        
        if (!string.IsNullOrEmpty(metadataJson))
        {
            try
            {
                _logger.LogInformation("Received DICOM metadata: {MetadataJson}", metadataJson);
                dicomMetadata = JsonSerializer.Deserialize<DicomMetadata>(metadataJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error deserializing DICOM metadata: {Message}", ex.Message);
                // Continue with upload even if metadata parsing fails
            }
        }

        // Create database record
        var image = new Image
        {
            Name = file.FileName,
            FilePath = uniqueFileName, // Only store the filename, not full path for security
            ContentType = "application/dicom",
            FileSize = file.Length,
            IsCompressed = false,
            UploadDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        // Apply metadata if provided
        if (dicomMetadata != null)
        {
            image.PatientName = dicomMetadata.PatientName;
            image.PatientId = dicomMetadata.PatientId;
            image.PatientBirthDate = dicomMetadata.PatientBirthDate;
            image.PatientSex = dicomMetadata.PatientSex;
            image.Modality = dicomMetadata.Modality;
            image.Rows = dicomMetadata.Rows;
            image.Columns = dicomMetadata.Columns;
            image.ImageType = dicomMetadata.ImageType;
            image.StudyId = dicomMetadata.StudyId;
            image.StudyInstanceUid = dicomMetadata.StudyInstanceUid;
            image.StudyDate = dicomMetadata.StudyDate;
            image.StudyTime = dicomMetadata.StudyTime;
            image.SeriesInstanceUid = dicomMetadata.SeriesInstanceUid;
            image.SeriesNumber = dicomMetadata.SeriesNumber;
            image.SeriesDescription = dicomMetadata.SeriesDescription;
            image.BodyPart = dicomMetadata.BodyPart;
            image.WindowCenter = dicomMetadata.WindowCenter;
            image.WindowWidth = dicomMetadata.WindowWidth;
            image.InstanceNumber = dicomMetadata.InstanceNumber;
            image.SopInstanceUid = dicomMetadata.SopInstanceUid;
            image.HasAnnotations = dicomMetadata.HasAnnotations ?? false;
            image.AnnotationType = dicomMetadata.AnnotationType;
            image.AnnotationLabel = dicomMetadata.AnnotationLabel;
            image.AnnotationData = dicomMetadata.AnnotationData;
        }
        else
        {
            // Set default placeholder values if no metadata was provided
            image.PatientName = "Unknown";
            image.PatientId = "Unknown";
        }

        _context.Images.Add(image);
        await _context.SaveChangesAsync();

        _logger.LogInformation("DICOM image record created successfully. ID: {Id}, Name: {Name}", image.Id, image.Name);
        return Ok(new { 
            id = image.Id, 
            name = image.Name, 
            patientName = image.PatientName,
            patientId = image.PatientId,
            modality = image.Modality,
            studyDate = image.StudyDate,
            seriesDescription = image.SeriesDescription,
            message = "DICOM image uploaded successfully" 
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error uploading DICOM image: {Message}", ex.Message);
        return StatusCode(500, $"Error uploading DICOM image: {ex.Message}");
    }
}
```

**Purpose and Workflow:**

1. **Input Validation**
   - Validates that a file was provided
   - Logs the incoming file details
   - Verifies that the file is a DICOM file based on extension or content type

2. **File Storage**
   - Generates a unique filename using GUID to prevent conflicts
   - Saves the file to the predetermined upload folder
   - Uses `await file.CopyToAsync(fileStream)` for efficient asynchronous file writing

3. **Metadata Handling**
   - Checks if metadata was provided in the request form
   - Deserializes JSON metadata into a strongly-typed object
   - Continues even if metadata parsing fails (graceful degradation)

4. **Database Record Creation**
   - Creates a new Image model with basic file information
   - Applies any metadata received with the file
   - Uses default values for critical fields if metadata is missing
   - Saves the record to the database

5. **Response Generation**
   - Returns a success status with key information about the uploaded image
   - Includes fields like ID, name, and patient information for frontend display

6. **Error Handling**
   - Wraps the entire process in a try-catch block
   - Logs exceptions in detail
   - Returns appropriate error responses

### GetImage Endpoint (Retrieve Single Image)

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetImage(int id)
{
    try
    {
        var image = await _context.Images.FindAsync(id);
        if (image == null)
        {
            _logger.LogWarning("Image not found with ID: {Id}", id);
            return NotFound($"Image with ID {id} not found");
        }

        // Get the full file path
        string filePath = Path.Combine(_uploadsFolder, image.FilePath);
        
        // Check if file exists
        if (!System.IO.File.Exists(filePath))
        {
            _logger.LogError("DICOM file not found on disk: {FilePath}", filePath);
            return NotFound($"DICOM file for image ID {id} not found on server");
        }

        // Read the file
        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);

        _logger.LogInformation("DICOM image retrieved successfully. ID: {Id}, Name: {Name}", image.Id, image.Name);
        return File(fileBytes, "application/dicom", image.Name);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving DICOM image with ID: {Id}", id);
        return StatusCode(500, "Error retrieving image");
    }
}
```

**Purpose and Workflow:**

1. **Database Lookup**
   - Retrieves the image metadata record from the database using the provided ID
   - Returns a 404 Not Found if no matching record exists

2. **File Validation**
   - Constructs the full file path using the stored filename
   - Verifies the file exists on disk
   - Returns a 404 Not Found if the file is missing

3. **File Reading**
   - Reads the entire file into memory as a byte array
   - Uses asynchronous method for efficiency

4. **Response Generation**
   - Returns the raw file bytes with the correct MIME type
   - Includes the original filename for download purposes
   - This raw binary is what Cornerstone.js will parse on the frontend

5. **Error Handling**
   - Logs exceptions in detail
   - Returns appropriate error responses

### DeleteImage Endpoint

```csharp
[HttpDelete("{id}")]
public async Task<IActionResult> DeleteImage(int id)
{
    try
    {
        var image = await _context.Images.FindAsync(id);
        if (image == null)
        {
            _logger.LogWarning("Delete attempted for non-existent image. ID: {Id}", id);
            return NotFound($"Image with ID {id} not found");
        }

        // Get the full file path
        string filePath = Path.Combine(_uploadsFolder, image.FilePath);
        
        // Delete file from disk if it exists
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
            _logger.LogInformation("DICOM file deleted from disk: {FilePath}", filePath);
        }

        // Remove database record
        _context.Images.Remove(image);
        await _context.SaveChangesAsync();

        _logger.LogInformation("DICOM image deleted successfully. ID: {Id}, Name: {Name}", id, image.Name);
        return Ok(new { message = $"DICOM image {image.Name} deleted successfully" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error deleting DICOM image with ID: {Id}", id);
        return StatusCode(500, "Error deleting image");
    }
}
```

**Purpose and Workflow:**

1. **Database Lookup**
   - Retrieves the image metadata record from the database
   - Returns a 404 Not Found if no matching record exists

2. **File Deletion**
   - Constructs the full file path
   - Deletes the file from disk if it exists
   - Continues even if the file is already missing

3. **Record Deletion**
   - Removes the database record
   - Commits the changes to the database

4. **Response Generation**
   - Returns a success message confirming deletion

5. **Error Handling**
   - Logs exceptions in detail
   - Returns appropriate error responses

### GetAllImages Endpoint

```csharp
[HttpGet]
public async Task<IActionResult> GetAllImages()
{
    try
    {
        var images = await _context.Images
            .Select(i => new { 
                i.Id, 
                i.Name, 
                i.CreatedAt,
                i.ModifiedAt,
                i.FileSize,
                i.UploadDate,
                i.LastAccessed,
                i.PatientId,
                i.PatientName,
                i.PatientBirthDate,
                i.PatientSex,
                i.Modality,
                i.Rows,
                i.Columns,
                i.ImageType,
                i.StudyId,
                i.StudyInstanceUid,
                i.StudyDate,
                i.StudyTime,
                i.SeriesInstanceUid,
                i.SeriesNumber,
                i.SeriesDescription,
                i.BodyPart,
                i.WindowCenter,
                i.WindowWidth,
                i.InstanceNumber,
                i.HasAnnotations,
                i.AnnotationType,
                i.AnnotationLabel,
                dicomUrl = $"/api/image/{i.Id}" 
            })
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} DICOM images from database", images.Count);
        return Ok(images);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving all DICOM images");
        return StatusCode(500, "Error retrieving images");
    }
}
```

**Purpose and Workflow:**

1. **Database Query**
   - Retrieves all image records from the database
   - Projects only necessary fields into an anonymous type
   - Generates a URL for each image using its ID

2. **Data Fetching**
   - Uses Entity Framework's async methods for efficient database access
   - Converts query results to a list in memory

3. **Response Generation**
   - Returns the list of images as JSON
   - Includes comprehensive metadata for each image
   - Adds a convenient `dicomUrl` to link directly to each image

4. **Error Handling**
   - Logs exceptions in detail
   - Returns appropriate error responses

### DicomMetadata Class Definition

```csharp
// Add class to deserialize metadata from JSON
public class DicomMetadata
{
    public string? PatientName { get; set; }
    public string? PatientId { get; set; }
    public string? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }
    public string? Modality { get; set; }
    public int? Rows { get; set; }
    public int? Columns { get; set; }
    public string? ImageType { get; set; }
    public string? StudyId { get; set; }
    public string? StudyInstanceUid { get; set; }
    public string? StudyDate { get; set; }
    public string? StudyTime { get; set; }
    public string? SeriesInstanceUid { get; set; }
    public string? SeriesNumber { get; set; }
    public string? SeriesDescription { get; set; }
    public string? BodyPart { get; set; }
    public string? WindowCenter { get; set; }
    public string? WindowWidth { get; set; }
    public string? InstanceNumber { get; set; }
    public string? SopInstanceUid { get; set; }
    public bool? HasAnnotations { get; set; }
    public string? AnnotationType { get; set; }
    public string? AnnotationLabel { get; set; }
    public string? AnnotationData { get; set; }
}
```

**Purpose:**
- Defines a model class for deserializing JSON metadata sent with DICOM uploads
- Matches the DICOM tag structure expected from the frontend
- Uses nullable types to handle missing metadata fields gracefully
- Supports the full range of DICOM metadata tags that might be extracted client-side

## Key Design Elements

### File Storage Strategy

The controller implements a hybrid storage approach:
- Actual DICOM files are stored on the filesystem for better performance with large files
- Metadata and file references are stored in the database for efficient querying
- Only the filename (not full path) is stored in the database for security

### Error Handling and Logging

- Comprehensive try-catch blocks around all operations
- Detailed logging at different severity levels:
  - Information for successful operations
  - Warning for non-critical issues
  - Error for exceptions
- Context-rich log messages with structured data

### Security Considerations

- Input validation to prevent malicious file uploads
- File extension and content type checking
- Unique filenames to prevent overwriting
- Storage path not exposed to clients

### Performance Optimizations

- Asynchronous operations throughout for non-blocking I/O
- Efficient file handling without loading entire files into memory
- Projection in queries to return only necessary data
- Single database roundtrip for listing images

## Technical Implementation Details

### File Handling

1. **Unique Filename Generation**
   ```csharp
   string uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
   ```
   - Combines a GUID with original filename to ensure uniqueness
   - Preserves original filename for identification
   - Prevents path traversal attacks by using Path.GetFileName

2. **Asynchronous File Operations**
   ```csharp
   await file.CopyToAsync(fileStream);
   var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
   ```
   - Uses modern async I/O for better performance
   - Prevents thread blocking during I/O operations

### Database Operations

1. **Entity Creation**
   ```csharp
   var image = new Image { /* properties */ };
   _context.Images.Add(image);
   await _context.SaveChangesAsync();
   ```
   - Creates entity object
   - Adds to DbContext tracking
   - Saves changes asynchronously

2. **Efficient Querying**
   ```csharp
   var images = await _context.Images.Select(i => new { /* properties */ }).ToListAsync();
   ```
   - Projects to anonymous type with only needed fields
   - Executes asynchronously
   - Materializes results with ToListAsync

### API Response Design

1. **Successful Responses**
   ```csharp
   return Ok(new { id = image.Id, name = image.Name, /* other properties */ });
   ```
   - Returns 200 OK status
   - Includes relevant data in consistent format
   - Uses anonymous types for flexible response structure

2. **Error Responses**
   ```csharp
   return NotFound($"Image with ID {id} not found");
   return BadRequest("Only DICOM files (.dcm) are supported");
   return StatusCode(500, "Error retrieving images");
   ```
   - Uses appropriate HTTP status codes
   - Includes clear error messages
   - Avoids exposing sensitive information

## Summary

The `ImageController.cs` file is a comprehensive API controller that handles all DICOM image operations:

- **Upload**: Validates, stores, and indexes DICOM files
- **Retrieve**: Fetches individual files for viewing
- **List**: Returns metadata for all stored images
- **Delete**: Removes files and their database records

It implements a hybrid storage approach (files on disk, metadata in database) for optimal performance and follows best practices for security, error handling, and asynchronous programming. 
