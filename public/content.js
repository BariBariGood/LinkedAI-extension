// Content script for LinkedAI extension
// This script runs in the context of web pages

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapePageInfo") {
    const pageInfo = scrapePageInfo();
    sendResponse(pageInfo);
    return true;
  }
});

// Function to extract relevant information from the current page
function scrapePageInfo() {
  // Try to determine if we're on LinkedIn
  const isLinkedIn = window.location.hostname.includes('linkedin.com');
  
  let name = '';
  let title = '';
  let company = '';
  let pageContent = '';
  
  if (isLinkedIn) {
    console.log("Scraping LinkedIn page");
    
    // IMPORTANT: Use document.title as a source for name - LinkedIn profile pages have titles in format "Name - Title | LinkedIn"
    if (document.title.includes(" | LinkedIn")) {
      const titleParts = document.title.split(" | ")[0].split(" - ");
      if (titleParts.length > 0) {
        name = titleParts[0].trim();
        console.log("Extracted name from page title:", name);
      }
    }
    
    // Backup approach: try all h1 elements and log them for debugging
    const h1Elements = document.querySelectorAll('h1');
    console.log("Found h1 elements count:", h1Elements.length);
    
    h1Elements.forEach((el, index) => {
      console.log(`h1 element ${index} text:`, el.textContent);
    });
    
    // If name is still empty, try first h1
    if (!name && h1Elements.length > 0) {
      name = h1Elements[0].textContent.trim();
      console.log("Using first h1 element for name:", name);
    }

    // Another approach - try targeting the specific h1 with our known class
    try {
      const specificH1 = document.querySelector('h1.jJxMUbWmmPNtWNnOIzbDKsZYpsWnMWaVc');
      if (specificH1) {
        name = specificH1.textContent.trim();
        console.log("Found name with specific class selector:", name);
      }
    } catch (err) {
      console.error("Error with specific selector:", err);
    }
    
    // Title selectors - add the specific class from the screenshot
    const titleSelectors = [
      '.text-body-medium',
      '.pv-top-card-section__headline',
      '.text-body-medium.break-words',
      '.pv-entity__headline',
      'div.text-body-medium.break-words' // New specific selector from screenshot
    ];
    
    // Direct title extraction for latest LinkedIn UI
    try {
      const specificTitleElement = document.querySelector('div.text-body-medium.break-words');
      if (specificTitleElement) {
        title = specificTitleElement.textContent.trim();
        console.log("Found title with specific class selector:", title);
      }
    } catch (err) {
      console.error("Error with specific title selector:", err);
    }
    
    // Company selectors - add the specific class from the screenshot
    const companySelectors = [
      'span.text-body-small.inline.t-black--light.break-words',
      '.pv-entity__secondary-title',
      '.pv-top-card-v2-section__company-name',
      '.pv-top-card-section__company',
      'div.cATDpmhgeyWwvPUluZahylNSvVoQyazAvQ',
      'div.cATDpmhgeyWwvPUluZahyINSvVoQyazAvQ.inline-show-more-text--is-collapsed.inline-show-more-text--is-collapsed-with-line-clamp'
    ];
    
    // Direct company extraction for latest LinkedIn UI - use exact class
    try {
      // Try the exact class provided
      const exactCompanyElement = document.querySelector('div.cATDpmhgeyWwvPUluZahylNSvVoQyazAvQ');
      if (exactCompanyElement) {
        company = exactCompanyElement.textContent.trim();
        console.log("Found company with exact class:", company);
      }
      
      // Fallback to similar class if not found
      if (!company) {
        const similarCompanyElement = document.querySelector('div.cATDpmhgeyWwvPUluZahyINSvVoQyazAvQ');
        if (similarCompanyElement) {
          company = similarCompanyElement.textContent.trim();
          console.log("Found company with similar class:", company);
        }
      }
      
      // Another approach - try to find any element with part of this class
      if (!company) {
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.className && div.className.includes('cATDpmhgey')) {
            company = div.textContent.trim();
            console.log("Found company with partial class match:", company);
            break;
          }
        }
      }
    } catch (err) {
      console.error("Error with company selector:", err);
    }
    
    // Try all selector options if we still don't have a company
    if (!company) {
      for (const selector of companySelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          company = elements[0].textContent.trim();
          console.log("Found company with fallback selector:", company);
          break;
        }
      }
    }
    
    // Only use the selector-based approach as fallback
    if (!title) {
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          title = element.textContent.trim();
          console.log("Found title with fallback selector:", title);
          break;
        }
      }
    }
    
    // Get experience section
    const experienceSection = document.getElementById('experience-section') || 
                             document.querySelector('.experience-section') ||
                             document.querySelector('section[id*="experience"]');
    
    if (experienceSection) {
      pageContent += experienceSection.innerText + "\n\n";
    }
    
    // Get about section
    const aboutSection = document.getElementById('about-section') ||
                       document.querySelector('.about-section') ||
                       document.querySelector('section[id*="about"]');
    
    if (aboutSection) {
      pageContent += aboutSection.innerText + "\n\n";
    }
  }
  
  // Ensure name is properly set
  if (!name) {
    name = "Unknown from content.js";
    console.log("Could not find a name on the page, using fallback.");
  }

  // Log final result before returning
  const result = {
    url: window.location.href,
    title: document.title,
    name: name,
    jobTitle: title,
    company,
    pageContent
  };
  
  console.log("FINAL scraped page info:", result);
  return result;
}

// Initially scrape the page and store data for quick access
const initialPageInfo = scrapePageInfo();
console.log('LinkedAI content script loaded', initialPageInfo); 