"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, 
  FileSpreadsheet, 
  Download, 
  Loader2,
  CalendarIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
// Using simple date inputs instead of a complex date picker
import { DateRange } from "react-day-picker";

// Import report utilities
import { generateEnrollmentReport } from "@/components/reports/enrollment-report";
import { generateWebinarReport } from "@/components/reports/webinar-report";
import { generatePlaceholderReport } from "@/components/reports/placeholder-report";
import { reports, Report } from "@/components/reports/report-registry";

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Using separate date states for simpler handling
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Convert to DateRange object when needed
  const getDateRange = (): DateRange => ({
    from: new Date(startDate),
    to: new Date(endDate)
  });
  
  // Reset date range when opening the dialog
  const handleOpenDialog = (report: Report) => {
    setSelectedReport(report);
    // Reset to current month
    setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setIsDialogOpen(true);
  };

  const { toast } = useToast();

  // Filter reports based on search query
  const filteredReports = reports.filter(report => 
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate the selected report
  const generateReport = async () => {
    if (!selectedReport) return;
    setIsGenerating(true);
    
    try {
      switch (selectedReport.id) {
        case "webinar-attendees": {
          await generateWebinarReport({
            dateRange: getDateRange(),
            onSuccess: () => setIsDialogOpen(false),
            onError: (error: any) => console.error(error),
            toast: { toast }
          });
          break;
        }
        case "enrollment-summary": {
          await generateEnrollmentReport({
            dateRange: getDateRange(),
            onSuccess: () => setIsDialogOpen(false),
            onError: (error: any) => console.error(error),
            toast: { toast }
          });
          break;
        }
        default: {
          await generatePlaceholderReport({
            reportId: selectedReport.id,
            reportName: selectedReport.name,
            dateRange: getDateRange(),
            onSuccess: () => setIsDialogOpen(false),
            onError: (error: any) => console.error(error),
            toast: { toast }
          });
          break;
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reports Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Generate and download comprehensive reports for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            {reports.length} Available Reports
          </Badge>
        </div>
      </div>

      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-0 shadow-md focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card 
            key={report.id}
            className="cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-card to-background"
          >
            <div className="absolute top-0 right-0 p-3">
              <Badge variant="secondary" className="capitalize font-medium text-xs shadow-sm">
                {report.category}
              </Badge>
            </div>
            <CardHeader className="pt-8 pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-3 rounded-xl text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {report.icon}
                </div>
                <CardTitle className="text-xl font-bold">{report.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <CardDescription className="text-sm mb-6 line-clamp-2">{report.description}</CardDescription>
              <Button 
                variant="default" 
                size="sm" 
                className="w-full mt-2 shadow-sm group-hover:shadow-md transition-all duration-300"
                onClick={() => handleOpenDialog(report)}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
        
        {filteredReports.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-10 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No reports found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search query or browse all available reports.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg border-0 shadow-lg">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl text-primary">
                {selectedReport?.icon}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Generate {selectedReport?.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedReport?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Date Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full shadow-sm border rounded-lg bg-background pl-4 pr-10 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full shadow-sm border rounded-lg bg-background pl-4 pr-10 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Select the date range for your report data</p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full sm:w-auto shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
