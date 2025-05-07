-- Migration script to update DicomData table to make non-essential fields nullable

BEGIN TRANSACTION;

BEGIN TRY
    -- Set default values for records with NULL values in required fields
    UPDATE DicomData SET AnnotationData = '{}' WHERE AnnotationData IS NULL;
    UPDATE DicomData SET BodyPart = 'UNKNOWN' WHERE BodyPart IS NULL;
    UPDATE DicomData SET PatientName = 'Anonymous' WHERE PatientName IS NULL;
    UPDATE DicomData SET PatientId = 'UNKNOWN' WHERE PatientId IS NULL;
    UPDATE DicomData SET Modality = 'OT' WHERE Modality IS NULL;
    UPDATE DicomData SET ImageType = 'UNKNOWN' WHERE ImageType IS NULL;
    UPDATE DicomData SET StudyId = 'UNKNOWN' WHERE StudyId IS NULL;
    UPDATE DicomData SET StudyInstanceUid = NEWID() WHERE StudyInstanceUid IS NULL;
    UPDATE DicomData SET SeriesInstanceUid = NEWID() WHERE SeriesInstanceUid IS NULL;
    UPDATE DicomData SET SeriesNumber = '1' WHERE SeriesNumber IS NULL;
    UPDATE DicomData SET InstanceNumber = '1' WHERE InstanceNumber IS NULL;
    
    -- Now alter the columns to allow NULL values for all non-essential fields
    ALTER TABLE DicomData ALTER COLUMN BodyPart NVARCHAR(100) NULL;
    ALTER TABLE DicomData ALTER COLUMN PatientName NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN PatientId NVARCHAR(100) NULL;
    ALTER TABLE DicomData ALTER COLUMN PatientSex NVARCHAR(20) NULL;
    ALTER TABLE DicomData ALTER COLUMN Modality NVARCHAR(50) NULL;
    ALTER TABLE DicomData ALTER COLUMN ImageType NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN StudyId NVARCHAR(100) NULL;
    ALTER TABLE DicomData ALTER COLUMN StudyInstanceUid NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN StudyTime NVARCHAR(50) NULL;
    ALTER TABLE DicomData ALTER COLUMN SeriesInstanceUid NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN SeriesNumber NVARCHAR(50) NULL;
    ALTER TABLE DicomData ALTER COLUMN SeriesDescription NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN AnnotationData NVARCHAR(MAX) NULL;
    ALTER TABLE DicomData ALTER COLUMN AnnotationType NVARCHAR(50) NULL;
    ALTER TABLE DicomData ALTER COLUMN AnnotationLabel NVARCHAR(255) NULL;
    ALTER TABLE DicomData ALTER COLUMN InstanceNumber NVARCHAR(50) NULL;
    
    PRINT 'Successfully updated DicomData columns to allow NULL values';
    
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error: ' + ERROR_MESSAGE();
END CATCH; 