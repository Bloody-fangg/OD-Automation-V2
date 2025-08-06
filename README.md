# Amity OD Portal

A Next.js application for automating the generation of On-Duty (OD) requests for students participating in college events. This tool simplifies the process of identifying missed lectures and generating professional emails and reports for faculty approval.

## Features

- **Excel Upload**: Upload Excel files with student attendance data
- **Timetable Integration**: Automatically matches event times with the academic timetable
- **Missed Lecture Detection**: Identifies all lectures and labs that students will miss
- **Email Generation**: Creates a pre-formatted email with all necessary details
- **Report Generation**: Exports a detailed Excel report with student and lecture information
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18.0 or later
- pnpm (recommended) or npm
- Modern web browser

## Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd amity-od-portal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   # Email settings
   OD_RECIPIENT_EMAIL=amiarchive.in@gmail.com
   
   # Optional: Set to 'development' for debug logs
   NODE_ENV=development
   ```

4. **Add timetable data**
   Place your `timetable.json` file in the `/public/data/` directory with the following structure:
   ```json
   {
     "B.Tech CSE": {
       "1": {
         "A": {
           "courses": [
             {
               "subject_name": "Mathematics I",
               "faculty": "Dr. John Doe",
               "time": "Monday 09:15-10:10",
               "room": "A-101"
             }
           ],
           "labs": []
         }
       }
     }
   }
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000) to access the application.

## Excel File Format

The application expects Excel files with the following format:

1. **Rows 2-8**: Event metadata (columns A:B)
   - Event Name
   - Date
   - Time
   - Venue
   - Organizing Department
   - Faculty In-charge
   - Contact Details

2. **Row 10+**: Student data (columns A:D)
   - Column A: Student Name
   - Column B: Program (e.g., "B.Tech CSE", "BCA")
   - Column C: Section (e.g., "A", "B")
   - Column D: Semester (e.g., "1", "2")

## How It Works

1. **Upload Excel File**: Select the Excel file containing event and student data.
2. **Data Processing**:
   - The system parses the Excel file
   - Normalizes program names and sections
   - Matches event times with the academic timetable
   - Identifies all missed lectures and labs
3. **Generate Output**:
   - View a summary of the data
   - Copy the generated email or use the mailto link
   - Download a detailed Excel report

## Error Handling

The application provides helpful error messages for:
- Invalid file formats
- Missing or incorrect data in Excel files
- Timetable matching issues
- Email generation warnings

## Customization

### Changing Email Recipient
Update the `OD_RECIPIENT_EMAIL` environment variable in `.env.local` to change the default recipient.

### Modifying Timetable
Edit the `timetable.json` file to match your institution's schedule. The structure should follow the format shown in the example above.

### Styling
Customize the UI by modifying the components in the `/components` directory. The application uses Tailwind CSS for styling.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please email [your-email@example.com] or open an issue in the repository.
