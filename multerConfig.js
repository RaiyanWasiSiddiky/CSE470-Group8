const multer = require('multer');
const path = require('path');

// Define storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); // Set destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Set filename for uploaded files
    }
});

// const fileFilter = function (req, file, cb) {
//     const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/vnd.jupyter.notebook', 'text/x-python'];
//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true); // Accept file
//     } else {
//         cb(new Error('Only JPEG, PNG, PDF, TXT, IPYNB, and PY files are allowed'), false); // Reject file
//     }
// };

// Initialize multer with configuration
const upload = multer({
    storage: storage,
    // fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 10 // Limit file size to 5MB
    }
});

module.exports = upload;
