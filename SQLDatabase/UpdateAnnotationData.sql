-- First set default values for any NULL records
UPDATE DicomData
SET AnnotationData = '{}'
WHERE AnnotationData IS NULL;

-- Now modify the column to allow NULL values
ALTER TABLE DicomData
ALTER COLUMN AnnotationData NVARCHAR(MAX) NULL;

PRINT 'Modified AnnotationData column to allow NULL values'; 