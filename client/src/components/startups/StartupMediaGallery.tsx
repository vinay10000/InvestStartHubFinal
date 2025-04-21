import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Image as ImageIcon, Video, FileText, Star, X, ExternalLink, Info } from "lucide-react";
import { Link } from "wouter";
import type { MediaFile } from "./StartupMediaViewer";
import useEmblaCarousel from "embla-carousel-react";

interface StartupWithMedia {
  id: string;
  name: string;
  description: string;
  media: MediaFile[];
}

export default function StartupMediaGallery() {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [featuredStartups, setFeaturedStartups] = useState<StartupWithMedia[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupWithMedia | null>(null);
  const [emblaRef] = useEmblaCarousel({ loop: true });
  const [activeTab, setActiveTab] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [hasNewMedia, setHasNewMedia] = useState(false);
  const [recentMediaNotification, setRecentMediaNotification] = useState<{
    startupId: string;
    startupName: string;
    mediaId: string;
    mediaType: string;
    timestamp: number;
  } | null>(null);
  
  // Get WebSocket connection
  const { connected, lastMessage } = useWebSocket();
  const queryClient = useQueryClient();

  // Fetch list of startups
  const { data: startupsData, isLoading: startupsLoading } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: () => apiRequest('/api/startups')
  });
  
  // Listen for WebSocket messages about new media uploads
  useEffect(() => {
    if (!lastMessage) return;
    
    // Check if the message is a media notification
    if (lastMessage.type === 'new_media_uploaded') {
      console.log('New media uploaded notification received:', lastMessage);
      
      // Set notification state
      setRecentMediaNotification({
        startupId: lastMessage.startupId,
        startupName: lastMessage.startupName || 'A startup',
        mediaId: lastMessage.mediaId,
        mediaType: lastMessage.mediaType || 'file',
        timestamp: lastMessage.timestamp
      });
      
      // Set flag to show a refresh button or auto-refresh
      setHasNewMedia(true);
      
      // Optionally, auto-refresh the media data
      queryClient.invalidateQueries({ queryKey: [`/api/startups/${lastMessage.startupId}/media`] });
    }
  }, [lastMessage, queryClient]);

  useEffect(() => {
    if (startupsData?.startups) {
      // Simulate fetching media for each startup
      Promise.all(
        startupsData.startups.slice(0, 10).map(async (startup: any) => {
          try {
            // Fetch media for this startup
            const mediaResponse = await apiRequest(`/api/startups/${startup.id}/media`);
            
            // For this demo, if a startup has no media, we'll generate sample media
            const media = mediaResponse.media.length > 0 
              ? mediaResponse.media 
              : generateSampleMedia(startup.id, Math.floor(Math.random() * 3) + 1);
            
            return {
              ...startup,
              media
            };
          } catch (error) {
            console.error(`Error fetching media for startup ${startup.id}:`, error);
            return {
              ...startup,
              media: []
            };
          }
        })
      ).then(startupsWithMedia => {
        // Filter to only include startups that have media
        const withMedia = startupsWithMedia.filter(s => s.media.length > 0);
        
        // Set featured startups (those with the most media)
        setFeaturedStartups(
          withMedia
            .sort((a, b) => b.media.length - a.media.length)
            .slice(0, 5)
        );
      });
    }
  }, [startupsData]);

  // Function to generate sample media (only for demo purposes)
  const generateSampleMedia = (startupId: string, count: number): MediaFile[] => {
    const mediaTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    
    return Array.from({ length: count }).map((_, index) => {
      const type = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
      const isImage = type.startsWith('image');
      
      // Choose sample sources based on media type
      const url = isImage 
        ? `https://placehold.co/${800 + index * 100}x${600 + index * 50}/${['EEE', 'DDD', 'CCC'][index % 3]}/333`
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      
      return {
        id: `sample-${startupId}-${index}`,
        fileId: `sample-file-${index}`,
        fileName: isImage ? `startup-photo-${index}.${type.split('/')[1]}` : `startup-video-${index}.mp4`,
        fileUrl: url,
        fileSize: 1024 * 1024 * (index + 1), // 1MB+
        mimeType: type,
        createdAt: new Date().toISOString(),
        startupId
      };
    });
  };

  const handleMediaClick = (media: MediaFile, startup: StartupWithMedia) => {
    setSelectedMedia(media);
    setSelectedStartup(startup);
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  if (startupsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // If no startups with media
  if (featuredStartups.length === 0) {
    return (
      <Card className="w-full p-6 text-center">
        <CardHeader>
          <CardTitle className="flex justify-center items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Gallery
          </CardTitle>
          <CardDescription>
            Explore images and videos from promising startups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-10">
            <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No media available</h3>
            <p className="text-muted-foreground max-w-md">
              No startups have uploaded any media yet. Check back later or browse startup profiles directly.
            </p>
            <Button variant="outline" className="mt-8" asChild>
              <Link to="/investor/dashboard">View Startups</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Function to refresh data
  const refreshGallery = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/startups'] });
    // Clear notification state
    setHasNewMedia(false);
    setRecentMediaNotification(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Startup Media Gallery
              {connected && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Explore images and videos from promising startups
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "grid" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
            <Button 
              variant={viewMode === "carousel" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("carousel")}
            >
              Carousel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshGallery}
              className="ml-2"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Real-time update notification */}
        {hasNewMedia && recentMediaNotification && (
          <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mt-4 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {recentMediaNotification.mediaType.includes('image') ? (
                  <ImageIcon className="h-5 w-5 text-primary" />
                ) : recentMediaNotification.mediaType.includes('video') ? (
                  <Video className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                <p className="text-sm font-medium">
                  <span className="font-semibold">{recentMediaNotification.startupName}</span> just uploaded new {recentMediaNotification.mediaType.includes('image') ? 'images' : recentMediaNotification.mediaType.includes('video') ? 'videos' : 'media'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={refreshGallery}>
                  View New Media
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setHasNewMedia(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="all">All Media</TabsTrigger>
          </TabsList>
          
          <TabsContent value="featured" className="space-y-6">
            <h3 className="text-lg font-medium">Featured Startups</h3>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredStartups.map((startup) => (
                  <StartupMediaCard 
                    key={startup.id} 
                    startup={startup} 
                    onMediaClick={handleMediaClick} 
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border" ref={emblaRef}>
                <div className="flex">
                  {featuredStartups.map((startup) => (
                    <div key={startup.id} className="flex-[0_0_100%] min-w-0 p-4">
                      <StartupMediaCarouselSlide
                        startup={startup}
                        onMediaClick={handleMediaClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-6">
            <h3 className="text-lg font-medium">Recently Added Media</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredStartups.flatMap(startup => 
                startup.media
                  .slice(0, 2)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(media => (
                    <div 
                      key={media.id} 
                      className="overflow-hidden rounded-md border cursor-pointer"
                      onClick={() => handleMediaClick(media, startup)}
                    >
                      {isImage(media.mimeType) ? (
                        <div className="relative aspect-square">
                          <img 
                            src={media.fileUrl} 
                            alt={media.fileName} 
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                            <p className="text-xs text-white truncate">{startup.name}</p>
                          </div>
                        </div>
                      ) : isVideo(media.mimeType) ? (
                        <div className="relative aspect-square">
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <Video className="h-8 w-8 text-white opacity-75" />
                          </div>
                          <video 
                            src={media.fileUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                            <p className="text-xs text-white truncate">{startup.name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-slate-100">
                          <div className="text-center">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-xs">{startup.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="space-y-6">
            <h3 className="text-lg font-medium">All Startup Media</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {featuredStartups.flatMap(startup => 
                startup.media.map(media => (
                  <div 
                    key={media.id} 
                    className="overflow-hidden rounded-md border cursor-pointer"
                    onClick={() => handleMediaClick(media, startup)}
                  >
                    {isImage(media.mimeType) ? (
                      <div className="aspect-square bg-slate-100">
                        <img 
                          src={media.fileUrl} 
                          alt={media.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : isVideo(media.mimeType) ? (
                      <div className="relative aspect-square bg-slate-100">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Video className="h-8 w-8 text-white opacity-75" />
                        </div>
                        <video 
                          src={media.fileUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-slate-100">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{startup.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Media Preview Dialog */}
      <Dialog 
        open={!!selectedMedia} 
        onOpenChange={(open) => !open && setSelectedMedia(null)}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="truncate max-w-[calc(100%-40px)]">
                {selectedMedia?.fileName}
              </span>
              {selectedStartup && (
                <Badge variant="outline" className="ml-2">
                  {selectedStartup.name}
                </Badge>
              )}
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
                    size="sm"
                    className="mr-2"
                    onClick={() => window.open(selectedMedia.fileUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                  {selectedStartup && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/startup/${selectedStartup.id}`}>
                        <Info className="h-4 w-4 mr-2" />
                        View Startup
                      </Link>
                    </Button>
                  )}
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
                    size="sm"
                    className="mr-2"
                    onClick={() => window.open(selectedMedia.fileUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Default Player
                  </Button>
                  {selectedStartup && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/startup/${selectedStartup.id}`}>
                        <Info className="h-4 w-4 mr-2" />
                        View Startup
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p>This file type cannot be previewed directly</p>
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    onClick={() => window.open(selectedMedia?.fileUrl || "", '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                  {selectedStartup && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/startup/${selectedStartup.id}`}>
                        <Info className="h-4 w-4 mr-2" />
                        View Startup
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {selectedStartup && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-2">{selectedStartup.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedStartup.description?.slice(0, 150)}
                {selectedStartup.description?.length > 150 ? '...' : ''}
              </p>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/startup/${selectedStartup.id}`}>
                    View Startup Details
                  </Link>
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground mt-4">
            <p>Uploaded on: {selectedMedia && new Date(selectedMedia.createdAt).toLocaleString()}</p>
            <p>File size: {selectedMedia && (selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {selectedMedia?.mimeType}</p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Individual startup media card component
function StartupMediaCard({ 
  startup, 
  onMediaClick 
}: { 
  startup: StartupWithMedia; 
  onMediaClick: (media: MediaFile, startup: StartupWithMedia) => void; 
}) {
  // Get all images and videos
  const images = startup.media.filter(item => item.mimeType.startsWith('image/'));
  const videos = startup.media.filter(item => item.mimeType.startsWith('video/'));
  
  // Featured media (first image or video)
  const featuredMedia = images[0] || videos[0] || startup.media[0];
  
  return (
    <Card className="overflow-hidden">
      {/* Featured media preview */}
      <div 
        className="relative aspect-video cursor-pointer"
        onClick={() => onMediaClick(featuredMedia, startup)}
      >
        {featuredMedia.mimeType.startsWith('image/') ? (
          <img 
            src={featuredMedia.fileUrl} 
            alt={startup.name}
            className="w-full h-full object-cover"
          />
        ) : featuredMedia.mimeType.startsWith('video/') ? (
          <div className="relative w-full h-full">
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Video className="h-12 w-12 text-white opacity-75" />
            </div>
            <video 
              src={featuredMedia.fileUrl}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
            />
          </div>
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Media count indicator */}
        <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 text-xs text-white">
          {startup.media.length} {startup.media.length === 1 ? 'item' : 'items'}
        </div>
      </div>
      
      {/* Startup info */}
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium truncate mb-1">{startup.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {startup.description?.slice(0, 100) || "No description available"}
              {startup.description?.length > 100 ? '...' : ''}
            </p>
          </div>
        </div>
        
        {/* Thumbnail previews */}
        <div className="flex mt-3 space-x-2 overflow-x-auto pb-2">
          {startup.media.slice(0, 4).map((media, index) => (
            <div 
              key={media.id}
              className="flex-none w-16 h-16 rounded overflow-hidden cursor-pointer border"
              onClick={(e) => {
                e.stopPropagation();
                onMediaClick(media, startup);
              }}
            >
              {media.mimeType.startsWith('image/') ? (
                <img 
                  src={media.fileUrl} 
                  alt={media.fileName}
                  className="w-full h-full object-cover"
                />
              ) : media.mimeType.startsWith('video/') ? (
                <div className="relative w-full h-full bg-slate-100">
                  <Video className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-slate-500" />
                </div>
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-500" />
                </div>
              )}
            </div>
          ))}
          
          {startup.media.length > 4 && (
            <div className="flex-none w-16 h-16 rounded overflow-hidden bg-black/5 border flex items-center justify-center">
              <span className="text-sm font-medium">+{startup.media.length - 4}</span>
            </div>
          )}
        </div>
        
        {/* View startup button */}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/startup/${startup.id}`}>
              View Startup
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Carousel slide component
function StartupMediaCarouselSlide({ 
  startup, 
  onMediaClick 
}: { 
  startup: StartupWithMedia; 
  onMediaClick: (media: MediaFile, startup: StartupWithMedia) => void; 
}) {
  const [emblaRef] = useEmblaCarousel({ loop: true });
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{startup.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {startup.description || "No description available"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        {/* Media carousel */}
        <div className="relative rounded-md overflow-hidden mb-4 flex-grow" ref={emblaRef}>
          <div className="flex h-full">
            {startup.media.map((media) => (
              <div 
                key={media.id} 
                className="flex-[0_0_100%] min-w-0 h-full cursor-pointer"
                onClick={() => onMediaClick(media, startup)}
              >
                {media.mimeType.startsWith('image/') ? (
                  <img 
                    src={media.fileUrl} 
                    alt={media.fileName}
                    className="w-full h-full object-contain bg-black/5 rounded-md"
                  />
                ) : media.mimeType.startsWith('video/') ? (
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Video className="h-12 w-12 text-white opacity-75" />
                    </div>
                    <video 
                      src={media.fileUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Media type indicators */}
        <div className="flex gap-2 mb-4">
          {startup.media.some(m => m.mimeType.startsWith('image/')) && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              <span>
                {startup.media.filter(m => m.mimeType.startsWith('image/')).length} Images
              </span>
            </Badge>
          )}
          
          {startup.media.some(m => m.mimeType.startsWith('video/')) && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>
                {startup.media.filter(m => m.mimeType.startsWith('video/')).length} Videos
              </span>
            </Badge>
          )}
        </div>
        
        <Button variant="outline" size="sm" className="self-end" asChild>
          <Link to={`/startup/${startup.id}`}>
            View Startup
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}