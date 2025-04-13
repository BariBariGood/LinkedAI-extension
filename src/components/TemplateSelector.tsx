import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type PromptTemplate = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template_type: 'description' | 'example';
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateSelectorProps {
  userId: string;
  onTemplateChange?: (template: PromptTemplate) => void;
}

const TemplateSelector = ({ userId, onTemplateChange }: TemplateSelectorProps) => {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  
  useEffect(() => {
    if (userId) {
      fetchUserTemplate(userId);
    }
  }, [userId]);
  
  const fetchUserTemplate = async (userId: string) => {
    setLoadingTemplate(true);
    try {
      // Fetch templates
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      console.log("User templates:", data);
      
      if (data && data.length > 0) {
        // Try to find default template first
        const defaultTemplate = data.find(t => t.is_default);
        const selectedTemplate = defaultTemplate || data[0];
        
        setTemplate(selectedTemplate);
        
        // Notify parent component if provided
        if (onTemplateChange) {
          onTemplateChange(selectedTemplate);
        }
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="text-xs flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showTemplate ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            )}
          </svg>
          {showTemplate ? "Hide template" : "Show message template"}
        </button>
      </div>
      
      {showTemplate && template && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-xs font-medium text-blue-700">Current Template: {template.name}</h4>
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
              {template.template_type === 'description' ? 'Format' : 'Example'}
            </span>
          </div>
          <div className="text-xs bg-white border border-blue-100 rounded p-2 max-h-20 overflow-y-auto">
            <p className="text-gray-700 whitespace-pre-wrap">{template.content}</p>
          </div>
        </div>
      )}
      
      {showTemplate && loadingTemplate && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex justify-center mb-3">
          <span className="text-xs text-gray-500 flex items-center">
            <svg className="animate-spin w-3 h-3 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading template...
          </span>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector; 