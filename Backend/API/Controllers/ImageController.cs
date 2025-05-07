using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using API.Models;
using API.Data;
using System.IO;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ImageController> _logger;
        
        public ImageController(ApplicationDbContext context, ILogger<ImageController> logger)
        {
            _context = context;
            _logger = logger;
        }
        
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DicomDataModel>>> GetAll()
        {
            try
            {
                var images = await _context.DicomData
                    .OrderByDescending(d => d.UploadDate)
                    .ToListAsync();
                
                // Map to format frontend expects
                var result = images.Select(img => new {
                    id = img.Id,
                    name = img.FileName,
                    patientName = img.PatientName,
                    patientId = img.PatientId,
                    modality = img.Modality,
                    studyInstanceUid = img.StudyInstanceUid,
                    createdAt = img.CreatedAt
                }).ToList();
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all images");
                return StatusCode(500, new { error = "Error retrieving images", message = ex.Message });
            }
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult> Get(int id)
        {
            try
            {
                var dicomData = await _context.DicomData.FindAsync(id);
                
                if (dicomData == null)
                {
                    _logger.LogWarning("Image not found: {Id}", id);
                    return NotFound($"Image with ID {id} not found");
                }
                
                // Update last accessed timestamp
                dicomData.LastAccessed = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                // Check if file exists on disk
                if (string.IsNullOrEmpty(dicomData.StoragePath) || !System.IO.File.Exists(dicomData.StoragePath))
                {
                    _logger.LogError("DICOM file not found on disk: {Path}", dicomData.StoragePath);
                    return NotFound($"DICOM file for image ID {id} not found on server");
                }
                
                try
                {
                    // Read file as bytes and return it
                    var fileBytes = await System.IO.File.ReadAllBytesAsync(dicomData.StoragePath);
                    
                    _logger.LogInformation("DICOM image retrieved successfully. ID: {Id}, Name: {FileName}, Size: {Size} bytes", 
                        dicomData.Id, dicomData.FileName, fileBytes.Length);
                        
                    // Return the actual file with appropriate DICOM content type
                    return File(fileBytes, "application/dicom");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error reading DICOM file from disk: {Path}", dicomData.StoragePath);
                    return StatusCode(500, new { error = "Error reading DICOM file", message = ex.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving image ID: {Id}", id);
                return StatusCode(500, new { error = "Error retrieving image", message = ex.Message });
            }
        }
        
        [HttpPost]
        public async Task<ActionResult> UploadWithMetadata(IFormFile file, [FromForm] string metadata = null)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded");
            }
            
            try
            {
                _logger.LogInformation("Processing uploaded file with metadata: {FileName}, Size: {Size}", 
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
                
                // Create record in database using parsed metadata if available
                var dicomData = new DicomDataModel
                {
                    FileName = file.FileName,
                    FileSize = file.Length,
                    StoragePath = filePath,
                    UploadDate = DateTime.UtcNow,
                    HasAnnotations = false,
                    CreatedAt = DateTime.UtcNow,
                    // Add default empty annotation values to prevent null errors
                    AnnotationData = "",
                    AnnotationType = "",
                    AnnotationLabel = "",
                    BodyPart = ""
                };
                
                // If metadata was provided, use it
                if (!string.IsNullOrEmpty(metadata))
                {
                    try
                    {
                        _logger.LogInformation("Received metadata with upload: {MetadataLength} bytes", metadata.Length);
                        
                        // Deserialize JSON metadata
                        var metadataObj = JsonSerializer.Deserialize<Dictionary<string, object>>(metadata);
                        
                        // Map known properties from the metadata object to our DicomData model
                        if (metadataObj.TryGetValue("patientName", out var patientName))
                            dicomData.PatientName = patientName?.ToString();
                        
                        if (metadataObj.TryGetValue("patientId", out var patientId))
                            dicomData.PatientId = patientId?.ToString();
                        
                        if (metadataObj.TryGetValue("patientBirthDate", out var birthDate) && !string.IsNullOrEmpty(birthDate?.ToString()))
                            dicomData.PatientBirthDate = ParseDateOrNull(birthDate.ToString());
                        
                        if (metadataObj.TryGetValue("patientSex", out var patientSex))
                            dicomData.PatientSex = patientSex?.ToString();
                        
                        if (metadataObj.TryGetValue("modality", out var modality))
                            dicomData.Modality = modality?.ToString();
                        
                        if (metadataObj.TryGetValue("rows", out var rows) && int.TryParse(rows?.ToString(), out int rowsValue))
                            dicomData.Rows = rowsValue;
                        
                        if (metadataObj.TryGetValue("columns", out var columns) && int.TryParse(columns?.ToString(), out int columnsValue))
                            dicomData.Columns = columnsValue;
                        
                        if (metadataObj.TryGetValue("imageType", out var imageType))
                            dicomData.ImageType = imageType?.ToString();
                        
                        if (metadataObj.TryGetValue("studyId", out var studyId))
                            dicomData.StudyId = studyId?.ToString();
                        
                        if (metadataObj.TryGetValue("studyInstanceUid", out var studyUid))
                            dicomData.StudyInstanceUid = studyUid?.ToString();
                        
                        if (metadataObj.TryGetValue("studyDate", out var studyDate) && !string.IsNullOrEmpty(studyDate?.ToString()))
                            dicomData.StudyDate = ParseDateOrNull(studyDate.ToString());
                        
                        if (metadataObj.TryGetValue("studyTime", out var studyTime))
                            dicomData.StudyTime = studyTime?.ToString();
                        
                        if (metadataObj.TryGetValue("seriesInstanceUid", out var seriesUid))
                            dicomData.SeriesInstanceUid = seriesUid?.ToString();
                        
                        if (metadataObj.TryGetValue("seriesNumber", out var seriesNumber))
                            dicomData.SeriesNumber = seriesNumber?.ToString();
                        
                        if (metadataObj.TryGetValue("seriesDescription", out var seriesDesc))
                            dicomData.SeriesDescription = seriesDesc?.ToString();
                        
                        if (metadataObj.TryGetValue("bodyPart", out var bodyPart))
                            dicomData.BodyPart = bodyPart?.ToString();
                        
                        if (metadataObj.TryGetValue("instanceNumber", out var instanceNumber))
                            dicomData.InstanceNumber = instanceNumber?.ToString();
                        
                        if (metadataObj.TryGetValue("windowCenter", out var windowCenter) && float.TryParse(windowCenter?.ToString(), out float windowCenterValue))
                            dicomData.WindowCenter = windowCenterValue;
                        
                        if (metadataObj.TryGetValue("windowWidth", out var windowWidth) && float.TryParse(windowWidth?.ToString(), out float windowWidthValue))
                            dicomData.WindowWidth = windowWidthValue;
                        
                        _logger.LogInformation("Successfully parsed metadata for image: PatientName={Name}, StudyUID={StudyUid}",
                            dicomData.PatientName, dicomData.StudyInstanceUid);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error parsing provided metadata: {ErrorMessage}", ex.Message);
                        // Continue with upload despite metadata parsing failure
                    }
                }
                
                // Save to database
                _context.DicomData.Add(dicomData);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("DICOM data saved to database. ID: {Id}", dicomData.Id);
                
                // Return the created record with key information
                return Ok(new { 
                    id = dicomData.Id,
                    name = dicomData.FileName,
                    patientName = dicomData.PatientName,
                    patientId = dicomData.PatientId,
                    modality = dicomData.Modality,
                    studyInstanceUid = dicomData.StudyInstanceUid,
                    message = "DICOM image uploaded successfully with metadata"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file with metadata: {FileName}", file?.FileName);
                return StatusCode(500, new { error = "Error uploading file", message = ex.Message });
            }
        }
        
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteImage(int id)
        {
            try
            {
                var dicomData = await _context.DicomData.FindAsync(id);
                
                if (dicomData == null)
                {
                    return NotFound($"Image with ID {id} not found");
                }
                
                // Try to delete the physical file if it exists
                if (!string.IsNullOrEmpty(dicomData.StoragePath) && System.IO.File.Exists(dicomData.StoragePath))
                {
                    try
                    {
                        System.IO.File.Delete(dicomData.StoragePath);
                        _logger.LogInformation("Deleted file from path: {Path}", dicomData.StoragePath);
                    }
                    catch (IOException ex)
                    {
                        _logger.LogWarning(ex, "Could not delete file from path: {Path}", dicomData.StoragePath);
                    }
                }
                
                _context.DicomData.Remove(dicomData);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Deleted image ID: {Id}", id);
                return Ok(new { message = "Image deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting image ID: {Id}", id);
                return StatusCode(500, new { error = "Error deleting image", message = ex.Message });
            }
        }
        
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
                
                // Debug log the actual data being returned
                _logger.LogInformation("Returning metadata for image ID {Id} with StudyInstanceUid: {StudyUid}", 
                    id, dicomData.StudyInstanceUid);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving image metadata for ID: {Id}", id);
                return StatusCode(500, new { error = "Error retrieving image metadata", message = ex.Message });
            }
        }
        
        private DateTime? ParseDateOrNull(string dateString)
        {
            if (string.IsNullOrEmpty(dateString))
                return null;
                
            if (DateTime.TryParse(dateString, out DateTime result))
                return result;
                
            return null;
        }
    }
    
    // DTO for receiving DICOM metadata from client
    public class DicomMetadataDto
    {
        // Patient Information
        public string PatientName { get; set; }
        public string PatientId { get; set; }
        public string PatientBirthDate { get; set; }
        public string PatientSex { get; set; }
        
        // Modality Information
        public string Modality { get; set; }
        public int? Rows { get; set; }
        public int? Columns { get; set; }
        public string ImageType { get; set; }
        
        // Study Information
        public string StudyId { get; set; }
        public string StudyInstanceUid { get; set; }
        public string StudyDate { get; set; }
        public string StudyTime { get; set; }
        
        // Series Information
        public string SeriesInstanceUid { get; set; }
        public string SeriesNumber { get; set; }
        public string SeriesDescription { get; set; }
        
        // Anatomical Information
        public string BodyPart { get; set; }
        
        // Additional Information
        public float? WindowCenter { get; set; }
        public float? WindowWidth { get; set; }
        public string InstanceNumber { get; set; }
    }
} 