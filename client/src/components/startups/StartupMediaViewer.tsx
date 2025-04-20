import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image, VideoIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MediaFile {
  id: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  startupId: string;
}

interface StartupMediaViewerProps {
  media: MediaFile[];
  isLoading: boolean;
}

export default function StartupMediaViewer({ media, isLoading }: StartupMediaViewerProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const sortedMedia = [...media].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sortedMedia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <Image className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No media available</h3>
        <p className="text-muted-foreground">
          No images or videos have been uploaded for this startup yet.
        </p>
      </div>
    );
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  const handleMediaClick = (media: MediaFile) => {
    setSelectedMedia(media);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sortedMedia.map((item) => (
          <Card 
            key={item.id} 
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleMediaClick(item)}
          >
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
              {isImage(item.mimeType) ? (
                <img 
                  src={item.fileUrl} 
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                />
              ) : isVideo(item.mimeType) ? (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <VideoIcon className="h-12 w-12 text-white opacity-75" />
                  </div>
                  <video 
                    src={item.fileUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="font-medium">{item.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium truncate">{item.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Media Preview Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.fileName}</DialogTitle>
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute top-2 right-2"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center">
            {selectedMedia && isImage(selectedMedia.mimeType) ? (
              <>
                <a 
                  href={selectedMedia.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary underline mb-4"
                >
                  Open image in new tab (full size)
                </a>
                <img 
                  src={selectedMedia.fileUrl} 
                  alt={selectedMedia.fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </>
            ) : selectedMedia && isVideo(selectedMedia.mimeType) ? (
              <>
                <a 
                  href={selectedMedia.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary underline mb-4"
                >
                  Open video in new tab (default player)
                </a>
                <video 
                  src={selectedMedia.fileUrl}
                  className="max-w-full max-h-[70vh]"
                  controls
                  autoPlay
                  preload="metadata"
                />
              </>
            ) : (
              <div className="text-center p-8">
                <p>This file type cannot be previewed</p>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            <p>Uploaded on: {selectedMedia && new Date(selectedMedia.createdAt).toLocaleString()}</p>
            <p>File size: {selectedMedia && (selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}