# GutterSnap Web Application

A modern, responsive web application for collecting home photos and customer information for gutter assessment and quotes.

## Features

- **Photo Collection**: Captures 8 angles of the home plus gutter color preference
- **Customer Information**: Collects email, phone, address, and special notes
- **Email Integration**: Automatically sends all data to max@barringtonclaims.com
- **Modern UI**: Sleek, mobile-responsive design with smooth animations
- **File Validation**: Ensures proper image formats and file sizes
- **Real-time Feedback**: Live validation and upload status

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Email Configuration**
   - Copy `.env.example` to `.env`
   - Add your email credentials:
     ```
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-app-password
     ```
   - For Gmail: Enable 2FA and generate an app password

3. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open your browser to `http://localhost:3000`
   - The application is ready to use!

## Photo Requirements

The application collects photos from these angles:
- Front of home
- Front right corner
- Right side
- Rear right corner
- Rear of home
- Rear left corner
- Left side
- Left front corner
- Gutter color swatch

## Technical Details

- **Backend**: Node.js with Express
- **File Upload**: Multer middleware
- **Email**: Nodemailer with Gmail integration
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Styling**: Modern CSS with animations and responsive design

## File Structure

```
gutter-snap-app/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── public/               # Static files
│   ├── index.html       # Main application page
│   ├── styles.css       # Stylesheet
│   └── script.js        # Client-side JavaScript
├── uploads/             # Temporary file storage (auto-created)
└── README.md           # This file
```

## Email Setup

For Gmail integration:
1. Go to Google Account settings
2. Enable 2-factor authentication
3. Generate an app password for "Mail"
4. Use your Gmail address as `EMAIL_USER`
5. Use the app password as `EMAIL_PASS`

## Deployment Notes

- Files are temporarily stored in `uploads/` and deleted after email sending
- Maximum file size is 10MB per image
- Only image files are accepted
- All photos are required before submission

## Support

For technical support or questions, contact the development team at Barrington Claims Consultants.