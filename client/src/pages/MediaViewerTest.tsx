import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StartupMediaViewer, { MediaFile } from "@/components/startups/StartupMediaViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample media files for testing
const sampleMediaFiles: MediaFile[] = [
  {
    id: "1",
    fileId: "image1",
    fileName: "startup-logo.png",
    fileUrl: "https://placehold.co/600x400/png",
    fileSize: 52428, // 50KB
    mimeType: "image/png",
    createdAt: new Date().toISOString(),
    startupId: "test-startup"
  },
  {
    id: "2",
    fileId: "image2",
    fileName: "product-demo.jpg",
    fileUrl: "https://placehold.co/800x600/jpg",
    fileSize: 104857, // 100KB
    mimeType: "image/jpeg",
    createdAt: new Date().toISOString(),
    startupId: "test-startup"
  },
  {
    id: "3",
    fileId: "image3",
    fileName: "team-photo.jpg",
    fileUrl: "https://placehold.co/1200x800/jpg",
    fileSize: 209715, // 200KB
    mimeType: "image/jpeg",
    createdAt: new Date().toISOString(),
    startupId: "test-startup"
  },
  {
    id: "4",
    fileId: "video1",
    fileName: "pitch-video.mp4",
    fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    fileSize: 5242880, // 5MB
    mimeType: "video/mp4",
    createdAt: new Date().toISOString(),
    startupId: "test-startup"
  },
  {
    id: "5",
    fileId: "doc1",
    fileName: "business-plan.pdf",
    fileUrl: "https://placehold.co/100x100/pdf",
    fileSize: 1048576, // 1MB
    mimeType: "application/pdf",
    createdAt: new Date().toISOString(),
    startupId: "test-startup"
  }
];

export default function MediaViewerTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(sampleMediaFiles);
  const [showEmpty, setShowEmpty] = useState(false);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Media Viewer Test Page</h1>
      
      <div className="flex gap-4 mb-6">
        <Button onClick={() => setIsLoading(!isLoading)}>
          {isLoading ? "Stop Loading" : "Simulate Loading"}
        </Button>
        <Button onClick={() => setShowEmpty(!showEmpty)}>
          {showEmpty ? "Show Sample Media" : "Show Empty State"}
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Media Viewer Component Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mediaViewer">
            <TabsList>
              <TabsTrigger value="mediaViewer">Media Viewer</TabsTrigger>
              <TabsTrigger value="mediaExplanation">Component Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mediaViewer" className="pt-4">
              <StartupMediaViewer 
                media={showEmpty ? [] : mediaFiles} 
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="mediaExplanation" className="pt-4">
              <div className="prose">
                <h3>Media Viewer Features</h3>
                <ul>
                  <li><strong>Image Slider:</strong> For multiple images with navigation arrows</li>
                  <li><strong>Image Thumbnails:</strong> For easy browsing of multiple images</li>
                  <li><strong>Native Video Player:</strong> Using browser's built-in video player</li>
                  <li><strong>Media Organization:</strong> Separate sections for images, videos, and other files</li>
                  <li><strong>Full-Size Viewing:</strong> Options to open media in a new tab</li>
                  <li><strong>Responsive Layout:</strong> Works on all screen sizes</li>
                </ul>
                
                <h3>Test Controls</h3>
                <p>
                  Use the buttons above to simulate loading state and toggle between 
                  showing sample media and an empty state.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>
          This is a test page for the StartupMediaViewer component. The sample media uses placeholder 
          images and a sample video for demonstration purposes.
        </p>
      </div>
    </div>
  );
}