using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    public class Image
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public required string Name { get; set; }
        
        // Instead of storing the binary data, we'll store the file path
        [Required]
        public required string FilePath { get; set; }
        
        [Required]
        public required string ContentType { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ModifiedAt { get; set; }

        // File information
        public long FileSize { get; set; }

        // Flag to indicate if the image data is compressed
        public bool IsCompressed { get; set; } = false;

        // DICOM specific metadata
        public string? PatientId { get; set; }
        public string? PatientName { get; set; }
        public string? Modality { get; set; }
        public string? StudyInstanceUid { get; set; }
        public string? SeriesInstanceUid { get; set; }
        public string? SopInstanceUid { get; set; }
    }
} 