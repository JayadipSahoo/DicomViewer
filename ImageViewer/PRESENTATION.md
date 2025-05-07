# Image Viewer Project Technical Documentation

## Architecture Overview

The Image Viewer is a modern Angular application that operates entirely in the browser, leveraging client-side technologies for image handling, storage, and manipulation. This architecture choice eliminates the need for a backend server while providing a robust and responsive user experience.

### Core Technologies

- **Angular (v17+)**: The foundation framework providing component architecture, dependency injection, and reactive programming support
- **Angular Material**: UI component library for a consistent and modern look
- **Browser APIs**:
  - File System Access API for folder selection
  - LocalStorage API for image persistence
  - File API for image handling
- **Third-party Libraries**:
  - ngx-image-cropper for image manipulation

## Feature Deep Dive

### 1. Image Upload Process

#### User Interface
- Folder selection through a modern file picker interface
- Drag-and-drop support for individual files
- Progress indicators during file processing

#### Behind the Scenes
1. **Folder Selection**:
   ```typescript
   async loadImagesFromFolder() {
     try {
       const dirHandle = await window.showDirectoryPicker();
       // Process files recursively
     } catch (error) {
       console.error('Error accessing folder:', error);
     }
   }
   ```

2. **File Processing**:
   - Files are read as ArrayBuffers
   - Converted to Blob objects
   - Object URLs are created for browser-friendly access
   - Metadata is extracted and stored

3. **Storage Process**:
   - Images are stored in memory using RxJS BehaviorSubject
   - Persisted to localStorage for data retention
   - Object URLs are managed to prevent memory leaks

### 2. Gallery View System

#### Component Architecture
- Grid layout using Angular Material's MatGridList
- Responsive design adapting to screen sizes
- Lazy loading of images for performance

#### Image Loading
```typescript
loadImages() {
  this.images$ = this.imageService.getImages().pipe(
    map(images => images.map(img => ({
      ...img,
      url: URL.createObjectURL(img.file)
    })))
  );
}
```

#### Drag and Drop
- Implemented using Angular CDK's DragDropModule
- Updates image order in real-time
- Persists order changes to storage

#### Memory Management
- Object URLs are revoked when:
  - Images are deleted
  - Component is destroyed
  - New images replace old ones

### 3. Image Editing System

#### Editor Component
```typescript
@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [ImageCropperComponent, /* ... */]
})
```

#### Image Loading Process
1. File is passed to the editor
2. Loaded into ngx-image-cropper
3. Transform operations are tracked in state

#### Transformation Process
- Rotation: Handled in 90-degree increments
- Flipping: Horizontal and vertical transformations
- Cropping: Aspect ratio maintenance and free-form options

#### Cropping System
```typescript
imageCropped(event: ImageCroppedEvent) {
  if (event.base64) {
    this.croppedImage = event.base64;
    // Convert to File object for storage
  }
}
```

#### Save Process
1. Cropped image is converted from base64 to Blob
2. New File object is created with original metadata
3. Updated image replaces original in storage

### 4. Storage System

#### Local Storage Architecture
- Images stored as serialized objects
- File data converted to/from base64 for storage
- Metadata preserved separately

#### Data Structure
```typescript
interface StoredImage {
  id: string;
  name: string;
  type: string;
  data: string; // base64
  timestamp: number;
}
```

#### State Management
- In-memory state using RxJS BehaviorSubject
- Synchronization with localStorage
- Event-driven updates across components

#### Memory Management
- Automatic cleanup of unused object URLs
- Garbage collection friendly approach
- Storage limit monitoring and handling

## Performance Considerations

### Image Loading
- Progressive loading for large galleries
- Image resizing for thumbnails
- Caching strategies for frequently accessed images

### Storage Limits
- LocalStorage quota monitoring
- Automatic cleanup of old images when near limit
- User warnings for storage constraints

### Transformation Operations
- Client-side operations optimized for speed
- Memory-efficient handling of large images
- Background processing for heavy operations

## Security Considerations

### File Access
- Secure handling of file system permissions
- Sanitization of file inputs
- Validation of file types and sizes

### Data Storage
- Secure storage of image data
- No sensitive data exposure
- Cross-origin considerations

## Browser Compatibility

### Required Features
- File System Access API
- LocalStorage API
- Modern JavaScript APIs

### Progressive Enhancement
- Fallback for older browsers
- Feature detection and graceful degradation
- Clear user messaging for unsupported features

## Future Enhancements

### Performance
- WebAssembly for image processing
- Service Worker for offline support
- Virtual scrolling for large galleries

### Features
- Batch image processing
- Advanced filters and effects
- Cloud storage integration options

### User Experience
- Customizable UI themes
- Keyboard shortcuts
- Touch gesture support

## Package Dependencies

```json
{
  "@angular/core": "^17.0.0",
  "@angular/material": "^17.0.0",
  "ngx-image-cropper": "^9.1.2",
  "@angular/cdk": "^17.0.0"
}
```

This documentation provides a comprehensive overview of the Image Viewer project's architecture, features, and technical considerations. For specific implementation details, please refer to the source code and inline comments. 