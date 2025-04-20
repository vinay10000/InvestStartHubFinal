import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStartups, FirebaseStartup } from "@/firebase/database";

// Default images for startups that don't have images
const defaultImages = [
  "https://images.unsplash.com/photo-1571974599782-a659946a9ef1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1742&q=80",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
];

const getStageColorClasses = (stage: string | undefined) => {
  // Normalize the stage name for consistent comparison
  const normalizedStage = stage?.toLowerCase().trim() || '';
  
  if (normalizedStage.includes('pre-seed') || normalizedStage.includes('preseed')) {
    return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
  } else if (normalizedStage.includes('seed')) {
    return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
  } else if (normalizedStage.includes('series a')) {
    return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
  } else if (normalizedStage.includes('series b')) {
    return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
  } else if (normalizedStage.includes('series c')) {
    return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
  } else {
    return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
  }
};

const FeaturedStartups = () => {
  const [startups, setStartups] = useState<FirebaseStartup[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch startups from Firebase Realtime Database
  useEffect(() => {
    const fetchStartups = async () => {
      try {
        setLoading(true);
        // Get all startups from Firebase Realtime Database
        const firebaseStartups = await getStartups();
        
        // Sort by creation date (newest first) and limit to 3 for featured display
        const sortedStartups = firebaseStartups
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 3);
          
        setStartups(sortedStartups);
        console.log("Featured startups loaded:", sortedStartups.length);
      } catch (error) {
        console.error("Error fetching startups:", error);
        // Leave startups empty on error
        setStartups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary dark:text-primary tracking-wide uppercase">Discover</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl sm:tracking-tight">
            Featured Startups
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-400">
            Explore innovative startups actively seeking investment. Find your next opportunity today.
          </p>
        </div>

        <div className="mt-12 grid gap-5 max-w-lg mx-auto sm:max-w-none md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            // Loading skeletons
            [...Array(3)].map((_, index) => (
              <div key={`loading-${index}`} className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="mt-6">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            ))
          ) : startups.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No startups available at this moment. Check back later!</p>
            </div>
          ) : (
            startups.map((startup, index) => (
              <div key={startup.id} className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <div className="flex-shrink-0">
                  <img 
                    className="h-48 w-full object-cover" 
                    src={startup.logo_url || defaultImages[index % defaultImages.length]} 
                    alt={`${startup.name} logo`} 
                  />
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary dark:text-primary">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColorClasses(startup.investment_stage)}`}>
                        {startup.investment_stage || "Not Specified"}
                      </span>
                    </p>
                    <a href="#" className="block mt-2">
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{startup.name}</p>
                      <p className="mt-3 text-base text-gray-500 dark:text-gray-300">
                        {startup.description}
                      </p>
                    </a>
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <Link href={`/startup/${startup.id}`}>
                      <Button>View Details</Button>
                    </Link>
                    <Link href="/signin">
                      <Button variant="outline">Chat</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-10 text-center">
          <Link href="/investor/dashboard">
            <Button size="lg">
              View All Startups
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeaturedStartups;
