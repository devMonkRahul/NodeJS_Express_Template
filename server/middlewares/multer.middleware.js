import multer from "multer";
import fs from "fs";
import path from "path";

// Define the upload directory
const uploadDir = "./public/temp";

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Store uploaded files in "public/temp"
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter to accept only image files (.jpg, .jpeg, .png)
const imageFileFilter = (req, file, cb) => {
  // Get the file extension without the dot
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Define allowed extensions and MIME types
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png'
  ];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (.jpg, .jpeg, .png)"));
  }
};

export const uploadImage = multer({ 
  storage, 
  imageFileFilter,
});

export const upload = multer({ storage })