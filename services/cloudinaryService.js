// Cloudinary Service - Handles all photo uploads and storage
const cloudinary = require('cloudinary').v2;

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a single photo to Cloudinary from buffer
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - Folder path in Cloudinary (e.g., 'guttersnap/self-inspections/REQ123')
 * @param {string} publicId - Optional custom public ID for the file
 * @returns {Promise<Object>} Upload result with URL
 */
async function uploadPhoto(fileBuffer, folder, publicId = null) {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    public_id: publicId,
                    resource_type: 'image',
                    format: 'jpg',
                    transformation: [
                        { quality: 'auto', fetch_format: 'auto' },
                        { width: 1920, height: 1920, crop: 'limit' }
                    ]
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve({
                            success: true,
                            url: result.secure_url,
                            publicId: result.public_id,
                            format: result.format,
                            width: result.width,
                            height: result.height,
                            bytes: result.bytes
                        });
                    }
                }
            );

            uploadStream.end(fileBuffer);
        });
    } catch (error) {
        console.error('Error in uploadPhoto:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload a single photo to Cloudinary from file path (for local development)
 * @param {string} filePath - The file path from multer disk storage
 * @param {string} folder - Folder path in Cloudinary
 * @param {string} publicId - Optional custom public ID for the file
 * @returns {Promise<Object>} Upload result with URL
 */
async function uploadPhotoFromPath(filePath, folder, publicId = null) {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            public_id: publicId,
            resource_type: 'image',
            format: 'jpg',
            transformation: [
                { quality: 'auto', fetch_format: 'auto' },
                { width: 1920, height: 1920, crop: 'limit' }
            ]
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Error in uploadPhotoFromPath:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload multiple photos from a self-inspection request
 * @param {Object} files - Object with file buffers from multer (e.g., { front: [buffer], rear: [buffer] })
 * @param {string} requestId - Unique identifier for the request
 * @returns {Promise<Object>} Object with URLs for each photo
 */
async function uploadSelfInspectionPhotos(files, requestId) {
    try {
        const folder = `guttersnap/self-inspections/${requestId}`;
        const photoUrls = {};
        const uploadPromises = [];

        // Map of field names to photo positions
        const photoFields = {
            'front': 'front',
            'frontRightCorner': 'front-right-corner',
            'rightSide': 'right-side',
            'rearRightCorner': 'rear-right-corner',
            'rear': 'rear',
            'rearLeftCorner': 'rear-left-corner',
            'leftSide': 'left-side',
            'leftFrontCorner': 'left-front-corner',
            'gutterSwatch': 'gutter-swatch'
        };

        for (const [fieldName, fileName] of Object.entries(photoFields)) {
            if (files[fieldName] && files[fieldName][0]) {
                const file = files[fieldName][0];
                
                // Handle both buffer (Vercel) and path (local) storage
                if (file.buffer) {
                    // Memory storage (Vercel)
                    uploadPromises.push(
                        uploadPhoto(file.buffer, folder, fileName)
                            .then(result => {
                                photoUrls[fieldName] = result.url;
                            })
                            .catch(error => {
                                console.error(`Error uploading ${fieldName}:`, error);
                                photoUrls[fieldName] = null;
                            })
                    );
                } else if (file.path) {
                    // Disk storage (local dev) - upload from file path
                    uploadPromises.push(
                        uploadPhotoFromPath(file.path, folder, fileName)
                            .then(result => {
                                photoUrls[fieldName] = result.url;
                            })
                            .catch(error => {
                                console.error(`Error uploading ${fieldName}:`, error);
                                photoUrls[fieldName] = null;
                            })
                    );
                }
            }
        }

        await Promise.all(uploadPromises);

        return {
            success: true,
            photos: photoUrls,
            totalUploaded: Object.values(photoUrls).filter(url => url !== null).length
        };
    } catch (error) {
        console.error('Error uploading self inspection photos:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload signature image
 * @param {string} dataURL - Base64 data URL of the signature
 * @param {string} quoteId - Quote ID
 * @returns {Promise<Object>} Upload result with URL
 */
async function uploadSignature(dataURL, quoteId) {
    try {
        const result = await cloudinary.uploader.upload(dataURL, {
            folder: 'guttersnap/signatures',
            public_id: `${quoteId}-signature`,
            resource_type: 'image',
            format: 'png'
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Error uploading signature:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete a photo from Cloudinary
 * @param {string} publicId - The public ID of the photo to delete
 * @returns {Promise<Object>} Deletion result
 */
async function deletePhoto(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Error deleting photo:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete all photos in a folder (e.g., when deleting a request)
 * @param {string} folder - Folder path (e.g., 'guttersnap/self-inspections/REQ123')
 * @returns {Promise<Object>} Deletion result
 */
async function deleteFolder(folder) {
    try {
        const result = await cloudinary.api.delete_resources_by_prefix(folder);
        return {
            success: true,
            deleted: result.deleted
        };
    } catch (error) {
        console.error('Error deleting folder:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get a signed URL for secure photo access (optional - for private photos)
 * @param {string} publicId - The public ID of the photo
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} Signed URL
 */
function getSignedUrl(publicId, expiresIn = 3600) {
    const timestamp = Math.round(Date.now() / 1000) + expiresIn;
    return cloudinary.url(publicId, {
        sign_url: true,
        type: 'authenticated',
        expires_at: timestamp
    });
}

/**
 * Upload contract PDF (if needed in the future)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} quoteId - Quote ID
 * @returns {Promise<Object>} Upload result with URL
 */
async function uploadContract(pdfBuffer, quoteId) {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'guttersnap/contracts',
                    public_id: `contract-${quoteId}`,
                    resource_type: 'raw',
                    format: 'pdf'
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            success: true,
                            url: result.secure_url,
                            publicId: result.public_id
                        });
                    }
                }
            );

            uploadStream.end(pdfBuffer);
        });
    } catch (error) {
        console.error('Error uploading contract:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    uploadPhoto,
    uploadPhotoFromPath,
    uploadSelfInspectionPhotos,
    uploadSignature,
    uploadContract,
    deletePhoto,
    deleteFolder,
    getSignedUrl,
    cloudinary // Export the configured instance if needed
};

