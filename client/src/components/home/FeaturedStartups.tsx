import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Mock data for the static homepage
const featuredStartups = [
  {
    id: 1,
    name: "EcoTech Solutions",
    description: "Sustainable energy storage solutions for residential and commercial applications. Our patented battery technology increases efficiency by 35%.",
    stage: "Seed Stage",
    founderName: "Alex Smith",
    founderRole: "Founder & CEO",
    imageUrl: "https://images.unsplash.com/photo-1571974599782-a659946a9ef1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
  },
  {
    id: 2,
    name: "MediConnect",
    description: "AI-powered telemedicine platform connecting patients with specialists globally. Reducing diagnosis time by 60% through machine learning algorithms.",
    stage: "Pre-seed Stage",
    founderName: "Jane Park",
    founderRole: "Founder & CTO",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1742&q=80"
  },
  {
    id: 3,
    name: "FinBlock",
    description: "Decentralized financial infrastructure for cross-border transactions. Our blockchain solution reduces transaction costs by 80% for businesses.",
    stage: "Series A",
    founderName: "Raj Kumar",
    founderRole: "Co-founder & CEO",
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
  }
];

const getStageColorClasses = (stage: string) => {
  switch (stage) {
    case "Pre-seed Stage":
      return "bg-blue-100 text-blue-800";
    case "Seed Stage":
      return "bg-green-100 text-green-800";
    case "Series A":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const FeaturedStartups = () => {
  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary tracking-wide uppercase">Discover</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight">
            Featured Startups
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Explore innovative startups actively seeking investment. Find your next opportunity today.
          </p>
        </div>

        <div className="mt-12 grid gap-5 max-w-lg mx-auto sm:max-w-none md:grid-cols-2 lg:grid-cols-3">
          {featuredStartups.map((startup) => (
            <div key={startup.id} className="flex flex-col rounded-lg shadow-lg overflow-hidden">
              <div className="flex-shrink-0">
                <img className="h-48 w-full object-cover" src={startup.imageUrl} alt={`${startup.name} team`} />
              </div>
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColorClasses(startup.stage)}`}>
                      {startup.stage}
                    </span>
                  </p>
                  <a href="#" className="block mt-2">
                    <p className="text-xl font-semibold text-gray-900">{startup.name}</p>
                    <p className="mt-3 text-base text-gray-500">
                      {startup.description}
                    </p>
                  </a>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <span className="sr-only">Founder</span>
                    <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center">
                      <span className="text-primary-600 font-medium">
                        {startup.founderName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {startup.founderName}
                    </p>
                    <div className="flex space-x-1 text-sm text-gray-500">
                      <span>{startup.founderRole}</span>
                    </div>
                  </div>
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
          ))}
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
