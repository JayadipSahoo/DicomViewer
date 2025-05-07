-- Migration script to set up DICOM data structure
-- First check if old tables exist and drop them to resolve conflicts

-- Check and drop old DicomMetadata table if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DicomMetadata]') AND type in (N'U'))
BEGIN
    -- Drop related foreign keys first
    DECLARE @FKConstraintName NVARCHAR(128)
    SELECT @FKConstraintName = name FROM sys.foreign_keys
    WHERE referenced_object_id = object_id('[dbo].[DicomMetadata]')
    
    IF @FKConstraintName IS NOT NULL
        EXEC('ALTER TABLE [dbo].[DicomMetadata] DROP CONSTRAINT ' + @FKConstraintName)
    
    -- Drop the table
    DROP TABLE [dbo].[DicomMetadata]
    PRINT 'Dropped existing DicomMetadata table'
END

-- Check and drop old DicomAnnotations table if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DicomAnnotations]') AND type in (N'U'))
BEGIN
    -- Drop related foreign keys first
    DECLARE @FKConstraintName2 NVARCHAR(128)
    SELECT @FKConstraintName2 = name FROM sys.foreign_keys
    WHERE referenced_object_id = object_id('[dbo].[DicomAnnotations]')
    
    IF @FKConstraintName2 IS NOT NULL
        EXEC('ALTER TABLE [dbo].[DicomAnnotations] DROP CONSTRAINT ' + @FKConstraintName2)
    
    -- Drop the table
    DROP TABLE [dbo].[DicomAnnotations]
    PRINT 'Dropped existing DicomAnnotations table'
END

-- Create our new comprehensive DicomData table
CREATE TABLE DicomData (
    -- Primary Key 
    Id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Image Information
    FileName NVARCHAR(255) NOT NULL,
    FileSize BIGINT,
    StoragePath NVARCHAR(500),
    UploadDate DATETIME2 DEFAULT GETDATE(),
    
    -- Patient Information
    PatientName NVARCHAR(255),
    PatientId NVARCHAR(100),
    PatientBirthDate DATE,
    PatientSex NVARCHAR(20),
    
    -- Modality Information
    Modality NVARCHAR(50),
    Rows INT,
    Columns INT,
    ImageType NVARCHAR(255),
    
    -- Study Information
    StudyId NVARCHAR(100),
    StudyInstanceUid NVARCHAR(255),
    StudyDate DATE,
    StudyTime NVARCHAR(50),
    
    -- Series Information
    SeriesInstanceUid NVARCHAR(255),
    SeriesNumber NVARCHAR(50),
    SeriesDescription NVARCHAR(255),
    
    -- Anatomical Information
    BodyPart NVARCHAR(100),
    
    -- Image Properties
    WindowCenter FLOAT,
    WindowWidth FLOAT,
    InstanceNumber NVARCHAR(50),
    
    -- Annotation Fields (Optional)
    HasAnnotations BIT DEFAULT 0,
    AnnotationType NVARCHAR(50),
    AnnotationLabel NVARCHAR(255),
    AnnotationData NVARCHAR(MAX),
    
    -- Timestamps
    LastAccessed DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2
);
PRINT 'Created DicomData table'

-- Indexes for faster lookups
CREATE INDEX IX_DicomData_PatientId ON DicomData(PatientId);
CREATE INDEX IX_DicomData_StudyInstanceUid ON DicomData(StudyInstanceUid);
CREATE INDEX IX_DicomData_Modality ON DicomData(Modality);
CREATE INDEX IX_DicomData_UploadDate ON DicomData(UploadDate);
PRINT 'Added indexes to DicomData table'

-- Copy data from Images table to DicomData if Images table exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Images]') AND type in (N'U'))
BEGIN
    INSERT INTO DicomData (
        FileName,
        PatientName,
        PatientId,
        Modality,
        StudyInstanceUid,
        UploadDate
    )
    SELECT 
        Name,
        PatientName,
        PatientId,
        Modality,
        StudyInstanceUid,
        CreatedAt
    FROM 
        Images
    
    PRINT 'Migrated data from Images table to DicomData'
END 