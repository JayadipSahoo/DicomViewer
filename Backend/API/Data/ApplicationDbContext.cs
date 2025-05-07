using Microsoft.EntityFrameworkCore;
using API.Models;

namespace API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Image> Images { get; set; }
        public DbSet<DicomDataModel> DicomData { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure DicomData table
            modelBuilder.Entity<DicomDataModel>()
                .HasIndex(d => d.PatientId);
            
            modelBuilder.Entity<DicomDataModel>()
                .HasIndex(d => d.StudyInstanceUid);
                
            modelBuilder.Entity<DicomDataModel>()
                .HasIndex(d => d.UploadDate);
        }
    }
} 