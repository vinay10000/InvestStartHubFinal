import ImageKit from 'imagekit';
import { Express, Request, Response } from 'express';
import { log } from './vite';

// Server-side ImageKit instance
const imagekit = new ImageKit({
  publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.VITE_IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
});

// Register ImageKit routes
export function registerImageKitRoutes(app: Express): void {
  // Authentication endpoint for client-side uploads
  app.get('/api/imagekit/auth', (req: Request, res: Response) => {
    try {
      const authenticationParameters = imagekit.getAuthenticationParameters();
      res.status(200).json(authenticationParameters);
    } catch (error) {
      log(`Error in ImageKit auth: ${error}`, 'imagekit');
      res.status(500).json({ message: 'Failed to generate authentication parameters' });
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