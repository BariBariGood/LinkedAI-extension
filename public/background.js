// Background script for the LinkedAI extension
// Handles the Gemini API calls for generating cold messages

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const SUPABASE_URL = "https://okeurgyhsrgcidiqubbe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXVyZ3loc3JnY2lkaXF1YmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMzMTEzNzgsImV4cCI6MjAyODg4NzM3OH0.Hg3FY4ImTEJ_tKQEpYNM_PkxFfBE9wsfTU4oCswKhM0";

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateMessage") {
    console.log("Background received message:", message);
    
    generatePersonalizedMessage(message.pageInfo, message.resumeData, message.jobData)
      .then(result => {
        console.log("Generated message:", result);
        sendResponse({ message: result });
      })
      .catch(error => {
        console.error("Error generating message:", error);
        sendResponse({ error: error.message || "Failed to generate message" });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Simplified function to get prompt template
async function getPromptTemplate(userId) {
  try {
    console.log("Attempting to fetch template for user ID:", userId);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/prompt_templates?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch templates:', response.status);
      return null;
    }
    
    const templates = await response.json();
    console.log('All fetched templates:', templates);
    
    // Just return the first template found
    if (templates && templates.length > 0) {
      const template = templates[0];
      console.log("Using template:", template);
      return template;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

async function generatePersonalizedMessage(pageInfo, resumeData, jobData) {
  try {
    console.log("Processing resume data:", resumeData);
    console.log("Processing job data:", jobData);
    
    // Get API key from local storage
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please add it in the extension options.");
    }

    // Get prompt template - simplified to fetch any template
    const promptTemplate = await getPromptTemplate();
    console.log("Fetched template:", promptTemplate);

    const prompt = buildPrompt(pageInfo, resumeData, jobData, promptTemplate);
    console.log("Sending prompt to Gemini:", prompt);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response generated");
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    return generatedText.trim();
  } catch (error) {
    console.error("Error in generatePersonalizedMessage:", error);
    throw error;
  }
}

function buildPrompt(pageInfo, resumeData, jobData, promptTemplate) {
  console.log("Building prompt with template:", promptTemplate);
  
  // Build job specific context section
  let jobContext = '';
  if (jobData && (jobData.jobTitle || jobData.jobDescription)) {
    jobContext = `
JOB DETAILS:
${jobData.jobTitle ? `- Title: ${jobData.jobTitle}` : ''}
${jobData.jobId ? `- Job ID: ${jobData.jobId}` : ''}
${jobData.jobDescription ? `- Description: ${jobData.jobDescription}` : ''}
`;
  }
  
  // SIMPLIFIED TEMPLATE HANDLING
  // Just extract the content directly
  let templateContent = 'No template specified';
  let templateName = 'Default';
  
  if (promptTemplate && promptTemplate.content) {
    templateContent = promptTemplate.content;
    templateName = promptTemplate.name || 'Custom Template';
    console.log(`Using template "${templateName}": ${templateContent}`);
  }
  
  return `
You are an AI assistant helping a job seeker create a personalized cold message to a recruiter or hiring manager. 
Please craft a message based on the information below.

ABOUT THE RECIPIENT:
- Name: ${pageInfo.name || "Hiring Manager"}
- Title: ${pageInfo.jobTitle || ""}
- Company: ${pageInfo.company || ""}
- Page URL: ${pageInfo.url || ""}
${jobContext}
ABOUT THE SENDER (Full Resume):
${resumeData.rawText || ""}

ADDITIONAL CONTEXT FROM THE PAGE:
${pageInfo.pageContent?.substring(0, 500) || ""}

USER TEMPLATE (${templateName}):
${templateContent}

IMPORTANT INSTRUCTIONS:
- EXACTLY follow the user's template requirement above. 
- If the template is "WRITE IN ALL CAPS", then make the ENTIRE message in ALL CAPS.
- If the template specifies any formatting, structure, or style, strictly adhere to it.
- The message should highlight relevant skills and experiences from the sender's resume.
- Include a specific observation about the recipient or company.
- If job details are provided, show how the sender's experience aligns with those requirements.
- End with a clear call to action.
- Do not include salutations (like "Dear X") or closings (like "Sincerely").
- Focus on providing value rather than asking for a job.

Format the message as plain text, ready to be copied directly to LinkedIn.
`;
}

async function getApiKey() {
  // For demo purposes, use a fixed API key
  return "AIzaSyBIhVMhMbjY6TAaKB2fnOPJGq-1TLW8glk"; // Gemini API key
} 