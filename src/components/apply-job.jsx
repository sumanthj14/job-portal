/* eslint-disable react/prop-types */
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useFetch from "@/hooks/use-fetch";
import { applyToJob } from "@/api/apiApplication";
import { BarLoader } from "react-spinners";
import { useState, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2, FileText, AlertCircle, X } from "lucide-react";
import { parseResume } from "@/utils/resume-parser";

// Schema for form validation - enhanced for Overleaf templates
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
  
  // Projects with enhanced structure for Overleaf templates
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
  
  // Work Experience with enhanced structure for Overleaf templates
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
  
  // Skills and Certifications - enhanced for Overleaf templates
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
      { message: "Resume is required. Only PDF or Word documents are allowed" }
    ),
});

function ApplyJobDrawer({ user, job, fetchJob, applied = false }) {
  // Check if the job is open for applications
  const isJobOpen = job?.isopen === true;
  
  // State for parsed resume data
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  
   // State for multi-step form
  const [currentStep, setCurrentStep] = useState(0);
  
  // Define form steps
  const steps = [
    { title: "Resume Upload", description: "Upload your resume to auto-fill the form" },
    { title: "Personal Information", description: "Your contact and personal details" },
    { title: "Education", description: "Your educational background" },
    { title: "Projects", description: "Your project experience" },
    { title: "Work Experience", description: "Your professional experience" },
    { title: "Skills & Certifications", description: "Your skills and certifications" },
    { title: "Review & Submit", description: "Review your application before submitting" }
  ];
  
  // Navigation functions
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
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
      
      // Projects with enhanced structure for Overleaf templates
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
      
      // Work Experience with enhanced structure for Overleaf templates
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
    }
  });

  // Field arrays for dynamic fields
  const { fields: projectFields, append: appendProject, remove: removeProject } = 
    useFieldArray({ control, name: "projects" });
  
  const { fields: workFields, append: appendWork, remove: removeWork } = 
    useFieldArray({ control, name: "workExperiences" });

  const {
    loading: loadingApply,
    error: errorApply,
    fn: fnApply,
  } = useFetch(applyToJob);

  // Watch for resume file changes
  const resumeValue = watch("resume");

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
          setValue(key, value);
        }
      });
      
      // Set projects
      setValue("projects", []);
      parsedData.projects.forEach((project, index) => {
        if (index === 0) {
          setValue("projects.0", project);
        } else {
          appendProject(project);
        }
      });
      
      // Set work experiences
      setValue("workExperiences", []);
      parsedData.workExperiences.forEach((work, index) => {
        if (index === 0) {
          setValue("workExperiences.0", work);
        } else {
          appendWork(work);
        }
      });
      
    } catch (error) {
      console.error("Error parsing resume:", error);
      setParseError("Failed to parse resume. Please fill in the details manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmit = (data) => {
    // Add debug logging
    console.log("Form submission triggered", { currentStep, stepsLength: steps.length });
    console.log("Resume data:", {
      resumeExists: !!data.resume,
      isArray: Array.isArray(data.resume),
      length: data.resume ? data.resume.length : 0,
      resumeValue: data.resume,
      resumeFile: resumeFile
    });
    
    // Prevent application if job is closed
    if (!isJobOpen) {
      console.error("Cannot apply to a closed job");
      alert("This job is no longer accepting applications.");
      return;
    }
    
    // Validate resume file exists
    if (!data.resume || !Array.isArray(data.resume) || data.resume.length === 0) {
      console.error("Resume file missing or invalid");
      
      // Try to use resumeFile from state if available
      if (resumeFile) {
        console.log("Using resumeFile from state instead of form data");
        data.resume = [resumeFile];
      } else {
        alert("Please upload a resume file.");
        return;
      }
    }
    
    // Validate file type
    const resumeFileObj = data.resume[0];
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    // Add detailed logging about the resume file
    console.log("Resume file details before validation:", {
      exists: !!resumeFileObj,
      type: resumeFileObj?.type,
      size: resumeFileObj?.size,
      name: resumeFileObj?.name
    });
    
    if (!allowedTypes.includes(resumeFileObj.type)) {
      console.error("Invalid file type:", resumeFileObj.type);
      alert("Invalid file type. Only PDF or Word documents are allowed.");
      return;
    }
    
    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (resumeFileObj.size > MAX_FILE_SIZE) {
      console.error("File size too large:", resumeFileObj.size);
      alert("File size exceeds the 10MB limit.");
      return;
    }
    
    console.log("Submitting application with data:", { 
      ...data, 
      resume: data.resume ? `File: ${data.resume[0]?.name}` : null 
    });
    
    // Log that we're about to upload the resume to Supabase
    console.log("Preparing to upload resume to Supabase storage bucket 'resumes'...");
    console.log("NOTE: You may see 'PDF parsing completed' messages first - this is normal. The actual storage in Supabase happens AFTER parsing, in apiApplication.js");
    
    // Show loading alert
    alert("Submitting your application. Please wait...");
    
    // Ensure we have a valid resume file to send
    if (!resumeFileObj && !resumeFile) {
      console.error("No resume file provided");
      alert("Please upload a resume file. It's required for your application.");
      return;
    }
    
    let fileToSubmit = resumeFileObj || resumeFile;
    
    // Add detailed logging about the file being submitted
    console.log("File being submitted to API:", {
      exists: !!fileToSubmit,
      type: fileToSubmit?.type,
      size: fileToSubmit?.size,
      name: fileToSubmit?.name,
      source: resumeFileObj ? "form data" : "state variable"
    });
    
    // Ensure file type is set correctly based on extension if it's undefined
    if (fileToSubmit && !fileToSubmit.type) {
      const fileName = fileToSubmit.name || '';
      const fileExt = fileName.split('.').pop().toLowerCase();
      
      // Set the file type based on extension
      if (fileExt === 'pdf') {
        // Create a new File object with the correct type
        const newFile = new File(
          [fileToSubmit], 
          fileToSubmit.name, 
          { type: 'application/pdf' }
        );
        fileToSubmit = newFile;
        console.log("Fixed file type to application/pdf based on extension");
      } else if (fileExt === 'doc') {
        const newFile = new File(
          [fileToSubmit], 
          fileToSubmit.name, 
          { type: 'application/msword' }
        );
        fileToSubmit = newFile;
        console.log("Fixed file type to application/msword based on extension");
      } else if (fileExt === 'docx') {
        const newFile = new File(
          [fileToSubmit], 
          fileToSubmit.name, 
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        fileToSubmit = newFile;
        console.log("Fixed file type to application/vnd.openxmlformats-officedocument.wordprocessingml.document based on extension");
      }
    }
    
    // Reuse the existing allowedTypes array from above
    if (!fileToSubmit || !allowedTypes.includes(fileToSubmit.type)) {
      console.error("Invalid file type:", fileToSubmit?.type);
      alert("Please upload a valid resume file. Only PDF or Word documents are allowed.");
      return;
    }
    
    // Prepare parsed resume data for storage in metadata
    const parsedResumeData = {
      personal: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        contactNumber: data.contactNumber,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        portfolioUrl: data.portfolioUrl,
        address: data.address
      },
      education: {
        collegeName: data.collegeName,
        degree: data.degree,
        universityName: data.universityName,
        specialization: data.specialization,
        graduationYear: data.graduationYear,
        startYear: data.startYear,
        endYear: data.endYear,
        location: data.location,
        cgpa: data.cgpa,
        educationLevel: data.educationLevel
      },
      projects: data.projects,
      workExperiences: data.workExperiences,
      skills: {
        skills: data.skills,
        technicalSkills: data.technicalSkills,
        softSkills: data.softSkills,
        languages: data.languages,
        certifications: data.certifications,
        experience: data.experience
      }
    };
    
    fnApply({
      ...data,
      job_id: job.id,
      candidate_id: user.id,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.contactNumber,
      status: "applied",
      resume: [fileToSubmit], // Use the validated file object in array format
      parsedResumeData: parsedResumeData // Include parsed resume data for storage in metadata
    })
    .then((result) => {
      // Show success alert
      console.log("Application submitted successfully:", result);
      
      // Check if resume exists in the result to confirm storage success
      if (result && result.resume) {
        console.log("✅ Resume successfully stored in Supabase bucket 'resumes' with URL:", result.resume);
      } else {
        console.warn("⚠️ Application submitted but resume may not have been stored properly. No resume found in result.");
      }
      
      alert("Application submitted successfully!");
      fetchJob();
      reset();
    })
    .catch((error) => {
      // Show detailed error alert
      console.error("Application submission error:", error);
      console.error("❌ Resume was NOT stored in Supabase due to an error.");
      
      // Provide more specific error message based on error type
      let errorMessage = "Error submitting application";
      
      if (error.message.includes("token") || error.message.includes("Authentication")) {
        errorMessage = "Authentication error: Please sign out and sign in again.";
      } else if (error.message.includes("storage") || error.message.includes("bucket")) {
        errorMessage = "Error uploading resume: Storage issue. Please try again later.";
      } else if (error.message.includes("database") || error.message.includes("insert")) {
        errorMessage = "Error saving application: Database issue. Please try again later.";
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    });
  };

  return (
    <Drawer 
      open={applied || !isJobOpen ? false : undefined}
      onOpenChange={(open) => {
        // When drawer opens, prevent background scrolling
        if (open) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }}
    >
      <DrawerTrigger asChild>
        <Button
          size="lg"
          variant={isJobOpen && !applied ? "blue" : "destructive"}
          disabled={!isJobOpen || applied}
        >
          {isJobOpen ? (applied ? "Applied" : "Apply") : "Hiring Closed"}
        </Button>
      </DrawerTrigger>
      <DrawerContent 
        className="max-h-[90vh]" 
        style={{ 
          maxHeight: "90vh", 
          position: "fixed", 
          bottom: 0, 
          right: 0, 
          left: 0,
          zIndex: 50,
          overflow: "hidden"
        }}
      >
        <DrawerHeader>
          <div className="flex justify-between items-center">
            <div>
              <DrawerTitle>
                Apply for {job?.title} at {job?.company?.name}
              </DrawerTitle>
              <DrawerDescription>Complete the application in {steps.length} easy steps</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full" 
                onClick={() => {
                  document.body.style.overflow = '';
                  reset();
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4 mb-2">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`flex flex-col items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
                style={{ width: `${100 / steps.length}%` }}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm font-medium
                    ${index < currentStep ? 'bg-blue-600 text-white' : 
                      index === currentStep ? 'border-2 border-blue-600 text-blue-600' : 
                      'border-2 border-gray-300 text-gray-400'}`}
                >
                  {index + 1}
                </div>
                <span className="text-xs text-center hidden md:block">{step.title}</span>
              </div>
            ))}
          </div>
          
          {/* Current Step Title and Description */}
          <div className="mt-4 text-center">
            <h3 className="font-medium text-lg">{steps[currentStep].title}</h3>
            <p className="text-sm text-gray-500">{steps[currentStep].description}</p>
          </div>
        </DrawerHeader>

        <form
          onSubmit={(e) => {
            console.log("Form submit event triggered");
            // Prevent default form submission
            e.preventDefault();
            
            // Get form values directly
            const formValues = watch();
            console.log("Form values from form submission:", formValues);
            
            // Check if resume exists and format it correctly
            if (!formValues.resume || !Array.isArray(formValues.resume) || formValues.resume.length === 0) {
              console.log("Resume field is missing or invalid in form submission");
              // Try to get the resume file from the resumeFile state
              if (resumeFile) {
                console.log("Using resumeFile from state in form submission");
                formValues.resume = [resumeFile];
                // Call onSubmit directly with the fixed values
                onSubmit(formValues);
              } else {
                alert("Please upload a resume file.");
              }
            } else {
              // Use react-hook-form's handleSubmit
              handleSubmit(onSubmit)(e);
            }
          }}
          className="flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar"
          style={{ 
            height: "calc(90vh - 200px)", 
            position: "relative",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 #f1f5f9"
          }}
        >
          {/* Step 0: Resume Upload Section */}
          {currentStep === 0 && (
            <div className="border rounded-md p-4 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-medium">Resume Upload <span className="text-red-500">*</span></h3>
              </div>
              <p className="text-sm text-gray-500 mb-2">Upload your resume in PDF or Word format. This is required to proceed with your application.</p>
              <Input
                type="file"
                accept=".pdf, .doc, .docx"
                className="flex-1 file:text-gray-500"
                {...register("resume")}
              />
              {errors.resume && (
                <p className="text-red-500 mt-1">{errors.resume.message}</p>
              )}
              {isParsing && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Parsing resume...</p>
                  <BarLoader width={"100%"} color="#36d7b7" />
                </div>
              )}
              {parseError && (
                <div className="flex items-center gap-2 mt-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Personal Information Section */}
          {currentStep === 1 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input id="middleName" {...register("middleName")} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input id="contactNumber" {...register("contactNumber")} />
                    {errors.contactNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.contactNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email ID *</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
                    <Input id="linkedinUrl" {...register("linkedinUrl")} />
                    {errors.linkedinUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.linkedinUrl.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input id="githubUrl" {...register("githubUrl")} />
                    {errors.githubUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.githubUrl.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                    <Input id="portfolioUrl" {...register("portfolioUrl")} />
                    {errors.portfolioUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.portfolioUrl.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" {...register("address")} />
                  </div>
                </div>
            </div>
          )}

          {/* Step 2: Education Section */}
          {currentStep === 2 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Education</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="collegeName">College Name</Label>
                  <Input id="collegeName" {...register("collegeName")} />
                </div>
                <div>
                  <Label htmlFor="degree">Degree</Label>
                  <Input id="degree" {...register("degree")} />
                </div>
                <div>
                  <Label htmlFor="universityName">University Name</Label>
                  <Input id="universityName" {...register("universityName")} />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" {...register("specialization")} />
                </div>
                <div>
                  <Label htmlFor="graduationYear">Year of Graduation</Label>
                  <Input id="graduationYear" {...register("graduationYear")} />
                </div>
                <div>
                  <Label htmlFor="cgpa">CGPA</Label>
                  <Input id="cgpa" {...register("cgpa")} />
                </div>
              </div>
              <div className="mt-4">
                <Label>Education Level *</Label>
                <Controller
                  name="educationLevel"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Intermediate" id="intermediate" />
                        <Label htmlFor="intermediate">Intermediate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Graduate" id="graduate" />
                        <Label htmlFor="graduate">Graduate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Post Graduate" id="post-graduate" />
                        <Label htmlFor="post-graduate">Post Graduate</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.educationLevel && (
                  <p className="text-red-500 text-sm mt-1">{errors.educationLevel.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Projects Section */}
          {currentStep === 3 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Projects</h3>
              </div>
                {projectFields.map((field, index) => (
                  <div key={field.id} className="border rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Project {index + 1}</h4>
                      {index > 0 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeProject(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`projects.${index}.name`}>Project Name *</Label>
                        <Input 
                          id={`projects.${index}.name`} 
                          {...register(`projects.${index}.name`)} 
                        />
                        {errors.projects?.[index]?.name && (
                          <p className="text-red-500 text-sm mt-1">{errors.projects[index].name.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`projects.${index}.description`}>Description *</Label>
                        <Textarea 
                          id={`projects.${index}.description`} 
                          {...register(`projects.${index}.description`)} 
                        />
                        {errors.projects?.[index]?.description && (
                          <p className="text-red-500 text-sm mt-1">{errors.projects[index].description.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`projects.${index}.technologies`}>Technologies Used</Label>
                        <Input 
                          id={`projects.${index}.technologies`} 
                          {...register(`projects.${index}.technologies`)} 
                          placeholder="React, Node.js, MongoDB, etc."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`projects.${index}.startDate`}>Start Date</Label>
                          <Input 
                            id={`projects.${index}.startDate`} 
                            {...register(`projects.${index}.startDate`)} 
                            placeholder="MM/YYYY"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`projects.${index}.endDate`}>End Date</Label>
                          <Input 
                            id={`projects.${index}.endDate`} 
                            {...register(`projects.${index}.endDate`)} 
                            placeholder="MM/YYYY or Present"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`projects.${index}.role`}>Your Role</Label>
                        <Input 
                          id={`projects.${index}.role`} 
                          {...register(`projects.${index}.role`)} 
                          placeholder="Team Lead, Developer, etc."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`projects.${index}.githubLink`}>GitHub Link</Label>
                          <Input 
                            id={`projects.${index}.githubLink`} 
                            {...register(`projects.${index}.githubLink`)} 
                          />
                        </div>
                        <div>
                          <Label htmlFor={`projects.${index}.liveLink`}>Live Demo Link</Label>
                          <Input 
                            id={`projects.${index}.liveLink`} 
                            {...register(`projects.${index}.liveLink`)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => appendProject({ name: "", description: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Project
                </Button>
                {errors.projects && typeof errors.projects.message === 'string' && (
                  <p className="text-red-500 text-sm mt-1">{errors.projects.message}</p>
                )}
              </div>
            )}

          {/* Step 4: Work Experience Section */}
          {currentStep === 4 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Work Experience</h3>
              </div>
              <div className="mb-4">
                <Label htmlFor="experience">Years of Experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  className="flex-1"
                  {...register("experience", {
                    valueAsNumber: true,
                  })}
                />
                {errors.experience && (
                  <p className="text-red-500 text-sm mt-1">{errors.experience.message}</p>
                )}
              </div>
              
              {workFields.map((field, index) => (
                <div key={field.id} className="border rounded-md p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Work Experience {index + 1}</h4>
                    {index > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeWork(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`workExperiences.${index}.company`}>Company Name</Label>
                      <Input 
                        id={`workExperiences.${index}.company`} 
                        {...register(`workExperiences.${index}.company`)} 
                      />
                    </div>
                    <div>
                      <Label htmlFor={`workExperiences.${index}.position`}>Position/Title</Label>
                      <Input 
                        id={`workExperiences.${index}.position`} 
                        {...register(`workExperiences.${index}.position`)} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`workExperiences.${index}.startDate`}>Start Date</Label>
                        <Input 
                          id={`workExperiences.${index}.startDate`} 
                          {...register(`workExperiences.${index}.startDate`)} 
                          placeholder="MM/YYYY"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`workExperiences.${index}.endDate`}>End Date</Label>
                        <Input 
                          id={`workExperiences.${index}.endDate`} 
                          {...register(`workExperiences.${index}.endDate`)} 
                          placeholder="MM/YYYY or Present"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`workExperiences.${index}.location`}>Location</Label>
                      <Input 
                        id={`workExperiences.${index}.location`} 
                        {...register(`workExperiences.${index}.location`)} 
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`workExperiences.${index}.description`}>Description of Work</Label>
                      <Textarea 
                        id={`workExperiences.${index}.description`} 
                        {...register(`workExperiences.${index}.description`)} 
                      />
                    </div>
                    <div>
                      <Label htmlFor={`workExperiences.${index}.responsibilities`}>Key Responsibilities</Label>
                      <Textarea 
                        id={`workExperiences.${index}.responsibilities`} 
                        {...register(`workExperiences.${index}.responsibilities`)} 
                        placeholder="List your main responsibilities"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`workExperiences.${index}.achievements`}>Achievements</Label>
                      <Textarea 
                        id={`workExperiences.${index}.achievements`} 
                        {...register(`workExperiences.${index}.achievements`)} 
                        placeholder="Notable achievements or contributions"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => appendWork({ company: "", description: "" })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Work Experience
              </Button>
            </div>
          )}

          {/* Step 5: Skills & Certifications Section */}
          {currentStep === 5 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Skills & Certifications</h3>
              </div>
              <div className="mb-4">
                <Label htmlFor="skills">Skills (Comma Separated) *</Label>
                <Input
                  id="skills"
                  type="text"
                  className="flex-1"
                  {...register("skills")}
                  placeholder="React, Node.js, Project Management, etc."
                />
                {errors.skills && (
                  <p className="text-red-500 text-sm mt-1">{errors.skills.message}</p>
                )}
              </div>
              <div className="mb-4">
                <Label htmlFor="technicalSkills">Technical Skills</Label>
                <Textarea
                  id="technicalSkills"
                  {...register("technicalSkills")}
                  placeholder="Programming languages, frameworks, tools, etc."
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="softSkills">Soft Skills</Label>
                <Textarea
                  id="softSkills"
                  {...register("softSkills")}
                  placeholder="Communication, leadership, teamwork, etc."
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="languages">Languages</Label>
                <Input
                  id="languages"
                  type="text"
                  {...register("languages")}
                  placeholder="English (Fluent), Spanish (Intermediate), etc."
                />
              </div>
              <div>
                <Label htmlFor="certifications">Certifications *</Label>
                <Textarea
                  id="certifications"
                  {...register("certifications")}
                  placeholder="List your certifications with issuing organization and date"
                />
                {errors.certifications && (
                  <p className="text-red-500 text-sm mt-1">{errors.certifications.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="border rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium text-lg">Review Your Application</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <p><span className="font-medium">Name:</span> {watch('firstName')} {watch('middleName')} {watch('lastName')}</p>
                  <p><span className="font-medium">Contact:</span> {watch('contactNumber')}</p>
                  <p><span className="font-medium">Email:</span> {watch('email')}</p>
                  <p><span className="font-medium">LinkedIn:</span> {watch('linkedinUrl')}</p>
                  {watch('githubUrl') && <p><span className="font-medium">GitHub:</span> {watch('githubUrl')}</p>}
                  {watch('portfolioUrl') && <p><span className="font-medium">Portfolio:</span> {watch('portfolioUrl')}</p>}
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Education</h4>
                  <p><span className="font-medium">College:</span> {watch('collegeName')}</p>
                  <p><span className="font-medium">Degree:</span> {watch('degree')}</p>
                  <p><span className="font-medium">University:</span> {watch('universityName')}</p>
                  <p><span className="font-medium">Education Level:</span> {watch('educationLevel')}</p>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Experience & Skills</h4>
                  <p><span className="font-medium">Years of Experience:</span> {watch('experience')}</p>
                  <p><span className="font-medium">Skills:</span> {watch('skills')}</p>
                  <p><span className="font-medium">Certifications:</span> {watch('certifications')}</p>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Projects</h4>
                  <p>You have added {projectFields.length} project(s)</p>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <h4 className="font-medium mb-2">Work Experience</h4>
                  <p>You have added {workFields.length} work experience(s)</p>
                </div>
              </div>
            </div>
          )}

          {errorApply?.message && (
            <p className="text-red-500 mt-2">{errorApply?.message}</p>
          )}
          {loadingApply && <BarLoader width={"100%"} color="#36d7b7" className="mt-2" />}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-4 mb-2 sticky bottom-0 bg-black p-4 border-t">
            {currentStep > 0 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
            ) : (
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button 
                type="button" 
                variant="blue" 
                onClick={() => {
                  // Validate current step before proceeding
                  if (currentStep === 0 && !resumeValue?.[0]) {
                    // Resume upload validation
                    alert("Please upload your resume before proceeding");
                    return;
                  }
                  
                  if (currentStep === 1) {
                    // Personal information validation
                    const personalFields = ["firstName", "lastName", "contactNumber", "email", "linkedinUrl"];
                    let isValid = true;
                    
                    personalFields.forEach(field => {
                      if (!watch(field)) {
                        isValid = false;
                      }
                    });
                    
                    if (!isValid) {
                      alert("Please fill in all required personal information fields");
                      return;
                    }
                  }
                  
                  if (currentStep === 3) {
                    // Projects validation
                    if (projectFields.length === 0) {
                      alert("Please add at least one project");
                      return;
                    }
                  }
                  
                  nextStep();
                }}
              >
                Next
              </Button>
            ) : (
              <>
                <Button 
                  type="submit" 
                  variant="blue" 
                  size="lg"
                  onClick={() => console.log("Apply button clicked", { currentStep, stepsLength: steps.length })}
                >
                  Apply
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    console.log("Direct submit button clicked");
                    // Get form values
                    const formValues = watch();
                    console.log("Form values from watch():", formValues);
                    
                    // Check if resume exists and format it correctly
                    if (!formValues.resume || !Array.isArray(formValues.resume) || formValues.resume.length === 0) {
                      console.log("Resume field is missing or invalid in watch() values");
                      // Try to get the resume file from the resumeFile state
                      if (resumeFile) {
                        console.log("Using resumeFile from state instead");
                        formValues.resume = [resumeFile];
                      } else {
                        alert("Please upload a resume file.");
                        return;
                      }
                    }
                    
                    // Call onSubmit with properly formatted values
                    onSubmit(formValues);
                  }}
                  className="ml-2"
                >
                  Apply (Direct)
                </Button>
              </>
            )}
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

export default ApplyJobDrawer;
