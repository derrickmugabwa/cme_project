'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type CertificateTemplate = {
  id?: string;
  name: string;
  title: string;
  subtitle: string;
  completion_text: string;
  quality_text: string;
  title_font: string;
  title_font_style: string;
  title_font_size: number;
  title_color: string;
  recipient_font: string;
  recipient_font_style: string;
  recipient_font_size: number;
  recipient_color: string;
  body_font: string;
  body_font_style: string;
  body_font_size: number;
  body_color: string;
  body_line_spacing?: number; // Line spacing for body paragraphs
  
  // Signature fields
  signature_left_name: string;
  signature_left_title: string;
  signature_right_name: string;
  signature_right_title: string;
  signature_font: string;
  signature_font_style: string;
  signature_font_size: number;
  signature_color: string;
  
  is_default: boolean;
};

// Font options available in jsPDF and additional web-safe fonts that can be used for certificates
const fontOptions = [
  // Standard PDF fonts
  'times', 'helvetica', 'courier',
  // Elegant/Script fonts for titles
  'georgia', 'palatino', 'garamond',
  // Additional options
  'arial', 'verdana', 'tahoma', 'trebuchet ms',
  // Serif fonts
  'cambria', 'book antiqua', 'bookman old style',
  // Sans-serif fonts
  'calibri', 'century gothic', 'segoe ui'
];
// Font style options for certificate text
const fontStyleOptions = [
  'normal',       // Regular text
  'italic',       // Slanted text
  'bold',         // Heavier text
  'bolditalic',   // Bold and slanted
  'light',        // Thinner text
  'medium',       // Medium weight
  'semibold'      // Semi-bold weight
];

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<CertificateTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Load templates on initial render
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certificate templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTemplate = () => {
    setCurrentTemplate({
      id: '',
      name: 'New Template',
      title: 'Certificate of Training',
      subtitle: 'is hereby presented to',
      completion_text: 'For having completed and achieved the required level of competence in',
      quality_text: 'for establishment and sustenance of Medical Laboratories Quality',
      title_font: 'times',
      title_font_style: 'italic',
      title_font_size: 36,
      title_color: '#000000',
      recipient_font: 'helvetica',
      recipient_font_style: 'bold',
      recipient_font_size: 28,
      recipient_color: '#00964C',
      body_font: 'times',
      body_font_style: 'normal',
      body_font_size: 12,
      body_color: '#000000',
      body_line_spacing: 8, // Default line spacing value
      
      // Default signature values
      signature_left_name: 'Richard Barasa',
      signature_left_title: 'QA Manager Int\'l Bv & Lead Trainer',
      signature_right_name: 'Daniel Obara',
      signature_right_title: 'SBU HR - International Business',
      signature_font: 'times',
      signature_font_style: 'normal',
      signature_font_size: 10,
      signature_color: '#000000',
      
      is_default: false,
    });
    setActiveTab('edit');
  };

  const editTemplate = (template: CertificateTemplate) => {
    setCurrentTemplate(template);
    setActiveTab('edit');
  };

  const saveTemplate = async () => {
    if (!currentTemplate) return;
    
    setIsSaving(true);
    try {
      if (currentTemplate.id) {
        // Update existing template
        const { error } = await supabase
          .from('certificate_templates')
          .update(currentTemplate)
          .eq('id', currentTemplate.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('certificate_templates')
          .insert([{ ...currentTemplate }])
          .select();

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
        
        if (data && data[0]) {
          setCurrentTemplate(data[0]);
        }
      }
      
      // Refresh the templates list
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      
      // Refresh the templates list
      await loadTemplates();
      
      // If we were editing this template, go back to the list
      if (currentTemplate?.id === id) {
        setCurrentTemplate(null);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CertificateTemplate, value: any) => {
    if (!currentTemplate) return;
    
    setCurrentTemplate({
      ...currentTemplate,
      [field]: value,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Certificate Templates</h1>
        <Button onClick={() => router.push('/dashboard/admin/certificates')}>
          Back to Certificates
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">Templates List</TabsTrigger>
          {currentTemplate && <TabsTrigger value="edit">Edit Template</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <div className="flex justify-end mb-4">
            <Button onClick={createNewTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {template.name}
                      {template.is_default && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Title:</strong> {template.title}</p>
                      <p><strong>Subtitle:</strong> {template.subtitle}</p>
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => editTemplate(template)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => template.id && deleteTemplate(template.id)}
                          disabled={!template.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {templates.length === 0 && (
                <div className="col-span-3 text-center p-8">
                  <p className="text-gray-500">No templates found. Create your first template!</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {currentTemplate && (
          <TabsContent value="edit">
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentTemplate.id ? `Edit: ${currentTemplate.name}` : 'Create New Template'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          value={currentTemplate.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={currentTemplate.is_default}
                          onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                        />
                        <Label htmlFor="is_default">Set as Default Template</Label>
                      </div>
                    </div>
                    
                    {/* Certificate Content */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Certificate Title</Label>
                        <Input
                          id="title"
                          value={currentTemplate.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="subtitle">Subtitle</Label>
                        <Input
                          id="subtitle"
                          value={currentTemplate.subtitle}
                          onChange={(e) => handleInputChange('subtitle', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="completion_text">Completion Text</Label>
                      <Textarea
                        id="completion_text"
                        value={currentTemplate.completion_text}
                        onChange={(e) => handleInputChange('completion_text', e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="quality_text">Quality Text</Label>
                      <Textarea
                        id="quality_text"
                        value={currentTemplate.quality_text}
                        onChange={(e) => handleInputChange('quality_text', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Title Styling</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="title_font">Font</Label>
                        <select
                          id="title_font"
                          className="w-full border rounded p-2"
                          value={currentTemplate.title_font}
                          onChange={(e) => handleInputChange('title_font', e.target.value)}
                        >
                          {fontOptions.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="title_font_style">Style</Label>
                        <select
                          id="title_font_style"
                          className="w-full border rounded p-2"
                          value={currentTemplate.title_font_style}
                          onChange={(e) => handleInputChange('title_font_style', e.target.value)}
                        >
                          {fontStyleOptions.map((style) => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="title_font_size">Size</Label>
                        <Input
                          id="title_font_size"
                          type="number"
                          value={currentTemplate.title_font_size}
                          onChange={(e) => handleInputChange('title_font_size', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="title_color">Color</Label>
                        <Input
                          id="title_color"
                          type="color"
                          value={currentTemplate.title_color}
                          onChange={(e) => handleInputChange('title_color', e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Recipient Name Styling</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="recipient_font">Font</Label>
                        <select
                          id="recipient_font"
                          className="w-full border rounded p-2"
                          value={currentTemplate.recipient_font}
                          onChange={(e) => handleInputChange('recipient_font', e.target.value)}
                        >
                          {fontOptions.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="recipient_font_style">Style</Label>
                        <select
                          id="recipient_font_style"
                          className="w-full border rounded p-2"
                          value={currentTemplate.recipient_font_style}
                          onChange={(e) => handleInputChange('recipient_font_style', e.target.value)}
                        >
                          {fontStyleOptions.map((style) => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="recipient_font_size">Size</Label>
                        <Input
                          id="recipient_font_size"
                          type="number"
                          value={currentTemplate.recipient_font_size}
                          onChange={(e) => handleInputChange('recipient_font_size', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="recipient_color">Color</Label>
                        <Input
                          id="recipient_color"
                          type="color"
                          value={currentTemplate.recipient_color}
                          onChange={(e) => handleInputChange('recipient_color', e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Body Text Styling</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="body_font">Font</Label>
                        <select
                          id="body_font"
                          className="w-full border rounded p-2"
                          value={currentTemplate.body_font}
                          onChange={(e) => handleInputChange('body_font', e.target.value)}
                        >
                          {fontOptions.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="body_font_style">Style</Label>
                        <select
                          id="body_font_style"
                          className="w-full border rounded p-2"
                          value={currentTemplate.body_font_style}
                          onChange={(e) => handleInputChange('body_font_style', e.target.value)}
                        >
                          {fontStyleOptions.map((style) => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="body_font_size">Size</Label>
                        <Input
                          id="body_font_size"
                          type="number"
                          value={currentTemplate.body_font_size}
                          onChange={(e) => handleInputChange('body_font_size', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="body_color">Color</Label>
                        <Input
                          id="body_color"
                          type="color"
                          value={currentTemplate.body_color}
                          onChange={(e) => handleInputChange('body_color', e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label htmlFor="body_line_spacing">Line Spacing</Label>
                      <div className="flex items-center space-x-4">
                        <Input
                          id="body_line_spacing"
                          type="range"
                          min="6"
                          max="16"
                          step="1"
                          value={currentTemplate.body_line_spacing || 8}
                          onChange={(e) => handleInputChange('body_line_spacing', parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="w-10 text-center">{currentTemplate.body_line_spacing || 8}px</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Controls the spacing between lines in body paragraphs</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Signature Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {/* Left Signature */}
                      <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium">Left Signature</h4>
                        <div>
                          <Label htmlFor="signature_left_name">Name</Label>
                          <Input
                            id="signature_left_name"
                            value={currentTemplate.signature_left_name}
                            onChange={(e) => handleInputChange('signature_left_name', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="signature_left_title">Title/Position</Label>
                          <Input
                            id="signature_left_title"
                            value={currentTemplate.signature_left_title}
                            onChange={(e) => handleInputChange('signature_left_title', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Right Signature */}
                      <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium">Right Signature</h4>
                        <div>
                          <Label htmlFor="signature_right_name">Name</Label>
                          <Input
                            id="signature_right_name"
                            value={currentTemplate.signature_right_name}
                            onChange={(e) => handleInputChange('signature_right_name', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="signature_right_title">Title/Position</Label>
                          <Input
                            id="signature_right_title"
                            value={currentTemplate.signature_right_title}
                            onChange={(e) => handleInputChange('signature_right_title', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <h4 className="font-medium mb-3">Signature Text Styling</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="signature_font">Font</Label>
                        <select
                          id="signature_font"
                          className="w-full border rounded p-2"
                          value={currentTemplate.signature_font}
                          onChange={(e) => handleInputChange('signature_font', e.target.value)}
                        >
                          {fontOptions.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="signature_font_style">Style</Label>
                        <select
                          id="signature_font_style"
                          className="w-full border rounded p-2"
                          value={currentTemplate.signature_font_style}
                          onChange={(e) => handleInputChange('signature_font_style', e.target.value)}
                        >
                          {fontStyleOptions.map((style) => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="signature_font_size">Size</Label>
                        <Input
                          id="signature_font_size"
                          type="number"
                          value={currentTemplate.signature_font_size}
                          onChange={(e) => handleInputChange('signature_font_size', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="signature_color">Color</Label>
                        <Input
                          id="signature_color"
                          type="color"
                          value={currentTemplate.signature_color}
                          onChange={(e) => handleInputChange('signature_color', e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCurrentTemplate(null);
                        setActiveTab('list');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveTemplate}
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
