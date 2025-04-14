import ImageKit from 'imagekit';
import { Express, Request, Response } from 'express';
import { log } from './vite';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Default ImageKit credentials for development (will be overridden in production)
// These are the real keys for the application
const defaultPublicKey = 'public_w2aMVbEkSHlMI8jXUWHwtU5gRz4=';
const defaultPrivateKey = 'private_Y00SEOeis1Xs8woB86zFH0jzjWU='; 
const defaultUrlEndpoint = 'https://ik.imagekit.io/cyanzx1';

// Server-side ImageKit instance with fallback values for development
const imagekit = new ImageKit({
  publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || defaultPublicKey,
  privateKey: process.env.VITE_IMAGEKIT_PRIVATE_KEY || defaultPrivateKey,
  urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || defaultUrlEndpoint,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to check if real ImageKit credentials are provided
const hasRealImageKitCredentials = () => {
  return (
    process.env.VITE_IMAGEKIT_PUBLIC_KEY && 
    process.env.VITE_IMAGEKIT_PUBLIC_KEY !== defaultPublicKey &&
    process.env.VITE_IMAGEKIT_PRIVATE_KEY && 
    process.env.VITE_IMAGEKIT_PRIVATE_KEY !== defaultPrivateKey
  );
};

// Register ImageKit routes
export function registerImageKitRoutes(app: Express): void {
  // Authentication endpoint (may still be used for certain operations)
  app.get('/api/imagekit/auth', (req: Request, res: Response) => {
    try {
      if (!hasRealImageKitCredentials()) {
        log('Warning: Using development ImageKit credentials', 'imagekit');
      }
      const authenticationParameters = imagekit.getAuthenticationParameters();
      res.status(200).json(authenticationParameters);
    } catch (error) {
      log(`Error in ImageKit auth: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to generate authentication parameters' });
    }
  });

  // Upload file endpoint (server-side to avoid CORS)
  app.post('/api/imagekit/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      // For development mode without actual ImageKit credentials
      if (!hasRealImageKitCredentials()) {
        log('Warning: Using local file storage instead of ImageKit', 'imagekit');
        
        // Generate a relative URL path to access the file
        const fileName = req.body.fileName || path.basename(req.file.path);
        const uploadDir = path.join(__dirname, '../uploads');
        const finalPath = path.join(uploadDir, fileName);
        
        // Copy the file to the permanent uploads directory
        if (req.file.path !== finalPath) {
          fs.copyFileSync(req.file.path, finalPath);
          fs.unlinkSync(req.file.path);
        }
        
        // Return a local URL
        const localUrl = `/uploads/${fileName}`;
        return res.status(200).json({ 
          url: localUrl,
          fileId: fileName
        });
      }

      const folder = req.body.folder || '';
      const customFileName = req.body.fileName || path.basename(req.file.path);
      
      // Upload file to ImageKit
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(req.file.path),
        fileName: customFileName,
        folder: folder
      });
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({ 
        url: uploadResponse.url,
        fileId: uploadResponse.fileId
      });
    } catch (error) {
      log(`Error uploading file to ImageKit: ${error}`, 'imagekit');
      
      // Clean up temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: 'Failed to upload file to ImageKit' });
    }
  });

  // Delete file endpoint
  app.delete('/api/imagekit/delete/:fileId', async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ message: 'File ID is required' });
      }
      
      // For development mode without actual ImageKit credentials
      if (!hasRealImageKitCredentials()) {
        log('Warning: Using local file deletion instead of ImageKit', 'imagekit');
        
        const filePath = path.join(__dirname, '../uploads', fileId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        return res.status(200).json({ message: 'File deleted successfully' });
      }
      
      await imagekit.deleteFile(fileId);
      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      log(`Error deleting file from ImageKit: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // List files endpoint (useful for debugging and management)
  app.get('/api/imagekit/list', async (req: Request, res: Response) => {
    try {
      // For development mode without actual ImageKit credentials
      if (!hasRealImageKitCredentials()) {
        log('Warning: Using local file listing instead of ImageKit', 'imagekit');
        
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
          return res.status(200).json([]);
        }
        
        const files = fs.readdirSync(uploadDir)
          .filter(file => !file.startsWith('.'))
          .map(file => ({
            name: file,
            filePath: '/uploads/' + file,
            url: '/uploads/' + file,
            fileId: file
          }));
        
        return res.status(200).json(files);
      }
      
      const files = await imagekit.listFiles({
        path: req.query.path as string,
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      });
      
      res.status(200).json(files);
    } catch (error) {
      log(`Error listing files from ImageKit: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to list files' });
    }
  });
}