import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, switchMap } from 'rxjs';
import * as dicomParser from 'dicom-parser';

export interface DicomImage {
  id: number;
  name: string;
  contentType: string;
  filePath?: string;
  patientId?: string;
  patientName?: string;
  modality?: string;
  studyInstanceUid?: string;
  url?: string;
  uploadDate?: Date;
}

export interface DicomMetadata {
  // Patient information
  patientName: string;
  patientId: string;
  patientBirthDate: string;
  patientSex: string;
  
  // Modality information
  modality: string;
  rows: number;
  columns: number;
  imageType: string;
  
  // Study information
  studyId: string;
  studyInstanceUid: string;
  studyDate: string;
  studyTime: string;
  
  // Series information
  seriesInstanceUid: string;
  seriesNumber: string;
  seriesDescription: string;
  
  // Anatomical information
  bodyPart: string;
  
  // Image information
  imageId: string;
  instanceNumber: string;
  windowCenter: number;
  windowWidth: number;
  
  // Additional fields
  [key: string]: any;
}

export interface MetadataUpdatePayload {
  imageId: number;
  metadata: DicomMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:5028/api/image';  // Direct backend URL
  private images = new BehaviorSubject<DicomImage[]>([]);
  
  constructor(private http: HttpClient) {
    this.refreshImages();
  }
  
  getImages(): Observable<DicomImage[]> {
    return this.images.asObservable();
  }
  
  refreshImages(): void {
    this.http.get<DicomImage[]>(this.apiUrl).pipe(
      tap(images => {
        console.log('Fetched images:', images);
        this.images.next(images);
      }),
      catchError(error => {
        console.error('Error fetching images:', error);
        return [];
      })
    ).subscribe();
  }
  
  uploadImage(file: File): Observable<any> {
    // Create FormData to send the file
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    console.log('Uploading file:', file.name);
    
    // Before sending to server, parse the DICOM file to extract metadata immediately
    return this.parseMetadataFromFile(file).pipe(
      tap(metadata => console.log('Extracted metadata during upload:', metadata)),
      map(metadata => {
        // Add metadata to form data for single request upload with metadata
        if (metadata) {
          formData.append('metadata', JSON.stringify(metadata));
        }
        
        // Now send the file with extracted metadata to server
        return this.http.post<any>(this.apiUrl, formData).pipe(
          tap(response => {
            console.log('Upload response:', response);
            // Add the newly uploaded image to the BehaviorSubject
            if (response && response.id) {
              const newImage: DicomImage = {
                id: response.id,
                name: file.name,
                contentType: file.type,
                // Add metadata fields that are useful for display in the list
                patientId: metadata?.patientId || '',
                patientName: metadata?.patientName || '',
                modality: metadata?.modality || '',
                studyInstanceUid: metadata?.studyInstanceUid || ''
              };
              
              const currentImages = this.images.value;
              this.images.next([...currentImages, newImage]);
            }
          }),
          catchError(error => {
            console.error('Error uploading image:', error);
            return of({ error: true, message: error.message });
          })
        );
      }),
      // This is necessary to "flatten" the nested observable
      switchMap((observable: Observable<any>) => observable)
    );
  }
  
  /**
   * Parse DICOM metadata directly from File object using dicomParser
   */
  private parseMetadataFromFile(file: File): Observable<DicomMetadata | null> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            observer.error('Failed to read file as ArrayBuffer');
            return;
          }
          
          // Parse DICOM data
          const byteArray = new Uint8Array(arrayBuffer);
          let dataset;
          
          try {
            // Parse DICOM with dicomParser
            dataset = dicomParser.parseDicom(byteArray);
            console.log('DICOM dataset parsed successfully:', dataset);
          } catch (error) {
            console.error('Error parsing DICOM file:', error);
            observer.next(null);
            observer.complete();
            return;
          }
          
          // Extract tag values with enhanced robustness
          const getTag = (tag: string): string => {
            try {
              // Try different formats and variations
              const formats = [
                tag,
                `x${tag}`,
                tag.toLowerCase(),
                tag.toUpperCase(),
              ];
              
              for (const format of formats) {
                const element = dataset.elements[format];
                if (element) {
                  const value = dataset.string(format);
                  if (value) return value;
                }
              }
              
              return '';
            } catch (error) {
              console.warn(`Error reading tag ${tag}:`, error);
              return '';
            }
          };
          
          // Format DICOM date (YYYYMMDD to YYYY-MM-DD)
          const formatDate = (dateString: string): string => {
            if (!dateString || dateString.length !== 8) return dateString;
            
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            
            return `${year}-${month}-${day}`;
          };
          
          // Create metadata object with extracted values
          const metadata: DicomMetadata = {
            // Patient information
            patientName: getTag('00100010') || '',
            patientId: getTag('00100020') || '',
            patientBirthDate: formatDate(getTag('00100030') || ''),
            patientSex: getTag('00100040') || '',
            
            // Modality information
            modality: getTag('00080060') || '',
            rows: parseInt(getTag('00280010') || '0'),
            columns: parseInt(getTag('00280011') || '0'),
            imageType: getTag('00080008') || '',
            
            // Study information
            studyId: getTag('00200010') || '',
            studyInstanceUid: getTag('0020000D') || '',
            studyDate: formatDate(getTag('00080020') || ''),
            studyTime: getTag('00080030') || '',
            
            // Series information
            seriesInstanceUid: getTag('0020000E') || '',
            seriesNumber: getTag('00200011') || '',
            seriesDescription: getTag('0008103E') || '',
            
            // Anatomical information
            bodyPart: getTag('00180015') || '',
            
            // Image information
            imageId: file.name, // Use filename as temporary imageId
            instanceNumber: getTag('00200013') || '',
            windowCenter: parseFloat(getTag('00281050') || '0'),
            windowWidth: parseFloat(getTag('00281051') || '0')
          };
          
          console.log('Extracted DICOM metadata:', metadata);
          observer.next(metadata);
          observer.complete();
          
        } catch (error) {
          console.error('Error parsing DICOM file:', error);
          observer.next(null);
          observer.complete();
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        observer.error(error);
      };
      
      // Read the file as ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  }
  
  getDicomImageUrl(id: number): string {
    return `${this.apiUrl}/${id}`;
  }
  
  deleteImage(id: number): Observable<any> {
    console.log(`Deleting image with ID: ${id}`);
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('Image deleted successfully');
        // Remove the deleted image from the BehaviorSubject
        const currentImages = this.images.value;
        const updatedImages = currentImages.filter(img => img.id !== id);
        this.images.next(updatedImages);
      }),
      catchError(error => {
        console.error('Error deleting image:', error);
        return of({ error: true, message: error.message });
      })
    );
  }
  
  getImageMetadata(id: number): Observable<DicomMetadata> {
    console.log(`Fetching metadata for image ID: ${id}`);
    return this.http.get<DicomMetadata>(`${this.apiUrl}/${id}/metadata`).pipe(
      tap(metadata => {
        console.log('Raw metadata fetched from API:', metadata);
        // Check specifically for studyInstanceUid
        console.log('Study Instance UID from API:', metadata.studyInstanceUid || 'Not found in response');
      }),
      catchError(error => {
        console.error('Error fetching metadata from API:', error);
        return of({} as DicomMetadata);
      })
    );
  }
  
  updateImageMetadata(payload: MetadataUpdatePayload): Observable<any> {
    console.log(`Updating metadata for image ID: ${payload.imageId}`);
    return this.http.post<any>(`${this.apiUrl}/${payload.imageId}/metadata`, payload.metadata).pipe(
      tap(response => {
        console.log('Metadata updated successfully:', response);
        
        // Update the image in the BehaviorSubject if it exists
        const currentImages = this.images.value;
        const imageIndex = currentImages.findIndex(img => img.id === payload.imageId);
        
        if (imageIndex !== -1) {
          const updatedImages = [...currentImages];
          // Update basic metadata that's part of the DicomImage interface
          updatedImages[imageIndex] = {
            ...updatedImages[imageIndex],
            patientId: payload.metadata.patientId,
            patientName: payload.metadata.patientName,
            modality: payload.metadata.modality,
            studyInstanceUid: payload.metadata.studyInstanceUid
          };
          this.images.next(updatedImages);
        }
      }),
      catchError(error => {
        console.error('Error updating metadata:', error);
        // Return an observable with the error
        return of({ error: true, message: error.message });
      })
    );
  }
}
