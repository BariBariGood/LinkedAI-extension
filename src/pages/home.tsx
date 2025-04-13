import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

  const generateColdMessage = async () => {
    if (!selectedResume) {
      setError("Please select a resume first");
      return;
    }
    
    setGenerating(true);
    setError(null);
    setMessage(null);
    
    try {
      // Get current tab information
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]?.id) {
          throw new Error("Could not find active tab");
        }
        
        // Debug log to console
        console.log("Resume data being sent:", selectedResume.parsed_data);
        
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
          
          // Send to background script to call Gemini API
          chrome.runtime.sendMessage({
            action: "generateMessage",
            pageInfo: pageInfo,
            resumeData: selectedResume.parsed_data
          }, (response) => {
            console.log("Response from Gemini:", response);
            if (response.error) {
              setError(response.error);
            } else {
              setMessage(response.message);
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
        <div className="p-4">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-700 mb-2">Generate a personalized cold message for the recruiter based on the current page and your resume.</p>
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
              <div className="p-3 overflow-y-auto" style={{ maxHeight: "230px" }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>
          )}
          
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