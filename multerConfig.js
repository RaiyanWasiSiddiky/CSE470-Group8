const multer = require('multer');
const path = require('path');

// Define storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, "./uploads")
    },
    filename: function (req, file, cb) {
        return cb(null, `${userID}-${file.originalname}`)
    }
});
  
const upload = multer({ 
storage: storage,
limits: {
    fileSize: 1024 * 1024 * 5 // Limit file size to 5MB
},
fileFilter: function (req, file, cb) {
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png' || 
        file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/plain') {
    cb(null, true); // Accept file
    } else {
    cb(new Error('Only JPEG, PNG, PDF, and TXT files are allowed')); // Reject file
    }
}
});


module.exports = {
    upload: upload
}; 
  