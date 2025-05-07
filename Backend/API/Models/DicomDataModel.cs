using System;
using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    public class DicomDataModel
    {
        [Key]
        public int Id { get; set; }
        
        // Image Information
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; }
        
        public long? FileSize { get; set; }
        
        [MaxLength(500)]
        public string StoragePath { get; set; }
        
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;
        
        // Patient Information
        [MaxLength(255)]
        public string PatientName { get; set; }
        
        [MaxLength(100)]
        public string PatientId { get; set; }
        
        public DateTime? PatientBirthDate { get; set; }
        
        [MaxLength(20)]
        public string PatientSex { get; set; }
        
        // Modality Information
        [MaxLength(50)]
        public string Modality { get; set; }
        
        public int? Rows { get; set; }
        
        public int? Columns { get; set; }
        
        [MaxLength(255)]
        public string ImageType { get; set; }
        
        // Study Information
        [MaxLength(100)]
        public string StudyId { get; set; }
        
        [MaxLength(255)]
        public string StudyInstanceUid { get; set; }
        
        public DateTime? StudyDate { get; set; }
        
        [MaxLength(50)]
        public string StudyTime { get; set; }
        
        // Series Information
        [MaxLength(255)]
        public string SeriesInstanceUid { get; set; }
        
        [MaxLength(50)]
        public string SeriesNumber { get; set; }
        
        [MaxLength(255)]
        public string SeriesDescription { get; set; }
        
        // Anatomical Information
        [MaxLength(100)]
        public string BodyPart { get; set; }
        
        // Image Properties
        public float? WindowCenter { get; set; }
        
        public float? WindowWidth { get; set; }
        
        [MaxLength(50)]
        public string InstanceNumber { get; set; }
        
        // Annotation Fields
        public bool HasAnnotations { get; set; }
        
        [MaxLength(50)]
        public string? AnnotationType { get; set; }
        
        [MaxLength(255)]
        public string? AnnotationLabel { get; set; }
        
        public string? AnnotationData { get; set; }
        
        // Timestamps
        public DateTime? LastAccessed { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
    }
} 