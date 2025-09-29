import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { 
  processReminderEmails,
  scheduleSessionReminders,
  sendSessionReminder,
  triggerManualReminders 
} from "@/lib/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReminderEmails,
    scheduleSessionReminders,
    sendSessionReminder,
    triggerManualReminders,
  ],
});
