// Background script for the LinkedAI extension
// Handles the Gemini API calls for generating cold messages

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateMessage") {
    console.log("Background received message:", message);
    
    generatePersonalizedMessage(message.pageInfo, message.resumeData)
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

async function generatePersonalizedMessage(pageInfo, resumeData) {
  try {
    console.log("Processing resume data:", resumeData);
    
    // Get API key from local storage
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please add it in the extension options.");
    }

    const prompt = buildPrompt(pageInfo, resumeData);
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

function buildPrompt(pageInfo, resumeData) {
  console.log("Building prompt with resume data:", resumeData);
  
  return `
You are an AI assistant helping a job seeker create a personalized cold message to a recruiter or hiring manager. 
Please craft a concise, professional, and engaging message based on the following information.

ABOUT THE RECIPIENT:
- Name: ${pageInfo.name || "Hiring Manager"}
- Title: ${pageInfo.jobTitle || ""}
- Company: ${pageInfo.company || ""}
- Page URL: ${pageInfo.url || ""}

ABOUT THE SENDER (Full Resume):
${resumeData.rawText || ""}

ADDITIONAL CONTEXT FROM THE PAGE:
${pageInfo.pageContent?.substring(0, 500) || ""}

INSTRUCTIONS:
1. Write a personalized cold message addressed to the recipient.
2. The message should be concise (about 150-200 words).
3. Highlight the most relevant skills, projects, and experiences from the resume that would interest this specific company/role.
4. Include a specific observation about the recipient or company to show research.
5. End with a call to action for a meeting or conversation.
6. Be professional but friendly.
7. Do not include any salutation at the beginning (like "Dear X") or closing (like "Sincerely").
8. Focus on providing value rather than asking for a job.

Format the message as plain text, ready to be copied directly to LinkedIn, email, or messaging app.
`;
}

async function getApiKey() {
  // For demo purposes, use a fixed API key
  // In a production extension, this should be stored securely
  return "AIzaSyBIhVMhMbjY6TAaKB2fnOPJGq-1TLW8glk"; // Gemini API key
} 