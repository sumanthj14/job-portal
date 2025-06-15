import { useState, useEffect } from 'react';
import { useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { parseResume } from '@/utils/resume-parser';
import useMultiStepApplication from '@/hooks/use-multi-step-application';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BarLoader } from "react-spinners";
import { Plus, Trash2, FileText, AlertCircle, X, Save, Check } from "lucide-react";
import { format } from 'date-fns';

// Schema for form validation - enhanced for multi-step form
const schema = z.object({
  // Personal Information
  firstName: z.string().min(1, { message: "First name is required" }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { message: "Last name is required" }),
  contactNumber: z.string().min(10, { message: "Valid contact number is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  linkedinUrl: z.string().url({ message: "Valid LinkedIn URL is required" }),
  githubUrl: z.string().url({ message: "Valid GitHub URL is required" }).optional(),
  portfolioUrl: z.string().url({ message: "Valid portfolio URL is required" }).optional(),
  address: z.string().optional(),
  
  // Education Information
  collegeName: z.string().optional(),
  degree: z.string().optional(),
  universityName: z.string().optional(),
  specialization: z.string().optional(),
  graduationYear: z.string().optional(),
  startYear: z.string().optional(),
  endYear: z.string().optional(),
  location: z.string().optional(),
  cgpa: z.string().optional(),
  educationLevel: z.enum(["Intermediate", "Graduate", "Post Graduate"], {
    message: "Education level is required",
  }),
  
  // Projects with enhanced structure
  projects: z.array(
    z.object({
      name: z.string().min(1, { message: "Project name is required" }),
      description: z.string().min(1, { message: "Project description is required" }),
      technologies: z.string().optional(),
      githubLink: z.string().url({ message: "Valid GitHub URL is required" }).optional(),
      liveLink: z.string().url({ message: "Valid live project URL is required" }).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      role: z.string().optional()
    })
  ).min(1, { message: "At least one project is required" }),
  
  // Work Experience with enhanced structure
  workExperiences: z.array(
    z.object({
      company: z.string().optional(),
      position: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      responsibilities: z.string().optional(),
      achievements: z.string().optional()
    })
  ).optional(),
  
  // Skills and Certifications
  certifications: z.string().min(1, { message: "Certifications are required" }),
  experience: z
    .number()
    .min(0, { message: "Experience must be at least 0" })
    .int(),
  skills: z.string().min(1, { message: "Skills are required" }),
  technicalSkills: z.string().optional(),
  softSkills: z.string().optional(),
  languages: z.string().optional(),
  
  // Resume Upload
  resume: z
    .any()
    .refine(
      (file) => {
        // Check if file exists and is an array with at least one item
        if (!file || !Array.isArray(file) || file.length === 0) {
          return false;
        }
        
        // Check file type
        return (
          file[0].type === "application/pdf" ||
          file[0].type === "application/msword" ||
          file[0].type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      },
      { message: "Only PDF or Word documents are allowed" }
    ),
});

// Default values for the form
const defaultValues = {
  // Personal Information
  firstName: "",
  middleName: "",
  lastName: "",
  contactNumber: "",
  email: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  address: "",
  
  // Education Information
  collegeName: "",
  degree: "",
  universityName: "",
  specialization: "",
  graduationYear: "",
  startYear: "",
  endYear: "",
  location: "",
  cgpa: "",
  
  // Projects
  projects: [{ 
    name: "", 
    description: "", 
    technologies: "", 
    githubLink: "", 
    liveLink: "", 
    startDate: "", 
    endDate: "", 
    role: "" 
  }],
  
  // Work Experience
  workExperiences: [{ 
    company: "", 
    position: "", 
    startDate: "", 
    endDate: "", 
    location: "", 
    description: "", 
    responsibilities: "", 
    achievements: "" 
  }],
  
  // Skills and Certifications
  certifications: "",
  experience: 0,
  skills: "",
  technicalSkills: "",
  softSkills: "",
  languages: "",
  educationLevel: undefined,
};

// Define form steps
const steps = [
  { 
    title: "Resume Upload", 
    description: "Upload your resume to auto-fill the form",
    fields: ["resume"]
  },
  { 
    title: "Personal Information", 
    description: "Your contact and personal details",
    fields: ["firstName", "lastName", "email", "contactNumber", "linkedinUrl", "githubUrl", "portfolioUrl", "address"]
  },
  { 
    title: "Education", 
    description: "Your educational background",
    fields: ["educationLevel", "collegeName", "universityName", "degree", "specialization", "graduationYear", "startYear", "endYear", "location", "cgpa"]
  },
  { 
    title: "Projects", 
    description: "Your project experience",
    fields: ["projects"]
  },
  { 
    title: "Work Experience", 
    description: "Your professional experience",
    fields: ["workExperiences"]
  },
  { 
    title: "Skills & Certifications", 
    description: "Your skills and certifications",
    fields: ["skills", "technicalSkills", "softSkills", "languages", "certifications", "experience"]
  },
  { 
    title: "Review & Submit", 
    description: "Review your application before submitting",
    fields: []
  }
];

export default function MultiStepApplicationForm({ user, job, onSuccess, onClose }) {
  // State for parsed resume data
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Use our custom hook for multi-step application
  const {
    currentStep,
    steps: formSteps,
    form,
    loading,
    error,
    draftId,
    lastSaved,
    autosaveEnabled,
    nextStep,
    prevStep,
    goToStep,
    handleSubmit,
    saveDraft,
    toggleAutosave,
    isFirstStep,
    isLastStep,
    currentStepData
  } = useMultiStepApplication({
    user,
    job,
    schema,
    defaultValues,
    steps,
    onSuccess,
    onError: (error) => {
      console.error("Application submission error:", error);
      alert(`Error submitting application: ${error.message}`);
    }
  });
  
  // Field arrays for dynamic fields
  const { fields: projectFields, append: appendProject, remove: removeProject } = 
    useFieldArray({ control: form.control, name: "projects" });
  
  const { fields: workFields, append: appendWork, remove: removeWork } = 
    useFieldArray({ control: form.control, name: "workExperiences" });

  // Watch for resume file changes
  const resumeValue = form.watch("resume");

  // Parse resume when file is uploaded
  useEffect(() => {
    if (resumeValue && resumeValue[0] && resumeValue[0] !== resumeFile) {
      handleResumeUpload(resumeValue[0]);
      setResumeFile(resumeValue[0]);
    }
  }, [resumeValue]);

  // Function to handle resume upload and parsing
  const handleResumeUpload = async (file) => {
    setIsParsing(true);
    setParseError(null);
    
    try {
      // Parse the resume using the utility function
      const parsedData = await parseResume(file);
      
      // Set form values with parsed data
      Object.entries(parsedData).forEach(([key, value]) => {
        if (key !== "projects" && key !== "workExperiences") {
          form.setValue(key, value);
        }
      });
      
      // Set projects
      form.setValue("projects", []);
      parsedData.projects.forEach((project, index) => {
        if (index === 0) {
          form.setValue("projects.0", project);
        } else {
          appendProject(project);
        }
      });
      
      // Set work experiences
      form.setValue("workExperiences", []);
      parsedData.workExperiences.forEach((work, index) => {
        if (index === 0) {
          form.setValue("workExperiences.0", work);
        } else {
          appendWork(work);
        }
      });
      
      // Move to the next step after successful parsing
      nextStep();
      
    } catch (error) {
      console.error("Error parsing resume:", error);
      setParseError("Failed to parse resume. Please fill in the details manually.");
    } finally {
      setIsParsing(false);
    }
  };
  
  // Handle manual save
  const handleManualSave = async () => {
    setSaveStatus("saving");
    try {
      await saveDraft();
      setSaveStatus("saved");
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (error) {
      setSaveStatus("error");
      console.error("Error saving draft:", error);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with step indicators */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Apply for {job?.title} at {job?.company?.name}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Step Indicators */}
        <div className="flex justify-between mb-4">
          {formSteps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
              style={{ width: `${100 / formSteps.length}%` }}
            >
              <button
                type="button"
                onClick={() => goToStep(index)}
                disabled={index > currentStep} // Can't skip ahead
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm font-medium
                  ${index < currentStep ? 'bg-blue-600 text-white' : 
                    index === currentStep ? 'border-2 border-blue-600 text-blue-600' : 
                    'border-2 border-gray-300 text-gray-400'}`}
              >
                {index + 1}
              </button>
              <span className="text-xs text-center hidden md:block">{step.title}</span>
            </div>
          ))}
        </div>
        
        {/* Current Step Title and Description */}
        <div className="text-center mb-4">
          <h3 className="font-medium text-lg">{currentStepData.title}</h3>
          <p className="text-sm text-gray-500">{currentStepData.description}</p>
        </div>
        
        {/* Draft status */}
        {draftId && (
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <div className="flex items-center">
              <span>
                {lastSaved ? (
                  <>Last saved: {format(new Date(lastSaved), 'MMM d, yyyy h:mm a')}</>
                ) : (
                  'Draft not saved yet'
                )}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                type="button" 
                onClick={toggleAutosave}
                className="flex items-center space-x-1 text-sm"
              >
                <span>{autosaveEnabled ? 'Autosave on' : 'Autosave off'}</span>
                <div className={`w-8 h-4 rounded-full ${autosaveEnabled ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
                  <div className={`absolute top-0.5 ${autosaveEnabled ? 'right-0.5' : 'left-0.5'} w-3 h-3 bg-white rounded-full transition-all`}></div>
                </div>
              </button>
              <button 
                type="button" 
                onClick={handleManualSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <BarLoader color="#3b82f6" width={20} height={2} />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Error saving</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        {/* Step content */}
        <div className="space-y-6 pb-6">
          {/* Step 1: Resume Upload */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  {...form.register("resume")}
                />
                <label
                  htmlFor="resume"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <FileText className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-lg font-medium mb-1">
                    {resumeFile ? resumeFile.name : "Upload your resume"}
                  </span>
                  <span className="text-sm text-gray-500 mb-4">
                    PDF, DOC, or DOCX (Max 10MB)
                  </span>
                  <Button type="button" variant="outline">
                    {resumeFile ? "Replace file" : "Select file"}
                  </Button>
                </label>
              </div>
              
              {isParsing && (
                <div className="flex flex-col items-center justify-center p-4">
                  <BarLoader color="#3b82f6" />
                  <span className="mt-2 text-sm text-gray-500">
                    Parsing resume...
                  </span>
                </div>
              )}
              
              {parseError && (
                <div className="flex items-center p-4 bg-red-50 text-red-600 rounded-md">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{parseError}</span>
                </div>
              )}
              
              {form.formState.errors.resume && (
                <div className="text-red-500 text-sm">
                  {form.formState.errors.resume.message}
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                <p className="mb-2">Uploading your resume will:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Auto-fill your personal information</li>
                  <li>Extract your education details</li>
                  <li>Populate your work experience</li>
                  <li>Identify your skills and projects</li>
                </ul>
                <p className="mt-2">You can edit any information after parsing.</p>
              </div>
            </div>
          )}
          
          {/* Step 2: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    className={form.formState.errors.firstName ? "border-red-500" : ""}
                  />
                  {form.formState.errors.firstName && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.firstName.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" {...form.register("middleName")} />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    className={form.formState.errors.lastName ? "border-red-500" : ""}
                  />
                  {form.formState.errors.lastName && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.lastName.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    className={form.formState.errors.email ? "border-red-500" : ""}
                  />
                  {form.formState.errors.email && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.email.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    {...form.register("contactNumber")}
                    className={form.formState.errors.contactNumber ? "border-red-500" : ""}
                  />
                  {form.formState.errors.contactNumber && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.contactNumber.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
                  <Input
                    id="linkedinUrl"
                    {...form.register("linkedinUrl")}
                    className={form.formState.errors.linkedinUrl ? "border-red-500" : ""}
                  />
                  {form.formState.errors.linkedinUrl && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.linkedinUrl.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    {...form.register("githubUrl")}
                    className={form.formState.errors.githubUrl ? "border-red-500" : ""}
                  />
                  {form.formState.errors.githubUrl && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.githubUrl.message}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input
                    id="portfolioUrl"
                    {...form.register("portfolioUrl")}
                    className={form.formState.errors.portfolioUrl ? "border-red-500" : ""}
                  />
                  {form.formState.errors.portfolioUrl && (
                    <div className="text-red-500 text-sm mt-1">
                      {form.formState.errors.portfolioUrl.message}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...form.register("address")} />
              </div>
            </div>
          )}
          
          {/* Step 3: Education */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Education Level *</Label>
                <RadioGroup
                  defaultValue={form.getValues("educationLevel")}
                  onValueChange={(value) => form.setValue("educationLevel", value)}
                  className="grid grid-cols-3 gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Intermediate" id="intermediate" />
                    <Label htmlFor="intermediate">Intermediate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Graduate" id="graduate" />
                    <Label htmlFor="graduate">Graduate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Post Graduate" id="postgraduate" />
                    <Label htmlFor="postgraduate">Post Graduate</Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.educationLevel && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.educationLevel.message}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="collegeName">College/School Name</Label>
                  <Input id="collegeName" {...form.register("collegeName")} />
                </div>
                
                <div>
                  <Label htmlFor="universityName">University Name</Label>
                  <Input id="universityName" {...form.register("universityName")} />
                </div>
                
                <div>
                  <Label htmlFor="degree">Degree</Label>
                  <Input id="degree" {...form.register("degree")} />
                </div>
                
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" {...form.register("specialization")} />
                </div>
                
                <div>
                  <Label htmlFor="startYear">Start Year</Label>
                  <Input id="startYear" {...form.register("startYear")} />
                </div>
                
                <div>
                  <Label htmlFor="endYear">End Year</Label>
                  <Input id="endYear" {...form.register("endYear")} />
                </div>
                
                <div>
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input id="graduationYear" {...form.register("graduationYear")} />
                </div>
                
                <div>
                  <Label htmlFor="cgpa">CGPA/Percentage</Label>
                  <Input id="cgpa" {...form.register("cgpa")} />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" {...form.register("location")} />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Projects */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {projectFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Project {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`projects.${index}.name`}>Project Name *</Label>
                      <Input
                        id={`projects.${index}.name`}
                        {...form.register(`projects.${index}.name`)}
                        className={form.formState.errors.projects?.[index]?.name ? "border-red-500" : ""}
                      />
                      {form.formState.errors.projects?.[index]?.name && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.projects[index].name.message}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.technologies`}>Technologies Used</Label>
                      <Input
                        id={`projects.${index}.technologies`}
                        {...form.register(`projects.${index}.technologies`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.githubLink`}>GitHub Link</Label>
                      <Input
                        id={`projects.${index}.githubLink`}
                        {...form.register(`projects.${index}.githubLink`)}
                        className={form.formState.errors.projects?.[index]?.githubLink ? "border-red-500" : ""}
                      />
                      {form.formState.errors.projects?.[index]?.githubLink && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.projects[index].githubLink.message}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.liveLink`}>Live Link</Label>
                      <Input
                        id={`projects.${index}.liveLink`}
                        {...form.register(`projects.${index}.liveLink`)}
                        className={form.formState.errors.projects?.[index]?.liveLink ? "border-red-500" : ""}
                      />
                      {form.formState.errors.projects?.[index]?.liveLink && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.projects[index].liveLink.message}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.startDate`}>Start Date</Label>
                      <Input
                        id={`projects.${index}.startDate`}
                        {...form.register(`projects.${index}.startDate`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.endDate`}>End Date</Label>
                      <Input
                        id={`projects.${index}.endDate`}
                        {...form.register(`projects.${index}.endDate`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`projects.${index}.role`}>Your Role</Label>
                      <Input
                        id={`projects.${index}.role`}
                        {...form.register(`projects.${index}.role`)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`projects.${index}.description`}>Description *</Label>
                    <Textarea
                      id={`projects.${index}.description`}
                      {...form.register(`projects.${index}.description`)}
                      className={form.formState.errors.projects?.[index]?.description ? "border-red-500" : ""}
                    />
                    {form.formState.errors.projects?.[index]?.description && (
                      <div className="text-red-500 text-sm mt-1">
                        {form.formState.errors.projects[index].description.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => appendProject({
                  name: "",
                  description: "",
                  technologies: "",
                  githubLink: "",
                  liveLink: "",
                  startDate: "",
                  endDate: "",
                  role: ""
                })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Project
              </Button>
              
              {form.formState.errors.projects && !Array.isArray(form.formState.errors.projects) && (
                <div className="text-red-500 text-sm">
                  {form.formState.errors.projects.message}
                </div>
              )}
            </div>
          )}
          
          {/* Step 5: Work Experience */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {workFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Work Experience {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWork(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`workExperiences.${index}.company`}>Company</Label>
                      <Input
                        id={`workExperiences.${index}.company`}
                        {...form.register(`workExperiences.${index}.company`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`workExperiences.${index}.position`}>Position</Label>
                      <Input
                        id={`workExperiences.${index}.position`}
                        {...form.register(`workExperiences.${index}.position`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`workExperiences.${index}.startDate`}>Start Date</Label>
                      <Input
                        id={`workExperiences.${index}.startDate`}
                        {...form.register(`workExperiences.${index}.startDate`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`workExperiences.${index}.endDate`}>End Date</Label>
                      <Input
                        id={`workExperiences.${index}.endDate`}
                        {...form.register(`workExperiences.${index}.endDate`)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`workExperiences.${index}.location`}>Location</Label>
                      <Input
                        id={`workExperiences.${index}.location`}
                        {...form.register(`workExperiences.${index}.location`)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`workExperiences.${index}.description`}>Description</Label>
                    <Textarea
                      id={`workExperiences.${index}.description`}
                      {...form.register(`workExperiences.${index}.description`)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`workExperiences.${index}.responsibilities`}>Responsibilities</Label>
                    <Textarea
                      id={`workExperiences.${index}.responsibilities`}
                      {...form.register(`workExperiences.${index}.responsibilities`)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`workExperiences.${index}.achievements`}>Achievements</Label>
                    <Textarea
                      id={`workExperiences.${index}.achievements`}
                      {...form.register(`workExperiences.${index}.achievements`)}
                    />
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => appendWork({
                  company: "",
                  position: "",
                  startDate: "",
                  endDate: "",
                  location: "",
                  description: "",
                  responsibilities: "",
                  achievements: ""
                })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Work Experience
              </Button>
            </div>
          )}
          
          {/* Step 6: Skills & Certifications */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="skills">Skills *</Label>
                <Textarea
                  id="skills"
                  {...form.register("skills")}
                  placeholder="List your primary skills separated by commas"
                  className={form.formState.errors.skills ? "border-red-500" : ""}
                />
                {form.formState.errors.skills && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.skills.message}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technicalSkills">Technical Skills</Label>
                  <Textarea
                    id="technicalSkills"
                    {...form.register("technicalSkills")}
                    placeholder="Programming languages, frameworks, tools, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="softSkills">Soft Skills</Label>
                  <Textarea
                    id="softSkills"
                    {...form.register("softSkills")}
                    placeholder="Communication, leadership, teamwork, etc."
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="languages">Languages</Label>
                <Textarea
                  id="languages"
                  {...form.register("languages")}
                  placeholder="Languages you know (e.g., English, Spanish, etc.)"
                />
              </div>
              
              <div>
                <Label htmlFor="certifications">Certifications *</Label>
                <Textarea
                  id="certifications"
                  {...form.register("certifications")}
                  placeholder="List your certifications"
                  className={form.formState.errors.certifications ? "border-red-500" : ""}
                />
                {form.formState.errors.certifications && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.certifications.message}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="experience">Years of Experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  {...form.register("experience", { valueAsNumber: true })}
                  className={form.formState.errors.experience ? "border-red-500" : ""}
                />
                {form.formState.errors.experience && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.experience.message}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 7: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Application Summary</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Please review your application details before submitting.
                </p>
                
                <div className="space-y-4">
                  {/* Personal Information Summary */}
                  <div className="border-b pb-2">
                    <h5 className="font-medium">Personal Information</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>{" "}
                        {form.getValues("firstName")} {form.getValues("middleName")} {form.getValues("lastName")}
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span> {form.getValues("email")}
                      </div>
                      <div>
                        <span className="text-gray-500">Contact:</span> {form.getValues("contactNumber")}
                      </div>
                      <div>
                        <span className="text-gray-500">LinkedIn:</span> {form.getValues("linkedinUrl")}
                      </div>
                    </div>
                  </div>
                  
                  {/* Education Summary */}
                  <div className="border-b pb-2">
                    <h5 className="font-medium">Education</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Level:</span> {form.getValues("educationLevel")}
                      </div>
                      <div>
                        <span className="text-gray-500">Degree:</span> {form.getValues("degree")}
                      </div>
                      <div>
                        <span className="text-gray-500">University:</span> {form.getValues("universityName")}
                      </div>
                      <div>
                        <span className="text-gray-500">Graduation:</span> {form.getValues("graduationYear")}
                      </div>
                    </div>
                  </div>
                  
                  {/* Projects Summary */}
                  <div className="border-b pb-2">
                    <h5 className="font-medium">Projects ({form.getValues("projects")?.length || 0})</h5>
                    <div className="mt-2 text-sm">
                      {form.getValues("projects")?.map((project, index) => (
                        <div key={index} className="mb-2">
                          <div className="font-medium">{project.name}</div>
                          <div className="text-gray-500">{project.technologies}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Work Experience Summary */}
                  <div className="border-b pb-2">
                    <h5 className="font-medium">Work Experience ({form.getValues("workExperiences")?.length || 0})</h5>
                    <div className="mt-2 text-sm">
                      {form.getValues("workExperiences")?.map((work, index) => (
                        <div key={index} className="mb-2">
                          <div className="font-medium">{work.position} at {work.company}</div>
                          <div className="text-gray-500">{work.startDate} - {work.endDate}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Skills Summary */}
                  <div>
                    <h5 className="font-medium">Skills & Experience</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Experience:</span> {form.getValues("experience")} years
                      </div>
                      <div>
                        <span className="text-gray-500">Skills:</span> {form.getValues("skills")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="confirmAccuracy"
                    className="mt-1"
                    {...form.register("confirmAccuracy")}
                  />
                  <Label htmlFor="confirmAccuracy" className="text-sm">
                    I confirm that all the information provided in this application is accurate and complete.
                    I understand that providing false information may result in the rejection of my application.
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep}
          >
            Previous
          </Button>
          
          {isLastStep ? (
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <BarLoader color="#ffffff" width={20} height={2} />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={nextStep}
              disabled={loading}
            >
              {loading ? (
                <>
                  <BarLoader color="#ffffff" width={20} height={2} />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                "Next"
              )}
            </Button>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error.message || "An error occurred. Please try again."}</span>
          </div>
        )}
      </form>
    </div>
  );
}