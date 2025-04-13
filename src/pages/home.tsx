import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import JobDetailsForm from '../components/JobDetailsForm';
// import TemplateSelector from '../components/TemplateSelector';
import GeneratedMessage from '../components/GeneratedMessage';

type Resume = {
  id: string;
  created_at: string;
  user_id: string;
  filename: string;
  file_url?: string;
  file_type?: string;
  parsed_data: any;
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
  // Debug info state - commented out since no longer displaying debug info
  /* const [debugInfo, setDebugInfo] = useState<{
    jobSaveAttempted: boolean;
    jobSaveSuccess: boolean;
    messageSaveAttempted: boolean;
    messageSaveSuccess: boolean;
    jobId: string | null;
    error: string | null;
    lastAction: string;
  }>({
    jobSaveAttempted: false,
    jobSaveSuccess: false,
    messageSaveAttempted: false,
    messageSaveSuccess: false,
    jobId: null,
    error: null,
    lastAction: 'none'
  }); */
  const navigate = useNavigate();
  
  // Job details state
  const [jobTitle, setJobTitle] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [savedJobId, setSavedJobId] = useState<string | null>(null);

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
        
        // setCurrentUserId(user.id);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch resume data');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };
  
  const saveJobToSupabase = async (pageInfo: PageInfo): Promise<string | null> => {
    // setDebugInfo(prev => ({ ...prev, jobSaveAttempted: true, lastAction: 'saveJob:start' }));
    try {
      if (!jobTitle.trim()) {
        console.log("DEBUG: Job title empty, not saving");
        // setDebugInfo(prev => ({ ...prev, error: "Job title empty", lastAction: 'saveJob:emptyTitle' }));
        return null;
      }
      
      // Get current user
      console.log("DEBUG: Getting user for job save");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("DEBUG: User auth error:", userError);
        // setDebugInfo(prev => ({ ...prev, error: `Auth error: ${userError.message}`, lastAction: 'saveJob:userError' }));
        return null;
      }
      
      if (!user) {
        console.error("DEBUG: No authenticated user found");
        // setDebugInfo(prev => ({ ...prev, error: "No authenticated user", lastAction: 'saveJob:noUser' }));
        return null;
      }
      
      // Create job object
      const jobData = {
        user_id: user.id,
        job_title: jobTitle.trim(),
        job_id: jobId.trim() || undefined,
        company: jobCompany.trim() || pageInfo.company || undefined,
        job_description: jobDescription.trim() || undefined,
        job_url: pageInfo.url
      };
      
      console.log("DEBUG: Saving job to Supabase:", jobData);
      // setDebugInfo(prev => ({ ...prev, lastAction: 'saveJob:inserting' }));
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select();
        
      if (error) {
        console.error("DEBUG: Supabase error saving job:", error);
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: `DB error: ${error.code || error.message}`,
        //   lastAction: 'saveJob:dbError' 
        // }));
        return null;
      }
      
      if (!data || data.length === 0) {
        console.error("DEBUG: No data returned after saving job");
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: "No data after job save",
        //   lastAction: 'saveJob:noData' 
        // }));
        return null;
      }
      
      console.log("DEBUG: Job saved successfully:", data);
      setSavedJobId(data[0].id);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   jobSaveSuccess: true,
      //   jobId: data[0].id,
      //   lastAction: 'saveJob:success' 
      // }));
      return data[0].id;
      
    } catch (err) {
      console.error("DEBUG: Error saving job:", err);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   error: `Job save error: ${err instanceof Error ? err.message : String(err)}`,
      //   lastAction: 'saveJob:exception' 
      // }));
      return null;
    }
  };
  
  const saveMessageToSupabase = async (messageText: string, pageInfo: PageInfo, resumeId: string, jobId?: string): Promise<boolean> => {
    // setDebugInfo(prev => ({ ...prev, messageSaveAttempted: true, lastAction: 'saveMessage:start' }));
    try {
      setSavingMessage(true);
      
      // Get current user
      console.log("DEBUG: Getting user for message save");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("DEBUG: User auth error for message:", userError);
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: `Auth error: ${userError.message}`,
        //   lastAction: 'saveMessage:authError' 
        // }));
        return false;
      }
      
      if (!user) {
        console.error("DEBUG: No authenticated user for message");
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: "No authenticated user",
        //   lastAction: 'saveMessage:noUser' 
        // }));
        return false;
      }
      
      // Check if the resume exists in the database
      console.log("DEBUG: Verifying resume_id exists:", resumeId);
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('id')
        .eq('id', resumeId)
        .single();
        
      if (resumeError) {
        console.error("DEBUG: Error verifying resume:", resumeError);
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: `Resume error: ${resumeError.code || resumeError.message}`,
        //   lastAction: 'saveMessage:resumeVerifyError' 
        // }));
        
        if (resumeError.code === 'PGRST116') {
          // setDebugInfo(prev => ({ 
          //   ...prev, 
          //   error: `Resume ID ${resumeId} not found`,
          //   lastAction: 'saveMessage:resumeNotFound' 
          // }));
        }
        return false;
      }
      
      if (!resumeData) {
        console.error("DEBUG: Resume not found with ID:", resumeId);
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: `Resume ID ${resumeId} not found`,
        //   lastAction: 'saveMessage:resumeNotFound' 
        // }));
        return false;
      }
      
      console.log("DEBUG: Resume verified successfully");
      
      // Try to extract name from LinkedIn page title if we don't have one
      let recipientName = pageInfo.name || "";
      console.log("DEBUG: Initial recipient name:", recipientName);
      
      if (!recipientName && pageInfo.title && pageInfo.title.includes(" | LinkedIn")) {
        const titleParts = pageInfo.title.split(" | ")[0].split(" - ");
        if (titleParts.length > 0) {
          recipientName = titleParts[0].trim();
          console.log("DEBUG: Extracted name from title:", recipientName);
        }
      }
      
      // Final fallback if we still don't have a name
      if (!recipientName) {
        recipientName = "Unknown Recipient";
        console.log("DEBUG: Using fallback recipient name");
      }
      
      // Clean up the recipient name with regex to remove numbers, (), |, and "LinkedIn"
      const originalName = recipientName;
      recipientName = recipientName.replace(/[\d()|\s]+|LinkedIn/g, ' ').trim();
      console.log("DEBUG: Cleaned recipient name:", recipientName, "from original:", originalName);
      
      // Create message object - removing job_id field which is causing the foreign key violation
      const messageData = {
        user_id: user.id,
        message: messageText,
        recipient_name: recipientName,
        recipient_title: pageInfo.jobTitle || undefined,
        recipient_company: pageInfo.company || undefined,
        resume_id: resumeId,
        url: pageInfo.url
        // job_id field removed as it's causing a foreign key violation
      };
      
      // Log what we're doing with the job ID
      if (jobId) {
        console.log("DEBUG: Not including job_id in message data due to schema error:", jobId);
      }
      
      console.log("DEBUG: Saving message data to Supabase:", messageData);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   lastAction: 'saveMessage:inserting',
      //   jobId: jobId || null 
      // }));
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('generated_messages')
        .insert(messageData)
        .select();
        
      if (error) {
        console.error("DEBUG: Supabase error saving message:", error);
        console.error("DEBUG: Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Error message variable no longer used since debug display is commented out
        // let errorMessage = `DB error: ${error.code || error.message}`;
        
        // // Check for specific error types
        // if (error.code === 'PGRST204') {
        //   errorMessage = `Foreign key violation: ${error.details || error.message}`;
        //   
        //   // Add more specific messaging if we can identify the issue
        //   if (error.details && error.details.includes('resume_id')) {
        //     errorMessage = `Resume ID ${resumeId} does not exist or is invalid`;
        //   } else if (error.details && error.details.includes('job_id')) {
        //     errorMessage = `Job ID column issue: ${error.details}`;
        //   }
        // } else if (error.code === 'PGRST205') {
        //   errorMessage = `Constraint violation: ${error.details || error.message}`;
        // }
        
        // setDebugInfo(prev => ({ 
        //   ...prev, 
        //   error: errorMessage,
        //   lastAction: 'saveMessage:dbError' 
        // }));
        return false;
      }
      
      console.log("DEBUG: Message saved successfully:", data);
      setSavedMessage(true);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   messageSaveSuccess: true,
      //   lastAction: 'saveMessage:success' 
      // }));
      return true;
      
    } catch (err) {
      console.error("DEBUG: Error saving message:", err);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   error: `Message save error: ${err instanceof Error ? err.message : String(err)}`,
      //   lastAction: 'saveMessage:exception' 
      // }));
      return false;
    } finally {
      setSavingMessage(false);
    }
  };

  const generateColdMessage = async () => {
    if (!selectedResume) {
      setError("Please select a resume first");
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   error: "No resume selected",
      //   lastAction: 'generate:noResume' 
      // }));
      return;
    }
    
    // Reset states
    setGenerating(true);
    setError(null);
    setMessage(null);
    setSavedMessage(false);
    setSavedJobId(null);
    // setDebugInfo({
    //   jobSaveAttempted: false,
    //   jobSaveSuccess: false,
    //   messageSaveAttempted: false,
    //   messageSaveSuccess: false,
    //   jobId: null,
    //   error: null,
    //   lastAction: 'generate:start'
    // });
    
    try {
      // Get current tab information
      console.log("DEBUG: Querying for active tab");
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]?.id) {
          console.error("DEBUG: No active tab found");
          setGenerating(false);
          setError("Could not find active tab");
          // setDebugInfo(prev => ({ 
          //   ...prev, 
          //   error: "No active tab found",
          //   lastAction: 'generate:noTab' 
          // }));
          return;
        }
        
        // Get current user for the template
        console.log("DEBUG: Getting current user");
        const { data: { user } } = await supabase.auth.getUser();
        
        // Debug log to console
        console.log("DEBUG: Resume data being sent:", selectedResume.parsed_data);
        // setDebugInfo(prev => ({ ...prev, lastAction: 'generate:scraping' }));
        
        // Execute script to scrape the page
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: scrapePageInfo
        }, async (results) => {
          if (!results || chrome.runtime.lastError) {
            console.error("DEBUG: Error scraping page:", chrome.runtime.lastError);
            setGenerating(false);
            setError(chrome.runtime.lastError?.message || "Failed to scrape page");
            // setDebugInfo(prev => ({ 
            //   ...prev, 
            //   error: `Scrape error: ${chrome.runtime.lastError?.message || "Unknown"}`,
            //   lastAction: 'generate:scrapeError' 
            // }));
            return;
          }
          
          const pageInfo = results[0].result as PageInfo;
          console.log("DEBUG: Page info scraped:", pageInfo);
          // setDebugInfo(prev => ({ ...prev, lastAction: 'generate:callAPI' }));
          
          // Add user ID to resume data for template lookup
          const resumeDataWithUser = {
            ...selectedResume.parsed_data,
            userId: user?.id // Add the user ID for template lookup
          };
          
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
            console.log("DEBUG: Response from Gemini:", response);
            if (response.error) {
              console.error("DEBUG: Gemini API error:", response.error);
              setError(response.error);
              setGenerating(false);
              // setDebugInfo(prev => ({ 
              //   ...prev, 
              //   error: `API error: ${response.error}`,
              //   lastAction: 'generate:apiError' 
              // }));
              return;
            } 
            
            // Set the message first so the user sees it even if saving fails
            setMessage(response.message);
            // setDebugInfo(prev => ({ ...prev, lastAction: 'generate:gotMessage' }));
                
            // Process job and message saving separately
            // First attempt to save job if job title is provided
            let jobIdToSave: string | null = null;
            if (jobTitle.trim()) {
              console.log("DEBUG: Job title exists, attempting to save job");
              try {
                jobIdToSave = await saveJobToSupabase(pageInfo);
                console.log("DEBUG: Job ID saved:", jobIdToSave);
              } catch (jobErr) {
                console.error("DEBUG: Error saving job (continuing):", jobErr);
                // Continue even if job save fails
              }
            } else {
              console.log("DEBUG: No job title, skipping job save");
              // setDebugInfo(prev => ({ ...prev, lastAction: 'generate:noJobTitle' }));
            }

            // Then save message regardless of job save success
            if (selectedResume.id && response.message) {
              console.log("DEBUG: Saving message with job ID:", jobIdToSave);
              const saveSuccess = await saveMessageToSupabase(
                response.message, 
                pageInfo, 
                selectedResume.id, 
                jobIdToSave || undefined
              );
              
              if (!saveSuccess) {
                console.error("DEBUG: Failed to save message to Supabase");
                // Don't show error to user since we already have the message content displayed
              }
            } else {
              console.error("DEBUG: Missing required data to save message");
              // setDebugInfo(prev => ({ 
              //   ...prev, 
              //   error: "Missing resume/message data",
              //   lastAction: 'generate:missingData' 
              // }));
            }
            
            setGenerating(false);
            // setDebugInfo(prev => ({ ...prev, lastAction: 'generate:complete' }));
          });
        });
      });
    } catch (err) {
      console.error("DEBUG: Uncaught error in generate process:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate message');
      setGenerating(false);
      // setDebugInfo(prev => ({ 
      //   ...prev, 
      //   error: `Error: ${err instanceof Error ? err.message : String(err)}`,
      //   lastAction: 'generate:uncaughtError' 
      // }));
    }
  };

  // Function that will be injected into the page
  function scrapePageInfo() {
    // Try to determine if we're on LinkedIn
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    
    let name = '';
    let title = '';
    let company = '';
    let pageContent = '';
    
    if (isLinkedIn) {
      // LinkedIn specific selectors
      const nameElement = document.querySelector('.text-heading-xlarge');
      const titleElement = document.querySelector('.text-body-medium');
      const companyElements = document.querySelectorAll('span.text-body-small.inline.t-black--light.break-words');
      
      name = nameElement ? nameElement.textContent?.trim() || '' : '';
      title = titleElement ? titleElement.textContent?.trim() || '' : '';
      
      if (companyElements && companyElements.length > 0) {
        company = companyElements[0].textContent?.trim() || '';
      }
    }
    
    // Fallback to generic page info
    if (!name) name = document.title;
    pageContent = document.body.innerText.substring(0, 5000); // Limit text length
    
    return {
      url: window.location.href,
      title: document.title,
      name,
      jobTitle: title,
      company,
      pageContent
    };
  }

  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-700">Loading your data...</p>
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
            
            {/* Job details form */}
            <JobDetailsForm
              jobTitle={jobTitle}
              jobId={jobId}
              jobCompany={jobCompany}
              jobDescription={jobDescription}
              generating={generating}
              savedJobId={savedJobId}
              onJobTitleChange={setJobTitle}
              onJobIdChange={setJobId}
              onJobCompanyChange={setJobCompany}
              onJobDescriptionChange={setJobDescription}
            />
            
            {/* Template section */}
            {/* {currentUserId && (
              <TemplateSelector userId={currentUserId} />
            )} */}
            
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
          
          {/* Debug information box - commented out since fix is working */}
          {/* {message && (
            <div className="mb-3 text-xs border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 font-medium border-b border-gray-300 flex justify-between">
                <span>Debug Info</span>
                <span className={`px-1.5 py-0.5 rounded-full ${debugInfo.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {debugInfo.error ? 'Error' : 'OK'}
                </span>
              </div>
              <div className="p-2 bg-white">
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-gray-500">Job Save:</div>
                  <div className={debugInfo.jobSaveSuccess ? 'text-green-600' : (debugInfo.jobSaveAttempted ? 'text-red-600' : 'text-gray-500')}>
                    {debugInfo.jobSaveSuccess ? 'Success' : (debugInfo.jobSaveAttempted ? 'Failed' : 'Not attempted')}
                  </div>
                  
                  <div className="text-gray-500">Message Save:</div>
                  <div className={debugInfo.messageSaveSuccess ? 'text-green-600' : (debugInfo.messageSaveAttempted ? 'text-red-600' : 'text-gray-500')}>
                    {debugInfo.messageSaveSuccess ? 'Success' : (debugInfo.messageSaveAttempted ? 'Failed' : 'Not attempted')}
                  </div>
                  
                  <div className="text-gray-500">Job ID:</div>
                  <div className="font-mono">{debugInfo.jobId || 'none'}</div>
                  
                  <div className="text-gray-500">Last Action:</div>
                  <div className="font-mono">{debugInfo.lastAction}</div>
                </div>
                
                {debugInfo.error && (
                  <div className="mt-1 p-1.5 bg-red-50 border border-red-100 rounded text-red-700 whitespace-normal break-words">
                    {debugInfo.error}
                  </div>
                )}
              </div>
            </div>
          )} */}
          
          <GeneratedMessage
            message={message}
            savingMessage={savingMessage}
            savedMessage={savedMessage}
          />
          
          {error && message && (
            <div className="mt-2 text-xs text-red-600 p-2 bg-red-50 rounded">
              <p>{error}</p>
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

// Type for scraped page information
interface PageInfo {
  url: string;
  title: string;
  name: string; 
  jobTitle: string;
  company: string;
  pageContent: string;
}

export default Home; 