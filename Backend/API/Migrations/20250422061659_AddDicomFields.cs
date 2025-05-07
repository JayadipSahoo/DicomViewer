using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddDicomFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Modality",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientId",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientName",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeriesInstanceUid",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SopInstanceUid",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudyInstanceUid",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Modality",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "PatientId",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "PatientName",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "SeriesInstanceUid",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "SopInstanceUid",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "StudyInstanceUid",
                table: "Images");
        }
    }
}
