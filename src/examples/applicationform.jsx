import React, { useState } from 'react';
import { useApplicationHandler } from '../hooks/use-application-handler';

const ApplicationForm = ({ jobId }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    resume: null
  });

  const {
    submitApplication,
    loading,
    error,
    success,
    applicationResult,
    resetState
  } = useApplicationHandler();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, resume: e.target.files }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Example of parsed resume data that could be included
      const parsedResumeData = {
        skills: ['JavaScript', 'React', 'Node.js'],
        education: 'Bachelor of Science in Computer Science',
        experience: 'Software Engineer at XYZ Corp for 3 years'
      };
      
      // Submit the application using our custom hook
      await submitApplication(formData, jobId, parsedResumeData);
      
      // Reset form on success if needed
      if (success) {
        setFormData({
          name: '',
          email: '',
          phone: '',
          resume: null
        });
      }
    } catch (err) {
      // Error is already handled by the hook
      console.log('Form submission error handled by hook');
    }
  };

  return (
    <div className="application-form">
      <h2>Apply for this Job</h2>
      
      {success && (
        <div className="success-message">
          Your application has been submitted successfully!
          {applicationResult && (
            <p>Application ID: {applicationResult.id}</p>
          )}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="resume">Resume (PDF or Word)</label>
          <input
            type="file"
            id="resume"
            name="resume"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
        
        {success && (
          <button 
            type="button" 
            onClick={resetState}
            className="reset-button"
          >
            Apply Again
          </button>
        )}
      </form>
    </div>
  );
};

export default ApplicationForm;