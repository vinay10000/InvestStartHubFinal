import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, PlusCircle, Newspaper, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface StartupUpdate {
  id: string;
  startupId: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

interface StartupUpdatesProps {
  startupId: string;
  isFounder: boolean;
  updates: StartupUpdate[];
  isLoading: boolean;
}

export default function StartupUpdates({ startupId, isFounder, updates, isLoading }: StartupUpdatesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("news");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!title || !content) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your update",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/startups/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupId,
          title,
          content,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create update');
      }

      // Reset form
      setTitle("");
      setContent("");
      setCategory("news");
      setIsDialogOpen(false);
      
      // Show success message
      toast({
        title: "Update posted",
        description: "Your update has been successfully posted",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/startups', startupId, 'updates'] });
    } catch (error) {
      console.error("Error posting update:", error);
      toast({
        title: "Error",
        description: "Failed to post update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'news':
        return <Badge className="bg-blue-500">News</Badge>;
      case 'milestone':
        return <Badge className="bg-green-600">Milestone</Badge>;
      case 'funding':
        return <Badge className="bg-purple-600">Funding</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sortedUpdates = [...updates].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {isFounder && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Latest Updates</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Post Update
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Post a new update</DialogTitle>
                <DialogDescription>
                  Share news, milestones, or other important updates with your investors
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="title">Title</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., New Partnership Announcement"
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="news">News</option>
                    <option value="milestone">Milestone</option>
                    <option value="funding">Funding</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="content">Content</label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the details of your update..."
                    rows={6}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title || !content}
                  >
                    {isSubmitting ? "Posting..." : "Post Update"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {sortedUpdates.length > 0 ? (
        <div className="space-y-4">
          {sortedUpdates.map((update) => (
            <Card key={update.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">{update.title}</CardTitle>
                  {getCategoryBadge(update.category)}
                </div>
                <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(update.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <Clock className="h-3.5 w-3.5 ml-2" />
                  <span>
                    {new Date(update.createdAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="whitespace-pre-line">
                {update.content}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <Newspaper className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No updates available</h3>
          <p className="text-muted-foreground">
            {isFounder 
              ? "Share news, milestones and progress with your investors by posting updates."
              : "The startup hasn't posted any updates yet."}
          </p>
          {isFounder && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Post First Update
            </Button>
          )}
        </div>
      )}
    </div>
  );
}