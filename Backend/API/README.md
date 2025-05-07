# Image Viewer Backend

This is the backend API for the Image Viewer application, built with ASP.NET Core 7.0 and SQL Server.

## Prerequisites

1. [.NET 7.0 SDK](https://dotnet.microsoft.com/download/dotnet/7.0)
2. [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
3. [SQL Server Management Studio](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms) (Optional, for database management)
4. [Visual Studio 2022](https://visualstudio.microsoft.com/downloads/) or [Visual Studio Code](https://code.visualstudio.com/)
5. [Git](https://git-scm.com/downloads)

## Project Setup

1. Clone the repository
```bash
git clone https://github.com/JayadipSahoo/ImageViewerBackend.git
cd ImageViewerBackend
```

2. Install the required .NET tools:
```bash
dotnet tool install --global dotnet-ef
```

3. Install project dependencies:
```bash
dotnet restore
```

4. Update the database connection string in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=ImageDatabase;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  }
}
```

5. Create and apply database migrations:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Project Structure

- `Controllers/` - API endpoints
  - `ImageController.cs` - Handles image upload, retrieval, update, and deletion
- `Models/` - Data models
  - `Image.cs` - Image entity model
- `Data/` - Database context and configurations
  - `ApplicationDbContext.cs` - EF Core database context
- `Migrations/` - Database migrations

## Features

- Image upload with validation
- Image retrieval and streaming
- Image update and deletion
- CORS configuration for frontend integration
- Error handling and logging
- SQL Server database integration

## API Endpoints

### Images

- `GET /api/image` - Get all images
- `GET /api/image/{id}` - Get specific image
- `POST /api/image/upload` - Upload new image
- `PUT /api/image/{id}` - Update existing image
- `DELETE /api/image/{id}` - Delete image

## Running the Application

1. Start SQL Server Express service

2. Run the application:
```bash
dotnet run
```

The API will be available at `http://localhost:5028`

## Development

### Adding New Migration

After modifying the models, create a new migration:
```bash
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

### Updating Database Schema

To update the database to the latest migration:
```bash
dotnet ef database update
```

### Common Issues

1. SQL Server Connection
   - Ensure SQL Server Express is running
   - Verify connection string in appsettings.json
   - Check Windows Authentication is enabled

2. CORS Issues
   - Check CORS configuration in Program.cs
   - Verify allowed origins match frontend URL

3. File Upload Issues
   - Check file size limits in web.config
   - Verify upload directory permissions

## Dependencies

- Microsoft.EntityFrameworkCore.SqlServer
- Microsoft.EntityFrameworkCore.Tools
- Microsoft.AspNetCore.Cors
- System.Drawing.Common (for image processing)

## Configuration Options

### Maximum File Size
The default maximum file size is set to 10MB. To change this, update the configuration in `Program.cs`:

```csharp
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB
});
```

### CORS Settings
CORS is configured to allow requests from the Angular frontend. Update the CORS policy in `Program.cs` if needed:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev",
        builder => builder
            .WithOrigins("http://localhost:4200")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});
```

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
git remote add origin https://github.com/JayadipSahoo/ImageViewerBackend.git
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
