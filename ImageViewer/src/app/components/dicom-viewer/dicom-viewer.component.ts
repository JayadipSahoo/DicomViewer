import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DicomImage, ImageService } from '../../services/image.service';

// Import Cornerstone libraries
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

// Define a comprehensive DICOM metadata interface
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

@Component({
  selector: 'app-dicom-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dicom-viewer.component.html',
  styleUrls: ['./dicom-viewer.component.scss']
})
export class DicomViewerComponent implements AfterViewInit, OnChanges {
  @Input() selectedImage: DicomImage | null = null;
  @ViewChild('dicomContainer') dicomContainer!: ElementRef;
  
  private element: HTMLElement | null = null;
  private viewport: cornerstone.Viewport | null = null;
  private cornerstoneInitialized = false;
  
  isLoading = false;
  isImageLoaded = false;
  loadError: string | null = null;
  dicomMetadata: DicomMetadata | null = null;
  showMetadata = false;

  constructor(private imageService: ImageService) {
    // Initialize cornerstone and its dependencies
    this.initCornerstoneWADOImageLoader();
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - dicomContainer:', this.dicomContainer);
    if (this.dicomContainer && this.dicomContainer.nativeElement) {
      this.element = this.dicomContainer.nativeElement;
      console.log('Element initialized:', this.element);
      this.initCornerstoneElement();
      
      if (this.selectedImage) {
        this.loadAndDisplayImage();
      }
    } else {
      console.error('dicomContainer not found or not initialized properly');
      this.loadError = 'Failed to initialize viewer - element not found';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedImage']) {
      console.log('Selected image changed:', this.selectedImage);
      
      // Reset state when image changes
      this.loadError = null;
      this.isImageLoaded = false;
      this.dicomMetadata = null;
      this.showMetadata = false;
      
      if (this.selectedImage && this.element) {
        console.log('Loading new image and metadata for image ID:', this.selectedImage.id);
        
        // First, fetch metadata from API to ensure we have database values
        this.fetchMetadataFromApi();
        
        // Give the API fetch a chance to complete before loading the DICOM image
        // This helps ensure we have any database metadata before extracting from the file
        setTimeout(() => {
          // Then load the DICOM image and extract additional metadata
          this.loadAndDisplayImage();
        }, 200); // Increased to 200ms to ensure API call has time to complete
      }
    }
  }

  toggleMetadata(): void {
    this.showMetadata = !this.showMetadata;
  }

  private initCornerstoneWADOImageLoader(): void {
    try {
      // Configure cornerstone
      cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
      cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
      
      // Disable any debug features or overlays
      if (cornerstoneWADOImageLoader.configure) {
        cornerstoneWADOImageLoader.configure({
          showDecompressionProgress: false,
          useWebWorkers: true,
          decodeConfig: {
            usePDFJS: false,
            strict: false,
            enableDebugMode: false,
            showPatterns: false
          }
        });
      }
      
      console.log('Cornerstone WADO Image Loader initialized');
    } catch (error) {
      console.error('Error initializing Cornerstone WADO Image Loader:', error);
      this.loadError = 'Failed to initialize DICOM viewer';
    }
  }

  private initCornerstoneElement(): void {
    if (!this.element) return;
    
    try {
      // Enable the cornerstone element
      cornerstone.enable(this.element);
      this.cornerstoneInitialized = true;
      console.log('Cornerstone enabled on element');
    } catch (error) {
      console.error('Error enabling Cornerstone on element:', error);
      this.loadError = 'Failed to initialize DICOM viewer';
    }
  }

  loadAndDisplayImage(): void {
    if (!this.element || !this.selectedImage || !this.cornerstoneInitialized) {
      console.warn('Cannot load image - element, image, or cornerstone not initialized');
      this.loadError = 'DICOM viewer not properly initialized';
      return;
    }
    
    this.isLoading = true;
    this.loadError = null;
    
    // Clear any existing image
    try {
      cornerstone.reset(this.element);
    } catch (error) {
      console.warn('Error resetting cornerstone element:', error);
    }
    
    // Create the imageId for wado
    const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
    console.log('Loading DICOM image with imageId:', imageId);
    
    // Load and display the image
    cornerstone.loadAndCacheImage(imageId)
      .then(image => {
        console.log('DICOM image loaded successfully');
        this.displayImage(image);
        this.extractDicomMetadata(image);
        this.isLoading = false;
        this.isImageLoaded = true;
      })
      .catch(error => {
        console.error('Error loading DICOM image:', error);
        this.isLoading = false;
        this.loadError = 'Failed to load DICOM image. The file may be corrupted or in an unsupported format.';
      });
  }

  displayImage(image: cornerstone.Image): void {
    if (!this.element) return;

    try {
      // Display the image
      cornerstone.displayImage(this.element, image);
      
      // Get the current viewport and ensure it's properly initialized
      this.viewport = cornerstone.getViewport(this.element);
      
      // Fit the image to the viewport initially
      this.viewport.scale = 1.0;
      this.viewport.translation.x = 0;
      this.viewport.translation.y = 0;
      cornerstone.setViewport(this.element, this.viewport);
      
      // Add border style to show the container boundaries
      this.element.style.border = "1px solid #333";
      
      console.log('DICOM image displayed successfully');
      this.isImageLoaded = true;
    } catch (error) {
      console.error('Error displaying DICOM image:', error);
      this.loadError = 'Failed to display DICOM image';
      this.isImageLoaded = false;
    }
  }

  extractDicomMetadata(image: cornerstone.Image): void {
    try {
      // Access the dataset from the image object
      const dataset = (image as any).data.elements;

      // Log entire dataset for debugging
      console.log('COMPLETE DICOM dataset:', dataset);
      
      // Enhanced getTagValue function that tries multiple tag formats
      const getTag = (key: string): string => {
        // Try all possible formats for tag access
        const formats = [
          key,                    // Original key
          `x${key}`,              // With 'x' prefix
          key.toLowerCase(),      // Lowercase
          key.toUpperCase(),      // Uppercase
          key.replace(/[\(\)]/g, '') // Remove parentheses
        ];
        
        // Try all formats
        for (const format of formats) {
          const value = this.getTagValue(dataset, format);
          if (value) {
            console.log(`Found tag ${key} using format ${format}: ${value}`);
            return value;
          }
        }
        
        console.log(`Tag not found for ${key} in any format`);
        return '';
      };

      // Create metadata object from DICOM tags with enhanced tag access
      const extractedMetadata = {
        // Patient information
        patientName: getTag('00100010') || getTag('PatientName'),
        patientId: getTag('00100020') || getTag('PatientID'),
        patientBirthDate: this.formatDate(getTag('00100030') || getTag('PatientBirthDate')),
        patientSex: getTag('00100040') || getTag('PatientSex'),
        
        // Modality information
        modality: getTag('00080060') || getTag('Modality'),
        rows: parseInt(getTag('00280010') || getTag('Rows') || '0'),
        columns: parseInt(getTag('00280011') || getTag('Columns') || '0'),
        imageType: getTag('00080008') || getTag('ImageType'),
        
        // Study information
        studyId: getTag('00200010') || getTag('StudyID'),
        studyInstanceUid: getTag('0020000D') || getTag('StudyInstanceUID'),
        studyDate: this.formatDate(getTag('00080020') || getTag('StudyDate')),
        studyTime: getTag('00080030') || getTag('StudyTime'),
        
        // Series information
        seriesInstanceUid: getTag('0020000E') || getTag('SeriesInstanceUID'),
        seriesNumber: getTag('00200011') || getTag('SeriesNumber'),
        seriesDescription: getTag('0008103E') || getTag('SeriesDescription'),
        
        // Anatomical information
        bodyPart: getTag('00180015') || getTag('BodyPartExamined'),
        
        // Image information
        imageId: image.imageId,
        instanceNumber: getTag('00200013') || getTag('InstanceNumber'),
        windowCenter: image.windowCenter || 0,
        windowWidth: image.windowWidth || 0
      };

      console.log('Extracted metadata from DICOM file:', extractedMetadata);
      
      // If we have no existing metadata, use the extracted data directly
      if (!this.dicomMetadata) {
        console.log('No existing metadata, using extracted data directly');
        this.dicomMetadata = extractedMetadata as DicomMetadata;
        this.saveMetadataToServer();
        return;
      }
      
      console.log('Current metadata from API before merge:', this.dicomMetadata);
      
      // Create a copy of the current metadata for merging
      const mergedMetadata = { ...this.dicomMetadata } as DicomMetadata;
      
      // Track changes for logging
      const changes: Record<string, { from: any, to: any }> = {};
      
      // Reversed merging approach: DICOM file values take precedence over database values
      // This ensures we always have the most accurate data from the actual DICOM file
      Object.keys(extractedMetadata).forEach(key => {
        const newValue = (extractedMetadata as any)[key];
        const oldValue = mergedMetadata[key];
        
        // Only use non-empty values from the DICOM file
        if (newValue !== null && 
            newValue !== undefined && 
            newValue !== '' && 
            newValue !== 0 && 
            newValue !== 'Not available') {
          
          // Track if we're changing a value
          if (oldValue !== newValue) {
            changes[key] = { from: oldValue, to: newValue };
          }
          
          // Update the value
          mergedMetadata[key] = newValue;
        }
      });
      
      // Log any changes
      if (Object.keys(changes).length > 0) {
        console.log('Changed metadata fields during merge:', changes);
      } else {
        console.log('No metadata fields changed during merge');
      }
      
      this.dicomMetadata = mergedMetadata;
      console.log('Final merged metadata:', this.dicomMetadata);

      // Save the metadata to the server for next time
      this.saveMetadataToServer();
    } catch (error) {
      console.error('Error extracting DICOM metadata:', error);
    }
  }

  private getTagValue(dataset: any, tagName: string): string {
    try {
      if (!dataset) return '';
      
      // Try different access methods
      let value = null;
      
      // First try direct access
      if (dataset[tagName]) {
        value = dataset[tagName].value;
      }
      // Then try with 'x' prefix if not found and tag doesn't already start with 'x'
      else if (!tagName.startsWith('x') && dataset[`x${tagName}`]) {
        value = dataset[`x${tagName}`].value;
      }
      
      if (value === undefined || value === null) {
        return '';
      }
      
      // Handle array values (like image type)
      if (Array.isArray(value)) {
        return value.join('\\');
      }
      
      return value.toString();
    } catch (error) {
      console.warn(`Error reading DICOM tag ${tagName}:`, error);
      return '';
    }
  }

  private formatDate(dateString: string): string {
    if (!dateString || dateString.length !== 8) return dateString;
    
    // Format DICOM date (YYYYMMDD) to YYYY-MM-DD
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }

  private saveMetadataToServer(): void {
    if (!this.dicomMetadata || !this.selectedImage) {
      console.warn('Cannot save metadata: metadata or selectedImage is null');
      return;
    }
    
    // Create payload with image ID and extracted metadata
    const payload = {
      imageId: this.selectedImage.id,
      metadata: this.dicomMetadata
    };
    
    console.log('Saving metadata to server for image ID:', this.selectedImage.id);
    
    // Send metadata to server for storage in SQL database
    this.imageService.updateImageMetadata(payload).subscribe({
      next: (response) => {
        console.log('Metadata saved successfully to server:', response);
      },
      error: (error) => {
        console.error('Error saving metadata to server:', error);
      }
    });
  }

  zoomIn(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale += 0.25;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  }

  zoomOut(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale -= 0.25;
      if (this.viewport.scale < 0.25) this.viewport.scale = 0.25;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  }

  resetView(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale = 1;
      this.viewport.translation.x = 0;
      this.viewport.translation.y = 0;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error resetting view:', error);
    }
  }
  
  retryLoad(): void {
    if (this.selectedImage) {
      this.loadError = null;
      this.loadAndDisplayImage();
    }
  }

  private fetchMetadataFromApi(): void {
    if (!this.selectedImage) {
      console.warn('Cannot fetch metadata: no image selected');
      return;
    }
    
    console.log(`Fetching metadata from API for image ID: ${this.selectedImage.id}`);
    
    // Initialize metadata with empty values first
    this.dicomMetadata = {
      // Patient information
      patientName: '',
      patientId: '',
      patientBirthDate: '',
      patientSex: '',
      
      // Modality information
      modality: '',
      rows: 0,
      columns: 0,
      imageType: '',
      
      // Study information
      studyId: '',
      studyInstanceUid: '',
      studyDate: '',
      studyTime: '',
      
      // Series information
      seriesInstanceUid: '',
      seriesNumber: '',
      seriesDescription: '',
      
      // Anatomical information
      bodyPart: '',
      
      // Image information
      imageId: '',
      instanceNumber: '',
      windowCenter: 0,
      windowWidth: 0
    };
    
    this.imageService.getImageMetadata(this.selectedImage.id).subscribe({
      next: (response) => {
        console.log('===== API RESPONSE DEBUG =====');
        console.log('Raw API response:', response);
        
        // Early exit if response is empty
        if (!response || Object.keys(response).length === 0) {
          console.warn('API returned empty metadata response');
          return;
        }
        
        // Convert all keys to lowercase for consistent comparison
        const normalizedResponse: Record<string, any> = {};
        Object.keys(response).forEach(key => {
          normalizedResponse[key.toLowerCase()] = response[key];
        });
        
        console.log('Normalized response:', normalizedResponse);
        
        // Map all possible property names with case insensitivity
        const fieldsToCheck = [
          { target: 'patientName', apiKeys: ['patientname', 'patient_name', 'name'] },
          { target: 'patientId', apiKeys: ['patientid', 'patient_id', 'id'] },
          { target: 'patientBirthDate', apiKeys: ['patientbirthdate', 'patient_birth_date', 'birthdate', 'birth_date'] },
          { target: 'patientSex', apiKeys: ['patientsex', 'patient_sex', 'sex', 'gender'] },
          { target: 'modality', apiKeys: ['modality'] },
          { target: 'rows', apiKeys: ['rows'] },
          { target: 'columns', apiKeys: ['columns', 'cols'] },
          { target: 'imageType', apiKeys: ['imagetype', 'image_type', 'type'] },
          { target: 'studyId', apiKeys: ['studyid', 'study_id'] },
          { target: 'studyInstanceUid', apiKeys: ['studyinstanceuid', 'study_instance_uid'] },
          { target: 'studyDate', apiKeys: ['studydate', 'study_date'] },
          { target: 'studyTime', apiKeys: ['studytime', 'study_time'] },
          { target: 'seriesInstanceUid', apiKeys: ['seriesinstanceuid', 'series_instance_uid'] },
          { target: 'seriesNumber', apiKeys: ['seriesnumber', 'series_number'] },
          { target: 'seriesDescription', apiKeys: ['seriesdescription', 'series_description'] },
          { target: 'bodyPart', apiKeys: ['bodypart', 'body_part'] },
          { target: 'instanceNumber', apiKeys: ['instancenumber', 'instance_number'] },
          { target: 'windowCenter', apiKeys: ['windowcenter', 'window_center'] },
          { target: 'windowWidth', apiKeys: ['windowwidth', 'window_width'] }
        ];
        
        // Map API field names to frontend field names when needed
        fieldsToCheck.forEach(field => {
          // Try all possible API keys
          for (const apiKey of field.apiKeys) {
            if (normalizedResponse[apiKey] !== undefined && 
                normalizedResponse[apiKey] !== null && 
                normalizedResponse[apiKey] !== '') {
              (this.dicomMetadata as any)[field.target] = normalizedResponse[apiKey];
              console.log(`Set ${field.target} = ${normalizedResponse[apiKey]} (from API key: ${apiKey})`);
              break; // Stop once we find a matching key
            }
          }
        });
        
        console.log('Final metadata after API fetch:', this.dicomMetadata);
        console.log('===== END API RESPONSE DEBUG =====');
      },
      error: (error) => {
        console.error('Error fetching metadata from API:', error);
      }
    });
  }
} 