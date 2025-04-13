import { useState } from 'react';

interface JobDetailsProps {
  jobTitle: string;
  jobId: string;
  jobCompany: string;
  jobDescription: string;
  generating: boolean;
  savedJobId: string | null;
  onJobTitleChange: (value: string) => void;
  onJobIdChange: (value: string) => void;
  onJobCompanyChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
}

const JobDetailsForm = ({
  jobTitle,
  jobId,
  jobCompany,
  jobDescription,
  generating,
  savedJobId,
  onJobTitleChange,
  onJobIdChange,
  onJobCompanyChange,
  onJobDescriptionChange
}: JobDetailsProps) => {
  const [showJobDetails, setShowJobDetails] = useState(false);

  return (
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
              onChange={(e) => onJobTitleChange(e.target.value)}
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
              onChange={(e) => onJobIdChange(e.target.value)}
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
              onChange={(e) => onJobCompanyChange(e.target.value)}
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
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              placeholder="Paste key requirements or qualifications from the job posting"
              className="w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              disabled={generating}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetailsForm; 