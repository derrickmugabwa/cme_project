'use client';

import { useParams } from 'next/navigation';
import WebinarDetailClient from './client';

// Use a client component for the page itself
// This way we can access the params directly without async issues
export default function WebinarDetailPage() {
  // Use the useParams hook to get the ID from the URL
  const params = useParams();
  const id = params.id as string;
  
  return <WebinarDetailClient sessionId={id} />;
}
