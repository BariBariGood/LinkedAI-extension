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
    
    // Try different LinkedIn selectors - they change their classes frequently
    
    // Name selectors
    const nameSelectors = [
      '.text-heading-xlarge', 
      '.pv-top-card-section__name',
      'h1.text-heading-xlarge',
      'h1.inline.t-24.t-black.t-normal.break-words',
      '.profile-topcard-person-entity__name'
    ];
    
    // Title selectors
    const titleSelectors = [
      '.text-body-medium',
      '.pv-top-card-section__headline',
      '.text-body-medium.break-words',
      '.pv-entity__headline'
    ];
    
    // Company selectors
    const companySelectors = [
      'span.text-body-small.inline.t-black--light.break-words',
      '.pv-entity__secondary-title',
      '.pv-top-card-v2-section__company-name',
      '.pv-top-card-section__company'
    ];
    
    // Try each selector until we find one that works
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        name = element.textContent.trim();
        console.log("Found name:", name);
        break;
      }
    }
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        title = element.textContent.trim();
        console.log("Found title:", title);
        break;
      }
    }
    
    for (const selector of companySelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        company = elements[0].textContent.trim();
        console.log("Found company:", company);
        break;
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
  
  // Fallback to generic page info
  if (!name) name = document.title;
  if (!pageContent) pageContent = document.body.innerText.substring(0, 5000); // Limit text length
  
  const result = {
    url: window.location.href,
    title: document.title,
    name,
    jobTitle: title,
    company,
    pageContent
  };
  
  console.log("Scraped page info:", result);
  return result;
}

// Initially scrape the page and store data for quick access
const initialPageInfo = scrapePageInfo();
console.log('LinkedAI content script loaded', initialPageInfo); 