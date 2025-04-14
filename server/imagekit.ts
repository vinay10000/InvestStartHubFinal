import ImageKit from 'imagekit';
import { Express, Request, Response } from 'express';
import { log } from './vite';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Server-side ImageKit instance
const imagekit = new ImageKit({
  publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.VITE_IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
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

// Register ImageKit routes
export function registerImageKitRoutes(app: Express): void {
  // Authentication endpoint (may still be used for certain operations)
  app.get('/api/imagekit/auth', (req: Request, res: Response) => {
    try {
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