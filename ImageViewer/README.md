# Image Viewer Frontend

A modern image gallery application built with Angular 17 and Angular Material, featuring image upload, editing, and management capabilities.

## Prerequisites

1. [Node.js](https://nodejs.org/) (v18.x or later)
2. [Angular CLI](https://angular.io/cli) (v17.x)
```bash
npm install -g @angular/cli
```
3. Backend API running (see [backend repository](https://github.com/JayadipSahoo/ImageViewerBackend))
4. [Git](https://git-scm.com/downloads)

## Project Setup

1. Clone the repository
```bash
git clone https://github.com/JayadipSahoo/ImageViewer.git
cd ImageViewer
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
ng serve
```

The application will be available at `http://localhost:4200`

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── gallery/          # Main gallery component
│   │   ├── image-editor/     # Image editing dialog
│   │   └── upload/           # Image upload component
│   ├── services/
│   │   └── image.service.ts  # Image management service
│   ├── app.component.ts      # Root component
│   └── app.module.ts         # Main module
├── assets/                   # Static assets
└── environments/            # Environment configurations
```

## Features

- Modern, responsive UI with Angular Material
- Drag and drop image upload
- Image editing capabilities:
  - Rotate
  - Flip horizontal/vertical
  - Save as new/update existing
- Gallery view with grid layout
- Image management (delete, download)
- Real-time updates

## Development

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

Generate new components, services, etc.:
```bash
ng generate component components/new-component
ng generate service services/new-service
```

### Build

Build the project:
```bash
# Development build
ng build

# Production build
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Dependencies

- @angular/material - Material Design components
- @angular/cdk - Component Dev Kit
- ngx-image-cropper - Image editing functionality
- rxjs - Reactive programming library

## Configuration

### Backend API Connection

The backend API URL is configured in `src/app/services/image.service.ts`:
```typescript
private apiUrl = 'http://localhost:5028/api/image';
```

### Environment Configuration

Environment-specific settings can be found in:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

## Features in Detail

### Gallery Component
- Grid layout for image display
- Drag and drop functionality
- Image selection and preview
- Quick actions (edit, delete, download)

### Image Editor
- Image cropping and rotation
- Flip horizontal/vertical
- Save as new image option
- Real-time preview

### Upload Component
- Multiple file upload support
- Progress indication
- File type validation
- Drag and drop support

## Common Issues

1. Image Upload Issues
   - Check maximum file size limits
   - Verify supported file types
   - Ensure backend API is accessible

2. Editor Issues
   - Verify ngx-image-cropper installation
   - Check browser compatibility
   - Ensure sufficient memory for large images

3. Gallery Loading Issues
   - Check network connectivity
   - Verify backend API status
   - Check browser console for errors

## Browser Support

The application supports all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.

## Git Setup (For Contributors)

If you're setting up a new repository:

1. Initialize git repository:
```bash
git init
```

2. Add all files:
```bash
git add .
```

3. Make initial commit:
```bash
git commit -m "first commit"
```

4. Rename branch to main:
```bash
git branch -M main
```

5. Add remote repository:
```bash
git remote add origin https://github.com/JayadipSahoo/ImageViewer.git
```

6. Push to remote:
```bash
git push -u origin main
```

If you encounter issues with existing git setup:
```bash
# Remove existing remote
git remote remove origin

# Then follow steps 5-6 above
```

## Related Repositories

- Backend API: [ImageViewerBackend](https://github.com/JayadipSahoo/ImageViewerBackend)
