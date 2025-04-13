import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Resume = {
  id: string;
  created_at: string;
  filename: string;
  user_id: string;
  parsed_data: any;
}

type PageInfo = {
  url?: string;
  title?: string;
  name?: string;
  jobTitle?: string;
  company?: string;
  pageContent?: string;
}

type GeneratedMessage = {
  id?: string;
  created_at?: string;
  user_id: string;
  message: string;
  recipient_name: string;
  recipient_title?: string;
  recipient_company?: string;
  resume_id: string;
  url?: string;
  job_id?: string;
}

type Job = {
  id?: string;
  created_at?: string;
  user_id: string;
  job_title: string;
  job_id?: string;
  company?: string;
  job_description?: string;
  job_url?: string;
  status?: string;
}

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

function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  
  // Job details state
  const [jobTitle, setJobTitle] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  
  // Template state
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          navigate('/login');
          return;
        }

        // Fetch user's resumes from LinkedAI database
        const { data, error: dataError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (dataError) throw dataError;
        const resumeData = data || [];
        setResumes(resumeData);
        if (resumeData.length > 0) {
          setSelectedResume(resumeData[0]);
        }
        
        // Fetch user's template
        fetchUserTemplate(user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch resume data');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [navigate]);
  
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
        if (defaultTemplate) {
          setTemplate(defaultTemplate);
        } else {
          // Otherwise use the first template
          setTemplate(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const saveJobToSupabase = async (pageInfo: PageInfo): Promise<string | null> => {
    try {
      if (!jobTitle.trim()) return null;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Create job object
      const jobData: Job = {
        user_id: user.id,
        job_title: jobTitle.trim(),
        job_id: jobId.trim() || undefined,
        company: jobCompany.trim() || pageInfo.company || undefined,
        job_description: jobDescription.trim() || undefined,
        job_url: pageInfo.url
      };
      
      console.log("Saving job to Supabase:", jobData);
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select();
        
      if (error) throw error;
      
      console.log("Job saved successfully:", data);
      return data[0].id;
      
    } catch (err) {
      console.error("Error saving job:", err);
      return null;
    }
  };

  const saveMessageToSupabase = async (messageText: string, pageInfo: PageInfo, resumeId: string, jobId?: string) => {
    try {
      setSavingMessage(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Debug log the page info
      console.log("DEBUGGING - pageInfo for Supabase:", {
        name: pageInfo.name,
        title: pageInfo.title,
        jobTitle: pageInfo.jobTitle,
        company: pageInfo.company,
        url: pageInfo.url
      });
      
      // Try to extract name from LinkedIn page title if we don't have one
      let recipientName = pageInfo.name || "";
      
      if (!recipientName && pageInfo.title && pageInfo.title.includes(" | LinkedIn")) {
        const titleParts = pageInfo.title.split(" | ")[0].split(" - ");
        if (titleParts.length > 0) {
          recipientName = titleParts[0].trim();
          console.log("Extracted name from page title for Supabase:", recipientName);
        }
      }
      
      // Final fallback if we still don't have a name
      if (!recipientName) {
        recipientName = "Unknown Recipient";
        console.log("No name found, using fallback:", recipientName);
      }
      
      console.log("FINAL recipient name for database:", recipientName);
      
      // Create message object
      const messageData: GeneratedMessage = {
        user_id: user.id,
        message: messageText,
        recipient_name: recipientName,
        recipient_title: pageInfo.jobTitle || undefined,
        recipient_company: pageInfo.company || undefined,
        resume_id: resumeId,
        url: pageInfo.url,
        job_id: jobId
      };
      
      console.log("Saving message to Supabase:", messageData);
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('generated_messages')
        .insert(messageData)
        .select();
        
      if (error) throw error;
      
      console.log("Message saved successfully:", data);
      setSavedMessage(true);
      
    } catch (err) {
      console.error("Error saving message:", err);
      // Don't show error to user, just log it
    } finally {
      setSavingMessage(false);
    }
  };

  const generateColdMessage = async () => {
    if (!selectedResume) {
      setError("Please select a resume first");
      return;
    }
    
    setGenerating(true);
    setError(null);
    setMessage(null);
    setSavedMessage(false);
    setSavedJobId(null);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get current tab information
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]?.id) {
          throw new Error("Could not find active tab");
        }
        
        console.log("User ID:", user.id);
        console.log("Resume user ID:", selectedResume.user_id);
        console.log("Resume data being sent:", selectedResume.parsed_data);
        
        // Add user ID to resume data for template lookup
        const resumeDataWithUser = {
          ...selectedResume.parsed_data,
          userId: user.id // Use the current user ID to ensure we get their template
        };
        
        // Execute script to scrape the page
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: scrapePageInfo
        }, async (results) => {
          if (!results || chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError?.message || "Failed to scrape page");
          }
          
          const pageInfo = results[0].result as PageInfo;
          console.log("Page info scraped:", pageInfo);
          
          // Save job information first if available
          let savedJobId = null;
          if (jobTitle.trim() || jobDescription.trim()) {
            savedJobId = await saveJobToSupabase(pageInfo);
            setSavedJobId(savedJobId);
          }
          
          // Send to background script to call Gemini API
          chrome.runtime.sendMessage({
            action: "generateMessage",
            pageInfo: pageInfo,
            resumeData: resumeDataWithUser,
            jobData: {
              jobTitle: jobTitle.trim(),
              jobId: jobId.trim(),
              jobDescription: jobDescription.trim(),
              jobCompany: jobCompany.trim()
            }
          }, async (response) => {
            console.log("Response from Gemini:", response);
            if (response.error) {
              setError(response.error);
            } else {
              setMessage(response.message);
              // Save message to Supabase
              if (selectedResume.id && response.message) {
                await saveMessageToSupabase(response.message, pageInfo, selectedResume.id, savedJobId || undefined);
              }
            }
            setGenerating(false);
          });
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate message');
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading your resume data...</p>
        </div>
      </div>
    );
  }

  if (error && !message) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-white p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 w-full">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <div className="mt-4">
                <button 
                  onClick={() => setError(null)}
                  className="px-3 py-1 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[500px] bg-white text-gray-800 flex flex-col" style={{ display: 'block' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 flex justify-between items-center">
        <h1 className="text-lg font-bold text-white">LinkedAI</h1>
        <button
          onClick={handleSignOut}
          className="px-2 py-1 text-xs text-blue-100 hover:text-white border border-blue-300 hover:border-white rounded-md"
        >
          Sign Out
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Resume selector */}
        <div className="bg-gray-50 border-b border-gray-200 p-2">
          <select 
            className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedResume?.id}
            onChange={(e) => {
              const selected = resumes.find(resume => resume.id === e.target.value);
              setSelectedResume(selected || null);
            }}
            disabled={generating}
          >
            <option value="" disabled selected={!selectedResume}>Select your resume</option>
            {resumes.map(resume => (
              <option key={resume.id} value={resume.id}>
                {resume.filename} - {new Date(resume.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        
        {/* Message generator */}
        <div className="p-4 overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">Generate a personalized cold message for the recruiter based on the current page and your resume.</p>
            
            {/* Job details section */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <button
                  onClick={() => setShowJobDetails(!showJobDetails)}
                  className="text-xs flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showJobDetails ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    )}
                  </svg>
                  {showJobDetails ? "Hide job details" : "Add job details (optional)"}
                </button>
                {savedJobId && (
                  <span className="text-xs text-green-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Job saved
                  </span>
                )}
              </div>
              
              {showJobDetails && (
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-3 space-y-2">
                  <div>
                    <label htmlFor="jobTitle" className="block text-xs font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="jobTitle"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Frontend Developer"
                      className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={generating}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="jobId" className="block text-xs font-medium text-gray-700 mb-1">
                      Job ID
                    </label>
                    <input
                      id="jobId"
                      type="text"
                      value={jobId}
                      onChange={(e) => setJobId(e.target.value)}
                      placeholder="e.g. JOB-123456"
                      className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={generating}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="jobCompany" className="block text-xs font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      id="jobCompany"
                      type="text"
                      value={jobCompany}
                      onChange={(e) => setJobCompany(e.target.value)}
                      placeholder="e.g. LinkedIn"
                      className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={generating}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="jobDescription" className="block text-xs font-medium text-gray-700 mb-1">
                      Job Description
                    </label>
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste key requirements or qualifications from the job posting"
                      className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      disabled={generating}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Template section - make collapsible */}
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
            
            <button
              onClick={generateColdMessage}
              disabled={generating || !selectedResume}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700
                      text-white font-medium rounded-md shadow-sm
                      hover:from-blue-700 hover:to-indigo-800 hover:shadow-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Message...
                </span>
              ) : 'Generate Cold Message'}
            </button>
          </div>
          
          {/* Display generated message */}
          {message && (
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-3">
              <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Generated Message</h3>
                <div className="flex items-center space-x-2">
                  {savedMessage && (
                    <span className="text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Saved
                    </span>
                  )}
                  {savingMessage && (
                    <span className="text-xs text-blue-600 flex items-center">
                      <svg className="animate-spin w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Saving
                    </span>
                  )}
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(message);
                    }}
                    className="flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors duration-200 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
              <div className="p-3 overflow-y-auto" style={{ maxHeight: "180px" }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>
          )}
          
          {resumes.length === 0 && (
            <div className="text-center mt-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No resumes found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload your resume on the LinkedAI website to generate personalized messages.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 py-2 px-3 text-xs text-center text-gray-500 border-t border-gray-200">
        &copy; {new Date().getFullYear()} LinkedAI. All rights reserved.
      </div>
    </div>
  );
}

export default Home;

// This function is used by chrome.scripting.executeScript
// Must be defined at module level
function scrapePageInfo() {
  // This function is injected into the page and executed there
  // Implementation will be provided by content.js
  return { 
    url: window.location.href,
    title: document.title
  };
} 