const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({  // Fixed typo: createTransport instead of createTransporter
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // You'll need to set this
        pass: process.env.EMAIL_PASS || 'your-app-password'     // You'll need to set this
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle form submission with photos
app.post('/submit-request', upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'frontRightCorner', maxCount: 1 },
    { name: 'rightSide', maxCount: 1 },
    { name: 'rearRightCorner', maxCount: 1 },
    { name: 'rear', maxCount: 1 },
    { name: 'rearLeftCorner', maxCount: 1 },
    { name: 'leftSide', maxCount: 1 },
    { name: 'leftFrontCorner', maxCount: 1 },
    { name: 'gutterSwatch', maxCount: 1 }
]), async (req, res) => {
    try {
        const { email, phone, address, notes } = req.body;
        const files = req.files;

        // Prepare email content
        let attachments = [];
        let photosList = '';

        Object.keys(files).forEach(fieldName => {
            const file = files[fieldName][0];
            attachments.push({
                filename: `${fieldName}-${file.filename}`,
                path: file.path
            });
            photosList += `${fieldName}: ${file.filename}\n`;
        });

        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: 'max@barringtonclaims.com',
            subject: `New GutterSnap Request - ${address}`,
            html: `
                <h2>New GutterSnap Photo Request</h2>
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h3>Customer Information:</h3>
                    <ul>
                        <li><strong>Email:</strong> ${email}</li>
                        <li><strong>Phone:</strong> ${phone}</li>
                        <li><strong>Address:</strong> ${address}</li>
                    </ul>
                    
                    <h3>Special Notes:</h3>
                    <p>${notes || 'No special notes provided'}</p>
                    
                    <h3>Photos Submitted:</h3>
                    <p>Please see attached photos for:</p>
                    <ul>
                        ${Object.keys(files).map(fieldName => 
                            `<li>${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>`
                        ).join('')}
                    </ul>
                    
                    <hr>
                    <p><em>Submitted via GutterSnap Web Application</em></p>
                </div>
            `,
            attachments: attachments
        };

        await transporter.sendMail(mailOptions);

        // Clean up uploaded files after sending email
        setTimeout(() => {
            Object.keys(files).forEach(fieldName => {
                const filePath = files[fieldName][0].path;
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }, 5000); // Delete after 5 seconds

        res.json({ success: true, message: 'Request submitted successfully!' });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ success: false, message: 'Error processing request. Please try again.' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
        }
    }
    res.status(500).json({ success: false, message: error.message });
});

app.listen(PORT, () => {
    console.log(`🏠 GutterSnap server running on http://localhost:${PORT}`);
    console.log(`📧 Make sure to set EMAIL_USER and EMAIL_PASS environment variables for email functionality`);
});