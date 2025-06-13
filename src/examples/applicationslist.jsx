import React from 'react';
import { useUserApplications } from '../hooks/use-user-applications';

const ApplicationStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status}
    </span>
  );
};

const ApplicationsList = () => {
  const {
    applications,
    loading,
    error,
    refreshApplications
  } = useUserApplications();

  if (loading) {
    return <div className="loading">Loading your applications...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={refreshApplications} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return <div className="no-applications">You haven't applied to any jobs yet.</div>;
  }

  return (
    <div className="applications-list">
      <div className="list-header">
        <h2>Your Applications</h2>
        <button onClick={refreshApplications} className="refresh-button">
          Refresh
        </button>
      </div>

      <div className="applications-grid">
        {applications.map((application) => (
          <div key={application.id} className="application-card">
            <div className="card-header">
              <h3>{application.job?.title || 'Job Title'}</h3>
              <ApplicationStatus status={application.status || 'Pending'} />
            </div>
            
            <div className="company-info">
              <span>{application.job?.company?.name || 'Company'}</span>
            </div>
            
            <div className="application-details">
              <p><strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
              
              {application.resume_url && (
                <a 
                  href={application.resume_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="resume-link"
                >
                  View Resume
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationsList;