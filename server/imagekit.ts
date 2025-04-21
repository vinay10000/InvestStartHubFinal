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

// For startup media which can be larger
const mediaUpload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
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
import { WebSocket } from 'ws';

// Store active WebSocket connections reference - will be populated by the WebSocket server
let activeConnections: Map<string, WebSocket> | null = null;

// Function to set WebSocket connections - called from routes.ts
export function setActiveConnections(connections: Map<string, WebSocket>) {
  activeConnections = connections;
}

// Function to broadcast a message to all connected clients
function broadcastMessage(message: any) {
  if (!activeConnections) {
    console.log('No active WebSocket connections available for broadcasting');
    return;
  }
  
  activeConnections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

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
      const tags = req.body.tags ? req.body.tags.split(',') : [];
      
      // Upload file to ImageKit with tags and metadata if provided
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(req.file.path),
        fileName: customFileName,
        folder: folder,
        tags: tags,
        useUniqueFileName: req.body.useUniqueFileName === 'true',
        // Add some useful metadata for tracking the document
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          contentType: req.file.mimetype,
          originalName: req.file.originalname,
          docType: req.body.tags || 'document'
        }
      });
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({ 
        url: uploadResponse.url,
        fileId: uploadResponse.fileId,
        name: uploadResponse.name,
        filePath: uploadResponse.filePath,
        size: uploadResponse.size,
        fileType: uploadResponse.fileType,
        height: uploadResponse.height,
        width: uploadResponse.width,
        thumbnailUrl: uploadResponse.thumbnailUrl
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
  
  // Document proxy endpoint - secure way to view documents with authentication check
  app.get('/api/document/view/:fileId', async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ message: 'No file ID provided' });
      }
      
      log(`Document view request for fileId: ${fileId}`, 'imagekit');
      
      // Check if this is a development file path
      if (fileId.includes('/uploads/') || !hasRealImageKitCredentials()) {
        const localPath = fileId.includes('/uploads/') 
          ? path.join(__dirname, '..', fileId) 
          : path.join(__dirname, '../uploads', fileId);
          
        log(`Attempting to serve local file: ${localPath}`, 'imagekit');
        
        if (fs.existsSync(localPath)) {
          return res.sendFile(path.resolve(localPath));
        } else {
          log(`Local file not found: ${localPath}`, 'imagekit');
          return res.status(404).json({ message: 'File not found' });
        }
      }
      
      // Get file details from ImageKit
      let fileDetails;
      try {
        fileDetails = await imagekit.getFileDetails(fileId);
        log(`File details retrieved: ${fileDetails.name}`, 'imagekit');
      } catch (error) {
        log(`Error getting file details: ${error}`, 'imagekit');
        return res.status(404).json({ message: 'File not found in ImageKit' });
      }
      
      if (!fileDetails) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // For images, PDFs and certain document types, redirect to URL with proper disposition
      const contentType = fileDetails.fileType || 'application/octet-stream';
      
      // ImageKit CDN will handle the file content properly when redirected
      return res.redirect(fileDetails.url);
    } catch (error) {
      log(`Error viewing document: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to view document' });
    }
  });
  
  // Document download endpoint
  app.get('/api/document/download/:fileId', async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ message: 'No file ID provided' });
      }
      
      // Check if this is a development file path
      if (fileId.includes('/uploads/') || !hasRealImageKitCredentials()) {
        const localPath = fileId.includes('/uploads/') 
          ? path.join(__dirname, '..', fileId) 
          : path.join(__dirname, '../uploads', fileId);
          
        if (fs.existsSync(localPath)) {
          const filename = path.basename(localPath);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          return res.sendFile(path.resolve(localPath));
        } else {
          return res.status(404).json({ message: 'File not found' });
        }
      }
      
      // Get file details from ImageKit
      let fileDetails;
      try {
        fileDetails = await imagekit.getFileDetails(fileId);
      } catch (error) {
        return res.status(404).json({ message: 'File not found in ImageKit' });
      }
      
      if (!fileDetails) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Set content disposition to force download
      res.setHeader('Content-Disposition', `attachment; filename="${fileDetails.name}"`);
      
      // Redirect to the file URL
      return res.redirect(fileDetails.url);
    } catch (error) {
      log(`Error downloading document: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to download document' });
    }
  });
  
  // Startup media upload endpoint - handles multiple files up to 20MB each
  app.post('/api/imagekit/upload-media', mediaUpload.array('files', 10), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { startupId } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }
      
      if (!startupId) {
        return res.status(400).json({ message: 'Startup ID is required' });
      }
      
      const uploadResults = [];
      
      // Process each file
      for (const file of files) {
        // For development mode without actual ImageKit credentials
        if (!hasRealImageKitCredentials()) {
          log('Warning: Using local file storage for media upload', 'imagekit');
          
          // Generate a unique filename
          const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
          const uploadDir = path.join(__dirname, '../uploads');
          const finalPath = path.join(uploadDir, fileName);
          
          // Copy the file to the permanent uploads directory
          if (file.path !== finalPath) {
            fs.copyFileSync(file.path, finalPath);
            fs.unlinkSync(file.path);
          }
          
          // Create a media record
          const mediaRecord = {
            fileId: fileName,
            fileName: file.originalname,
            fileUrl: `/uploads/${fileName}`,
            fileSize: file.size,
            mimeType: file.mimetype,
            startupId,
            createdAt: new Date().toISOString()
          };
          
          uploadResults.push(mediaRecord);
          continue;
        }
        
        // Upload to ImageKit with folder structure
        const uploadResponse = await imagekit.upload({
          file: fs.readFileSync(file.path),
          fileName: file.originalname,
          folder: `startups/${startupId}/media`,
          tags: ['startup-media'],
          useUniqueFileName: true,
          customMetadata: {
            startupId,
            uploadedAt: new Date().toISOString(),
            contentType: file.mimetype,
            originalName: file.originalname
          }
        });
        
        // Delete the temporary file
        fs.unlinkSync(file.path);
        
        // Create a media record
        const mediaRecord = {
          fileId: uploadResponse.fileId,
          fileName: uploadResponse.name,
          fileUrl: uploadResponse.url,
          fileSize: uploadResponse.size,
          mimeType: file.mimetype,
          startupId,
          createdAt: new Date().toISOString()
        };
        
        uploadResults.push(mediaRecord);
      }
      
      // Store the media records in the database
      // This would typically be handled by inserting into a database table
      // For now, we'll just return the results
      
      // Get startup name if available (for better notifications)
      let startupName = 'A startup';
      try {
        const startup = await fetch(`http://localhost:5000/api/startups/${startupId}`).then(r => r.json());
        if (startup && startup.name) {
          startupName = startup.name;
        }
      } catch (error) {
        log(`Error fetching startup name: ${error}`, 'imagekit');
      }
      
      // Broadcast WebSocket notification for each uploaded media file
      uploadResults.forEach(media => {
        // Determine the media type category
        const mediaType = media.mimeType.startsWith('image/') 
          ? 'image' 
          : media.mimeType.startsWith('video/') 
            ? 'video' 
            : 'file';
        
        // Create the notification message
        const notificationMessage = {
          type: 'new_media_uploaded',
          startupId,
          startupName,
          mediaId: media.fileId,
          mediaType,
          fileName: media.fileName,
          fileUrl: media.fileUrl,
          timestamp: Date.now()
        };
        
        // Broadcast to all connected clients
        broadcastMessage(notificationMessage);
        log(`Broadcasting new media upload: ${media.fileName} for startup ${startupId}`, 'imagekit');
      });
      
      res.status(200).json({ 
        success: true,
        media: uploadResults 
      });
    } catch (error) {
      log(`Error uploading media files: ${error}`, 'imagekit');
      
      // Clean up temporary files if they exist
      const files = req.files as Express.Multer.File[];
      if (files) {
        for (const file of files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
      
      res.status(500).json({ message: 'Failed to upload media files' });
    }
  });
}