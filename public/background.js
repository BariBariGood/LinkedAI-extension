// Background script for the LinkedAI extension
// Handles the Gemini API calls for generating cold messages

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GEMINI_API_KEY = "AIzaSyBIhVMhMbjY6TAaKB2fnOPJGq-1TLW8glk"; // Hardcoded API key
const SUPABASE_URL = "https://okeurgyhsrgcidiqubbe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXVyZ3loc3JnY2lkaXF1YmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMzMTEzNzgsImV4cCI6MjAyODg4NzM3OH0.Hg3FY4ImTEJ_tKQEpYNM_PkxFfBE9wsfTU4oCswKhM0";

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateMessage") {
    console.log("Background received message:", message);
    console.log("Page Info:", message.pageInfo);
    console.log("Resume Data:", message.resumeData);
    console.log("Company from pageInfo:", message.pageInfo.company);
    
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

// Exactly matching the TemplateSelector component implementation
async function getPromptTemplate(userId) {
  try {
    if (!userId) {
      console.warn("No user ID provided for template fetch");
      return null;
    }

    console.log("Fetching templates for user ID:", userId);
    
    const { data, error } = await fetch(
      `${SUPABASE_URL}/rest/v1/prompt_templates?select=*&user_id=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    ).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      return response.json().then(data => ({ data }));
    }).catch(error => ({ error }));
    
    if (error) {
      console.error('Error fetching templates:', error);
      return null;
    }
    
    console.log("User templates:", data);
    
    if (data && data.length > 0) {
      // Try to find default template first
      const defaultTemplate = data.find(t => t.is_default);
      const selectedTemplate = defaultTemplate || data[0];
      
      console.log("Using template:", selectedTemplate);
      return selectedTemplate;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getPromptTemplate:', error);
    return null;
  }
}

async function generatePersonalizedMessage(pageInfo, resumeData, jobData) {
  try {
    console.log("Processing resume data:", resumeData);
    console.log("Processing job data:", jobData);
    console.log("Processing company data:", pageInfo.company);
    
    // Use the hardcoded API key
    const apiKey = GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please add it in the extension options.");
    }

    // Get userId from resumeData if available
    const userId = resumeData.userId || null;
    console.log("Using user ID for template:", userId);

    // Get prompt template with the user ID
    const promptTemplate = await getPromptTemplate(userId);
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
  console.log("Building prompt with company name:", pageInfo.company);
  
  // Ensure we have a name for the recipient
  const recipientName = pageInfo.name || "Hiring Manager";
  
  // Ensure we have a company name
  const companyName = pageInfo.company || jobData?.jobCompany || "your company";
  
  console.log("Final recipient name used in prompt:", recipientName);
  console.log("Final company name used in prompt:", companyName);
  
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