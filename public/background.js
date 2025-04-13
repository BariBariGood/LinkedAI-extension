// Background script for the LinkedAI extension
// Handles the Gemini API calls for generating cold messages

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const SUPABASE_URL = "https://okeurgyhsrgcidiqubbe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXVyZ3loc3JnY2lkaXF1YmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMzMTEzNzgsImV4cCI6MjAyODg4NzM3OH0.Hg3FY4ImTEJ_tKQEpYNM_PkxFfBE9wsfTU4oCswKhM0";

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateMessage") {
    console.log("Generating message with pageInfo:", request.pageInfo);
    console.log("IMPORTANT - Recipient Name from pageInfo:", request.pageInfo.name);
    
    // Ensure we have a name before proceeding
    if (!request.pageInfo.name || request.pageInfo.name === "Unknown from content.js") {
      console.error("Missing recipient name - attempting to extract from title");
      
      // Try to get name from title as fallback
      if (request.pageInfo.title && request.pageInfo.title.includes(" | LinkedIn")) {
        const titleParts = request.pageInfo.title.split(" | ")[0].split(" - ");
        if (titleParts.length > 0) {
          request.pageInfo.name = titleParts[0].trim();
          console.log("Extracted name from page title as fallback:", request.pageInfo.name);
        }
      }
    }
    
    generatePersonalizedMessage(request.pageInfo, request.resumeData, request.jobData)
      .then(result => {
        console.log("Message generated successfully");
        sendResponse({ message: result });
      })
      .catch(error => {
        console.error("Error generating message:", error);
        sendResponse({ error: error.message });
      });
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
  console.log("Building prompt with recipient name:", pageInfo.name);
  
  // Ensure we have a name for the recipient
  const recipientName = pageInfo.name && pageInfo.name !== "Unknown from content.js" 
    ? pageInfo.name 
    : "Hiring Manager";
  
  // Ensure we have a company name
  const companyName = pageInfo.company || jobData?.jobCompany || "your company";
  
  console.log("Final recipient name used in prompt:", recipientName);
  console.log("Company name used in prompt:", companyName);
  
  // Use the template if available, otherwise use default
  const templateName = promptTemplate?.name || "Default Template";
  const templateContent = promptTemplate?.content || "Hi [Name],\n\nI noticed your profile and I'm interested in connecting to discuss potential opportunities at [Company]. I have experience in [relevant skills] which aligns well with your organization's needs.\n\nWould you be open to a brief conversation?\n\nBest regards,\n[Your Name]";
  
  // Create job context if job data is available
  let jobContext = "";
  if (jobData && (jobData.jobTitle || jobData.jobDescription)) {
    jobContext = `
JOB DETAILS:
- Title: ${jobData.jobTitle || ""}
- ID: ${jobData.jobId || ""}
- Company: ${jobData.jobCompany || pageInfo.company || ""}
- Description: ${jobData.jobDescription || ""}
`;
  }
  
  return `Generate a personalized message for a LinkedIn connection request or cold outreach. The message should be professional, concise, and highlight the sender's relevant experience.

ABOUT THE RECIPIENT:
- Name: ${recipientName}
- Title: ${pageInfo.jobTitle || ""}
- Company: ${companyName}
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
- If the template specifies any formatting, structure, or style, strictly adhere to it.
- The message should highlight relevant skills and experiences from the sender's resume.
- ALWAYS mention the company name (${companyName}) in the message and include specific context about the company.
- Reference something specific about the company that demonstrates your research or interest.
- If job details are provided, show how the sender's experience aligns with those requirements.
- Always personalize the message with the recipient's name (${recipientName}) where appropriate.
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