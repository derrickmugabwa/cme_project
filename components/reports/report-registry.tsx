import { 
  Users, 
  GraduationCap, 
  Award, 
  Calendar, 
  BarChart3
} from "lucide-react";

// Define report types
export interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: JSX.Element;
}

// Registry of all available reports
export const reports: Report[] = [
  {
    id: "enrollment-summary",
    name: "Enrollment Summary",
    description: "Overview of user enrollments across all webinars",
    category: "enrollment",
    icon: <Users className="h-5 w-5" />
  },
  {
    id: "webinar-completion",
    name: "Webinar Completion",
    description: "Statistics on webinar completion rates and times",
    category: "completion",
    icon: <GraduationCap className="h-5 w-5" />
  },
  {
    id: "certificate-issuance",
    name: "Certificate Issuance",
    description: "Report on certificates issued to users",
    category: "certificates",
    icon: <Award className="h-5 w-5" />
  },
  {
    id: "revenue-analysis",
    name: "Revenue Analysis",
    description: "Financial analysis of webinar enrollments and payments",
    category: "financial",
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    id: "activity-timeline",
    name: "Activity Timeline",
    description: "Timeline of user activities and engagement",
    category: "engagement",
    icon: <Calendar className="h-5 w-5" />
  }
];
