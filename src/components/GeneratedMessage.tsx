interface GeneratedMessageProps {
  message: string | null;
  savingMessage: boolean;
  savedMessage: boolean;
}

const GeneratedMessage = ({ 
  message, 
  savingMessage, 
  savedMessage 
}: GeneratedMessageProps) => {
  if (!message) return null;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
  };
  
  return (
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
            onClick={copyToClipboard}
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
  );
};

export default GeneratedMessage; 