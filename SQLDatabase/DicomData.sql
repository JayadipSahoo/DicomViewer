-- DICOM Data Table Schema - Single comprehensive table
CREATE TABLE DicomData (
    -- Primary Key 
    Id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Image Information
    FileName NVARCHAR(255) NOT NULL,
    FileSize BIGINT NULL,
    StoragePath NVARCHAR(500) NULL,
    UploadDate DATETIME2 DEFAULT GETDATE() NULL,
    
    -- Patient Information
    PatientName NVARCHAR(255) NULL,
    PatientId NVARCHAR(100) NULL,
    PatientBirthDate DATE NULL,
    PatientSex NVARCHAR(20) NULL,
    
    -- Modality Information
    Modality NVARCHAR(50) NULL,
    Rows INT NULL,
    Columns INT NULL,
    ImageType NVARCHAR(255) NULL,
    
    -- Study Information
    StudyId NVARCHAR(100) NULL,
    StudyInstanceUid NVARCHAR(255) NULL,
    StudyDate DATE NULL,
    StudyTime NVARCHAR(50) NULL,
    
    -- Series Information
    SeriesInstanceUid NVARCHAR(255) NULL,
    SeriesNumber NVARCHAR(50) NULL,
    SeriesDescription NVARCHAR(255) NULL,
    
    -- Anatomical Information
    BodyPart NVARCHAR(100) NULL,
    
    -- Image Properties
    WindowCenter FLOAT NULL,
    WindowWidth FLOAT NULL,
    InstanceNumber NVARCHAR(50) NULL,
    
    -- Annotation Fields (Optional)
    HasAnnotations BIT DEFAULT 0 NOT NULL,
    AnnotationType NVARCHAR(50) NULL,
    AnnotationLabel NVARCHAR(255) NULL,
    AnnotationData NVARCHAR(MAX) NULL,
    
    -- Timestamps
    LastAccessed DATETIME2 NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE() NOT NULL,
    UpdatedAt DATETIME2 NULL
);

-- Indexes for faster lookups
CREATE INDEX IX_DicomData_PatientId ON DicomData(PatientId);
CREATE INDEX IX_DicomData_StudyInstanceUid ON DicomData(StudyInstanceUid);
CREATE INDEX IX_DicomData_Modality ON DicomData(Modality);
CREATE INDEX IX_DicomData_UploadDate ON DicomData(UploadDate); 