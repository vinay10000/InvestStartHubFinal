import { useState } from "react";
import { Helmet } from "react-helmet";
import StartupMediaGallery from "@/components/startups/StartupMediaGallery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Image, HeartHandshake, TrendingUp, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StartupMediaExplorer() {
  const [category, setCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [viewTab, setViewTab] = useState<string>("gallery");

  return (
    <>
      <Helmet>
        <title>Media Explorer | StartupConnect</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/investor/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/media-explorer">Media Explorer</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Image className="h-7 w-7" />
                  Media Explorer
                </h1>
                <p className="text-muted-foreground mt-1">
                  Discover startups through their media content
                </p>
              </div>
              
              <div className="flex mt-4 md:mt-0 gap-2">
                <Button size="sm" className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Trending</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center">
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  <span>Saved</span>
                </Button>
              </div>
            </div>
            
            <Separator className="my-6" />
          </div>
          
          {/* Filters and Options */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Explore Options
              </CardTitle>
              <CardDescription>
                Customize your media browsing experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="health">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="sustainability">Sustainability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sort">Sort By</Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sort">
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="funding">Highest Funding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="view">View Style</Label>
                  <Tabs defaultValue={viewTab} onValueChange={setViewTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="gallery">Gallery</TabsTrigger>
                      <TabsTrigger value="list">List</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Media Gallery */}
          <StartupMediaGallery />
          
          {/* Featured Startups Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Startups with Great Visual Content
              </CardTitle>
              <CardDescription>
                Discover startups that regularly share rich media content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-6">
                  This feature is coming soon! We're gathering data on startups with the best visual content.
                </p>
                <Button variant="outline">Get Notified</Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Media Collection Tips */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Tips for Founders</CardTitle>
              <CardDescription>
                How to create compelling visual content for your startup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 list-disc pl-5">
                <li>
                  <strong>Product Demonstrations:</strong> Showcase your products in action with high-quality photos and videos.
                </li>
                <li>
                  <strong>Team Introductions:</strong> Humanize your startup with team photos and behind-the-scenes content.
                </li>
                <li>
                  <strong>User Testimonials:</strong> Include videos or images of satisfied customers using your product.
                </li>
                <li>
                  <strong>Progress Updates:</strong> Visually document your startup's journey and milestones.
                </li>
                <li>
                  <strong>Infographics:</strong> Present complex data in visually appealing formats.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}