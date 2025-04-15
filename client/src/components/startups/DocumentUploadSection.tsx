import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentUpload from './DocumentUpload';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, BarChart2, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure';

interface DocumentUploadSectionProps {
  startupId: string;
  onDocumentUpload: (file: File, documentType: DocumentType, startupId: string) => Promise<void>;
}

export default function DocumentUploadSection({ startupId, onDocumentUpload }: DocumentUploadSectionProps) {
  const [activeTab, setActiveTab] = useState<DocumentType>('pitch_deck');
  const { toast } = useToast();

  const handleUpload = async (file: File, documentType: DocumentType) => {
    try {
      await onDocumentUpload(file, documentType, startupId);
      
      // Move to the next tab after successful upload
      if (documentType === 'pitch_deck') {
        setActiveTab('financial_report');
      } else if (documentType === 'financial_report') {
        setActiveTab('investor_agreement');
      } else if (documentType === 'investor_agreement') {
        toast({
          title: "All documents uploaded",
          description: "You've successfully uploaded all required documents!",
        });
      }
    } catch (error) {
      console.error('Error in document upload section:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Provide essential documents for potential investors to review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pitch_deck" value={activeTab} onValueChange={(value) => setActiveTab(value as DocumentType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pitch_deck" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Pitch Deck</span>
              <span className="sm:hidden">Pitch</span>
            </TabsTrigger>
            <TabsTrigger value="financial_report" className="flex items-center">
              <BarChart2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Financial Report</span>
              <span className="sm:hidden">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="investor_agreement" className="flex items-center">
              <FileCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Investor Agreement</span>
              <span className="sm:hidden">Agreement</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="pitch_deck">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Your pitch deck should include your vision, market opportunity, business model, 
                  team information, and growth strategy.
                </p>
                <DocumentUpload 
                  onUpload={(file) => handleUpload(file, 'pitch_deck')}
                  documentType="pitch_deck"
                  acceptedTypes={['.pdf', '.ppt', '.pptx']}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="financial_report">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload your financial projections, current revenue/expenses, and funding requirements
                  to help investors understand your financial position.
                </p>
                <DocumentUpload 
                  onUpload={(file) => handleUpload(file, 'financial_report')}
                  documentType="financial_report"
                  acceptedTypes={['.pdf', '.xls', '.xlsx', '.csv']}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="investor_agreement">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Provide a template of your investor agreement outlining the terms and conditions
                  for potential investors.
                </p>
                <DocumentUpload 
                  onUpload={(file) => handleUpload(file, 'investor_agreement')}
                  documentType="investor_agreement"
                  acceptedTypes={['.pdf', '.doc', '.docx']}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}