"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/client';
import { useToast } from '@/components/ui/use-toast';

// Define the certificate type
type Certificate = {
  id: string;
  certificate_number: string;
  user_id: string;
  session_id: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
  sessions: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
};

// Define the certificate template type
type CertificateTemplate = {
  id: string;
  title: string;
  is_default: boolean;
  created_at: string;
};

export default function CertificatesAdminPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [imageTimestamp, setImageTimestamp] = useState('');
  const [generatingSample, setGeneratingSample] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  
  // Set timestamp on client-side only
  useEffect(() => {
    setImageTimestamp(`?t=${Date.now()}`);
  }, []);

  // Function to load certificate templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      
      // Set the default template as selected
      const defaultTemplate = data?.find(template => template.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error loading templates",
        description: "Could not load certificate templates",
        variant: "destructive"
      });
    } finally {
      setLoadingTemplates(false);
    }
  }, [supabase, toast]);

  // Function to generate a sample certificate
  const generateSampleCertificate = async () => {
    try {
      setGeneratingSample(true);
      
      // Call the API to generate a sample certificate with the selected template
      const response = await fetch('/api/certificates/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplateId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate sample certificate');
      }
      
      const data = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample-certificate.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Sample certificate generated",
        description: "The sample certificate has been downloaded",
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating sample certificate:', error);
      toast({
        title: "Error generating certificate",
        description: "Could not generate the sample certificate",
        variant: "destructive"
      });
    } finally {
      setGeneratingSample(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load certificates
        const { data: certificatesData, error: certificatesError } = await supabase
          .from('certificates')
          .select(`
            *,
            profiles(id, full_name, email),
            sessions(id, title, start_time, end_time)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (certificatesError) throw certificatesError;
        setCertificates(certificatesData || []);
        
        // Load templates
        await loadTemplates();
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error loading data",
          description: "Could not load certificates or templates. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, toast, loadTemplates]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Certificate Management</h1>
      
      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="background">Background Image</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Issued Certificates</CardTitle>
              <CardDescription>
                View and manage certificates issued to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading certificates...</p>
              ) : certificates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Certificate Number</th>
                        <th className="text-left py-2">User</th>
                        <th className="text-left py-2">Session</th>
                        <th className="text-left py-2">Issued Date</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((cert: any) => (
                        <tr key={cert.id} className="border-b">
                          <td className="py-2">{cert.certificate_number}</td>
                          <td className="py-2">{cert.profiles?.full_name}</td>
                          <td className="py-2">{cert.sessions?.title}</td>
                          <td className="py-2">{new Date(cert.issued_at).toLocaleDateString()}</td>
                          <td className="py-2">
                            <Button variant="outline" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No certificates have been issued yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="background">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Design</CardTitle>
              <CardDescription>
                Customize the appearance of your certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Certificate Background</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload or update the background image used for certificates
                  </p>
                  <div className="flex space-x-4">
                    <Link href="/dashboard/admin/certificates/upload-background">
                      <Button>Upload New Background</Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={() => setImageTimestamp(`?t=${Date.now()}`)}
                    >
                      Refresh Preview
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={generateSampleCertificate} 
                      disabled={generatingSample}
                    >
                      {generatingSample ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                          Generating...
                        </>
                      ) : 'Generate Sample Certificate'}
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Certificate Preview</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is how your certificates will appear when generated
                  </p>
                  <div className="border rounded-md p-4 bg-muted">
                    <p>To see a preview of your certificate, please generate a sample certificate.</p>
                    <Button 
                      className="mt-4" 
                      variant="outline" 
                      onClick={generateSampleCertificate}
                      disabled={generatingSample}
                    >
                      {generatingSample ? 'Generating...' : 'Generate Sample Certificate'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link href="/dashboard/admin/certificates/upload-background">
                <Button>Update Certificate Background</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Templates</CardTitle>
              <CardDescription>
                Manage the content and styling of your certificate templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Template Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create and manage templates for your certificates. Templates control the text content and styling of certificates.
                  </p>
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    <li>Create multiple certificate templates with different styles</li>
                    <li>Customize fonts, colors, and text content</li>
                    <li>Set a default template for all certificates</li>
                    <li>Preview templates before applying them</li>
                  </ul>
                  <Link href="/dashboard/admin/certificates/templates">
                    <Button>Manage Certificate Templates</Button>
                  </Link>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Template Preview</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a sample certificate using a specific template
                  </p>
                  
                  {loadingTemplates ? (
                    <p>Loading templates...</p>
                  ) : templates.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="template-select" className="block text-sm font-medium">
                          Select Template
                        </label>
                        <select
                          id="template-select"
                          className="w-full p-2 border rounded-md"
                          value={selectedTemplateId || ''}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                        >
                          <option value="">Default Template</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.title} {template.is_default ? '(Default)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <Button 
                        onClick={generateSampleCertificate} 
                        disabled={generatingSample}
                      >
                        {generatingSample ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                            Generating...
                          </>
                        ) : 'Generate Sample Certificate'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p>No templates found. Create a template first.</p>
                      <Link href="/dashboard/admin/certificates/templates">
                        <Button>Create Template</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="issued">
          <Card>
            <CardHeader>
              <CardTitle>Issued Certificates</CardTitle>
              <CardDescription>
                View and manage certificates issued to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading certificates...</p>
              ) : certificates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Certificate Number</th>
                        <th className="text-left py-2">User</th>
                        <th className="text-left py-2">Session</th>
                        <th className="text-left py-2">Issued Date</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((cert: any) => (
                        <tr key={cert.id} className="border-b">
                          <td className="py-2">{cert.certificate_number}</td>
                          <td className="py-2">{cert.profiles?.full_name}</td>
                          <td className="py-2">{cert.sessions?.title}</td>
                          <td className="py-2">{new Date(cert.issued_at).toLocaleDateString()}</td>
                          <td className="py-2">
                            <Button variant="outline" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No certificates have been issued yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
