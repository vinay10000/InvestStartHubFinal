import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  Wallet, 
  ArrowRight, 
  Globe, 
  Calendar, 
  TrendingUp,
  User
} from "lucide-react";
import { formatCurrency, formatDate, getInvestmentStageColor } from "@/lib/utils";
import { Startup } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface StartupCardProps {
  startup: Startup;
  onChainData?: any;
  isLoadingOnChain?: boolean;
  showActions?: boolean;
}

const StartupCard = ({ 
  startup, 
  onChainData, 
  isLoadingOnChain = false,
  showActions = true 
}: StartupCardProps) => {
  const { 
    id, 
    name, 
    description, 
    investmentStage, 
    category, 
    fundingGoal, 
    currentFunding, 
    logoUrl, 
    websiteUrl,
    founderId 
  } = startup;
  
  // Default values for null fields
  const fundingGoalValue = fundingGoal || "100000";
  const currentFundingValue = currentFunding || "0";
  
  // Calculate funding progress
  const fundingGoalNumber = parseFloat(fundingGoalValue);
  const currentFundingNumber = parseFloat(currentFundingValue);
  const progressPercentage = Math.min(
    (currentFundingNumber / fundingGoalNumber) * 100,
    100
  );
  
  // Get stage color
  const stageColorName = getInvestmentStageColor(investmentStage);
  
  // Format creation date safely
  const formattedDate = startup.createdAt ? formatDate(startup.createdAt) : "N/A";
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={logoUrl || ""} alt={name} />
            <AvatarFallback>
              <Building2 className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{name}</CardTitle>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {investmentStage}
              </Badge>
              {category && (
                <Badge variant="outline">
                  {category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-muted-foreground text-sm line-clamp-2 h-10 mb-2">
          {description}
        </p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>Funding Goal</span>
              <span>
                {formatCurrency(currentFundingNumber)} / {formatCurrency(fundingGoalNumber)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          {/* Founder ID */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-muted-foreground">Founder:</span>
            </div>
            <div className="text-right font-medium truncate">
              ID #{founderId}
            </div>
          </div>
          
          {/* On-chain data if available */}
          {isLoadingOnChain && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          
          {!isLoadingOnChain && onChainData && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <Wallet className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-muted-foreground">On-chain:</span>
              </div>
              <div className="text-right font-medium">
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">
                  Verified
                </span>
              </div>
              
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-muted-foreground">Valuation:</span>
              </div>
              <div className="text-right font-medium">
                {formatCurrency(onChainData.valuation)}
              </div>
            </div>
          )}
          
          {/* Additional info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {websiteUrl && (
              <>
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-muted-foreground">Website:</span>
                </div>
                <div className="text-right">
                  <a 
                    href={websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block"
                  >
                    {websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              </>
            )}
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
            </div>
            <div className="text-right font-medium">
              {formattedDate}
            </div>
          </div>
        </div>
      </CardContent>
      
      {showActions && (
        <CardFooter className="pt-4">
          <div className="flex w-full gap-2">
            <Link href={`/startup/${id}`} className="flex-1">
              <Button variant="default" className="w-full">
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default StartupCard;