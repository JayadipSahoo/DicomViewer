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

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DicomDataController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DicomDataController> _logger;
        
        public DicomDataController(ApplicationDbContext context, ILogger<DicomDataController> logger)
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
                
                return Ok(images);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all DICOM data");
                return StatusCode(500, new { error = "Error retrieving DICOM data", message = ex.Message });
            }
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<DicomDataModel>> Get(int id)
        {
            try
            {
                var dicomData = await _context.DicomData.FindAsync(id);
                
                if (dicomData == null)
                {
                    _logger.LogWarning("DICOM data not found: {Id}", id);
                    return NotFound($"DICOM data with ID {id} not found");
                }
                
                // Update last accessed timestamp
                dicomData.LastAccessed = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                return Ok(dicomData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving DICOM data ID: {Id}", id);
                return StatusCode(500, new { error = "Error retrieving DICOM data", message = ex.Message });
            }
        }
        
        [HttpPost]
        public async Task<ActionResult<DicomDataModel>> Create([FromBody] DicomDataModel dicomData)
        {
            try
            {
                dicomData.UploadDate = DateTime.UtcNow;
                dicomData.CreatedAt = DateTime.UtcNow;
                
                _context.DicomData.Add(dicomData);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Created DICOM data ID: {Id} for file: {FileName}", 
                    dicomData.Id, dicomData.FileName);
                
                return CreatedAtAction(nameof(Get), new { id = dicomData.Id }, dicomData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating DICOM data record");
                return StatusCode(500, new { error = "Error creating DICOM data", message = ex.Message });
            }
        }
        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] DicomDataModel dicomData)
        {
            if (id != dicomData.Id)
            {
                return BadRequest("ID mismatch");
            }
            
            try
            {
                var existingData = await _context.DicomData.FindAsync(id);
                if (existingData == null)
                {
                    return NotFound($"DICOM data with ID {id} not found");
                }
                
                // Update all fields from the submitted model
                // Image info preserved - don't update filename and storage path
                existingData.PatientName = dicomData.PatientName;
                existingData.PatientId = dicomData.PatientId;
                existingData.PatientBirthDate = dicomData.PatientBirthDate;
                existingData.PatientSex = dicomData.PatientSex;
                
                existingData.Modality = dicomData.Modality;
                existingData.Rows = dicomData.Rows;
                existingData.Columns = dicomData.Columns;
                existingData.ImageType = dicomData.ImageType;
                
                existingData.StudyId = dicomData.StudyId;
                existingData.StudyInstanceUid = dicomData.StudyInstanceUid;
                existingData.StudyDate = dicomData.StudyDate;
                existingData.StudyTime = dicomData.StudyTime;
                
                existingData.SeriesInstanceUid = dicomData.SeriesInstanceUid;
                existingData.SeriesNumber = dicomData.SeriesNumber;
                existingData.SeriesDescription = dicomData.SeriesDescription;
                
                existingData.BodyPart = dicomData.BodyPart;
                
                existingData.WindowCenter = dicomData.WindowCenter;
                existingData.WindowWidth = dicomData.WindowWidth;
                existingData.InstanceNumber = dicomData.InstanceNumber;
                
                // Annotation data
                existingData.HasAnnotations = dicomData.HasAnnotations;
                existingData.AnnotationType = dicomData.AnnotationType;
                existingData.AnnotationLabel = dicomData.AnnotationLabel;
                existingData.AnnotationData = dicomData.AnnotationData;
                
                existingData.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Updated DICOM data ID: {Id}", id);
                return Ok(existingData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating DICOM data ID: {Id}", id);
                return StatusCode(500, new { error = "Error updating DICOM data", message = ex.Message });
            }
        }
        
        [HttpPut("{id}/annotation")]
        public async Task<IActionResult> UpdateAnnotation(int id, [FromBody] DicomAnnotationDto annotation)
        {
            try
            {
                var existingData = await _context.DicomData.FindAsync(id);
                if (existingData == null)
                {
                    return NotFound($"DICOM data with ID {id} not found");
                }
                
                existingData.HasAnnotations = true;
                existingData.AnnotationType = annotation.AnnotationType;
                existingData.AnnotationLabel = annotation.Label;
                existingData.AnnotationData = annotation.PositionData;
                existingData.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Updated annotation for DICOM data ID: {Id}", id);
                return Ok(new { message = "Annotation updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating annotation for DICOM data ID: {Id}", id);
                return StatusCode(500, new { error = "Error updating annotation", message = ex.Message });
            }
        }
        
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var dicomData = await _context.DicomData.FindAsync(id);
                
                if (dicomData == null)
                {
                    return NotFound($"DICOM data with ID {id} not found");
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
                
                _logger.LogInformation("Deleted DICOM data ID: {Id}", id);
                return Ok(new { message = "DICOM data deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting DICOM data ID: {Id}", id);
                return StatusCode(500, new { error = "Error deleting DICOM data", message = ex.Message });
            }
        }
        
        [HttpGet("patient/{patientId}")]
        public async Task<ActionResult<IEnumerable<DicomDataModel>>> GetByPatientId(string patientId)
        {
            try
            {
                var images = await _context.DicomData
                    .Where(d => d.PatientId == patientId)
                    .OrderByDescending(d => d.StudyDate)
                    .ToListAsync();
                
                return Ok(images);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving DICOM data for patient: {PatientId}", patientId);
                return StatusCode(500, new { error = "Error retrieving patient data", message = ex.Message });
            }
        }
    }
    
    // DTO for receiving annotation updates
    public class DicomAnnotationDto
    {
        public string AnnotationType { get; set; }
        public string Label { get; set; }
        public string PositionData { get; set; }
    }
} 