using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate10 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DicomData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    StoragePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    UploadDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PatientName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PatientId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PatientBirthDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PatientSex = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Rows = table.Column<int>(type: "int", nullable: true),
                    Columns = table.Column<int>(type: "int", nullable: true),
                    ImageType = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    StudyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StudyInstanceUid = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    StudyDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StudyTime = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SeriesInstanceUid = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    SeriesNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SeriesDescription = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    BodyPart = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    WindowCenter = table.Column<float>(type: "real", nullable: true),
                    WindowWidth = table.Column<float>(type: "real", nullable: true),
                    InstanceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    HasAnnotations = table.Column<bool>(type: "bit", nullable: false),
                    AnnotationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AnnotationLabel = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    AnnotationData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastAccessed = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DicomData", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DicomData_PatientId",
                table: "DicomData",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_DicomData_StudyInstanceUid",
                table: "DicomData",
                column: "StudyInstanceUid");

            migrationBuilder.CreateIndex(
                name: "IX_DicomData_UploadDate",
                table: "DicomData",
                column: "UploadDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DicomData");
        }
    }
}
