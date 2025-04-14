import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Startup } from "@shared/schema";
import { getInvestmentStageColor } from "@/lib/utils";
import { MessageSquare, Eye } from "lucide-react";

interface StartupCardProps {
  startup: Startup;
  view: "founder" | "investor";
}

const StartupCard = ({ startup, view }: StartupCardProps) => {
  const { id, name, description, pitch, investmentStage } = startup;
  const { bg: stageBg, text: stageText } = getInvestmentStageColor(investmentStage);
  
  // Choose a default image based on startup ID
  const getStartupImage = (id: number) => {
    const images = [
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1742&q=80",
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80",
      "https://images.unsplash.com/photo-1571974599782-a659946a9ef1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
    ];
    return images[id % images.length];
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="h-48 overflow-hidden">
        <img 
          src={getStartupImage(id)} 
          alt={`${name} team`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardContent className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold">{name}</h3>
          <Badge className={`${stageBg} ${stageText}`}>{investmentStage}</Badge>
        </div>
        <p className="text-gray-700 text-sm mb-4 line-clamp-2">{description}</p>
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Pitch:</h4>
          <p className="text-gray-600 text-sm line-clamp-3">{pitch}</p>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between gap-2">
        <Link href={`/startup/${id}`}>
          <Button variant="default" className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
        
        {view === "investor" && (
          <Link href={`/startup/${id}`}>
            <Button variant="outline" className="flex-1">
              <MessageSquare className="mr-2 h-4 w-4" />
              Contact
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};

export default StartupCard;
