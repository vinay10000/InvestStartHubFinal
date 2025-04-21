import { useState, useCallback, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image, VideoIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxView, setLightboxView] = useState<boolean>(false);
  
  // Embla carousel for image slider
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  // Carousel navigation
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);
  
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

  // Get all images and videos separately
  const images = sortedMedia.filter(item => item.mimeType.startsWith('image/'));
  const videos = sortedMedia.filter(item => item.mimeType.startsWith('video/'));
  const otherFiles = sortedMedia.filter(item => 
    !item.mimeType.startsWith('image/') && !item.mimeType.startsWith('video/'));

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  const handleMediaClick = (media: MediaFile, index?: number) => {
    setSelectedMedia(media);
    if (index !== undefined) {
      setSelectedIndex(index);
      
      // For image slider, just set the index and embla will handle it
      if (emblaApi && media.mimeType.startsWith('image/')) {
        emblaApi.scrollTo(index);
      }
    }
  };

  // Handle using browser's native viewer
  const handleViewInNative = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Images section - if there are images, show them in a slider */}
      {images.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Images ({images.length})</h3>
          
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {images.map((image, index) => (
                  <div 
                    key={image.id}
                    className="relative flex-[0_0_100%] min-w-0 aspect-video cursor-pointer"
                    onClick={() => handleMediaClick(image, index)}
                  >
                    <img 
                      src={image.fileUrl} 
                      alt={image.fileName}
                      className="w-full h-full object-contain bg-black/5 rounded-md"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full"
                  onClick={scrollPrev}
                  disabled={!prevBtnEnabled}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full"
                  onClick={scrollNext}
                  disabled={!nextBtnEnabled}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Image thumbnails */}
          <div className="flex overflow-x-auto gap-2 mt-2 pb-2">
            {images.map((image, index) => (
              <div 
                key={image.id}
                className={`flex-none w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                  selectedIndex === index ? "border-primary" : "border-transparent"
                }`}
                onClick={() => {
                  if (emblaApi) {
                    emblaApi.scrollTo(index);
                  }
                  setSelectedIndex(index);
                }}
              >
                <img 
                  src={image.fileUrl} 
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos section */}
      {videos.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Videos ({videos.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((video) => (
              <Card 
                key={video.id} 
                className="overflow-hidden"
              >
                <div className="aspect-video bg-slate-100">
                  <video 
                    src={video.fileUrl}
                    className="w-full h-full"
                    controls
                    poster={`${video.fileUrl}#t=0.1`} 
                    preload="metadata"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium truncate">{video.fileName}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewInNative(video.fileUrl);
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other files section */}
      {otherFiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Other Files ({otherFiles.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {otherFiles.map((file) => (
              <Card 
                key={file.id} 
                className="overflow-hidden"
              >
                <div className="p-4 text-center">
                  <p className="font-medium">{file.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                    onClick={() => handleViewInNative(file.fileUrl)}
                  >
                    Download
                  </Button>
                </div>
                <CardContent className="p-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnail Grid (grid view of all media) */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">All Media</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sortedMedia.map((item) => (
            <div 
              key={item.id} 
              className="cursor-pointer hover:opacity-80 transition-opacity rounded-md overflow-hidden"
              onClick={() => handleMediaClick(item)}
            >
              {isImage(item.mimeType) ? (
                <div className="aspect-square bg-slate-100">
                  <img 
                    src={item.fileUrl} 
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : isVideo(item.mimeType) ? (
                <div className="relative aspect-square bg-slate-100">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <VideoIcon className="h-12 w-12 text-white opacity-75" />
                  </div>
                  <video 
                    src={item.fileUrl}
                    poster={`${item.fileUrl}#t=0.1`}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-slate-100 text-center p-4">
                  <div>
                    <p className="font-medium truncate w-full">{item.fileName.split('.').pop()}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Media Preview Dialog */}
      <Dialog 
        open={!!selectedMedia} 
        onOpenChange={(open) => !open && setSelectedMedia(null)}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate max-w-[calc(100%-40px)]">
              {selectedMedia?.fileName}
            </DialogTitle>
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
              <div className="relative w-full">
                <img 
                  src={selectedMedia.fileUrl} 
                  alt={selectedMedia.fileName}
                  className="max-w-full max-h-[70vh] mx-auto object-contain"
                />
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleViewInNative(selectedMedia.fileUrl)}
                  >
                    View Full Size
                  </Button>
                </div>
              </div>
            ) : selectedMedia && isVideo(selectedMedia.mimeType) ? (
              <div className="w-full">
                <video 
                  src={selectedMedia.fileUrl}
                  className="max-w-full max-h-[70vh] mx-auto"
                  controls
                  autoPlay
                  preload="metadata"
                />
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleViewInNative(selectedMedia.fileUrl)}
                  >
                    Open in Default Player
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p>This file type cannot be previewed directly</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleViewInNative(selectedMedia?.fileUrl || "")}
                >
                  Download File
                </Button>
              </div>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground mt-4">
            <p>Uploaded on: {selectedMedia && new Date(selectedMedia.createdAt).toLocaleString()}</p>
            <p>File size: {selectedMedia && (selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {selectedMedia?.mimeType}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}