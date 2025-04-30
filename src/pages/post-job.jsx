import { getCompanies } from "@/api/apiCompanies";
import { addNewJob, getSingleJob, updateJob } from "@/api/apiJobs";
import AddCompanyDrawer from "@/components/add-company-drawer";
import CompanyForm from "@/components/company-form";
import { Button } from "@/components/ui/button";


import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/clerk-react";
import { zodResolver } from "@hookform/resolvers/zod";
import MDEditor from "@uiw/react-md-editor";
import { State } from "country-state-city";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { BarLoader } from "react-spinners";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  location: z.string().min(1, { message: "Select a location" }),
  company_id: z.string().min(1, { message: "Select or Add a new Company" }),
  requirements: z.string().min(1, { message: "Requirements are required" }),
});

const PostJob = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [jobDetailsLoaded, setJobDetailsLoaded] = useState(false);
  
  // Check if we're in edit mode by looking for job ID in URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const editJobId = queryParams.get('edit');
    
    if (editJobId) {
      setIsEditMode(true);
      setJobId(editJobId);
    } else {
      // Only mark as complete if we're not in edit mode
      // For edit mode, we'll set this after job details are loaded
      setInitialLoadComplete(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { location: "", company_id: "", requirements: "", title: "", description: "" },
    resolver: zodResolver(schema),
  });
  
  // Fetch job data for editing if in edit mode
  const {
    loading: loadingJobDetails,
    data: jobDetails,
    fn: fetchJobDetails
  } = useFetch(getSingleJob, {
    job_id: jobId
  });
  
  // Update job function
  const {
    loading: loadingUpdateJob,
    error: errorUpdateJob,
    data: dataUpdateJob,
    fn: fnUpdateJob
  } = useFetch(updateJob, {
    job_id: jobId
  });

  const {
    loading: loadingCreateJob,
    error: errorCreateJob,
    data: dataCreateJob,
    fn: fnCreateJob,
  } = useFetch(addNewJob);

  /**
 * Generates a UUID v4 compatible with both browser and Node.js environments
 * @returns {string} A UUID v4 string
 */
function generateUUID() {
  // Check if crypto.randomUUID is available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

  const onSubmit = async (data) => {
    try {
      // company_id should be a valid UUID string, not a number
      const company_id = data.company_id || null;
      
      if (!company_id) {
        throw new Error("Please select a valid company");
      }
      
      if (isEditMode) {
        // Update existing job
        await fnUpdateJob({
          ...data,
          company_id,
          recruiter_id: user.id,
          // Keep the current isOpen status
          isOpen: jobDetails?.isopen
        });
      } else {
        // Create new job
        await fnCreateJob({
          ...data,
          company_id,
          id: generateUUID(), // Generate UUID for the job
          recruiter_id: user.id,
          isOpen: true,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(isEditMode ? "Error updating job:" : "Error creating job:", error);
      // Error is already handled by useFetch hook
    }
  };

  useEffect(() => {
    if (dataCreateJob?.length > 0) {
      // Successfully created job, reset form and navigate to jobs listing
      reset();
      navigate("/jobs");
    }
  }, [dataCreateJob, navigate, reset]);
  
  useEffect(() => {
    if (dataUpdateJob) {
      // Successfully updated job, navigate back to job details
      navigate(`/job/${jobId}`);
    }
  }, [dataUpdateJob, navigate, jobId]);
  
  // Load job details when in edit mode
  useEffect(() => {
    if (isEditMode && jobId && isLoaded) {
      fetchJobDetails();
      // Note: initialLoadComplete will be set after job details are loaded in another useEffect
    }
  }, [isEditMode, jobId, isLoaded, fetchJobDetails]);
  
  // Populate form with job details when editing
  useEffect(() => {
    if (jobDetails && isEditMode) {
      // First set all form values
      setValue('title', jobDetails.title);
      setValue('description', jobDetails.description);
      setValue('location', jobDetails.location);
      setValue('company_id', jobDetails.company_id);
      setValue('requirements', jobDetails.requirements || '');
      
      // Mark job details as loaded
      setJobDetailsLoaded(true);
    }
  }, [jobDetails, isEditMode, setValue]);
  
  // Set initialLoadComplete only after job details are fully loaded and applied
  useEffect(() => {
    if (isEditMode && jobDetailsLoaded) {
      setInitialLoadComplete(true);
    }
  }, [isEditMode, jobDetailsLoaded]);

  const {
    loading: loadingCompanies,
    data: companies,
    fn: fnCompanies,
  } = useFetch(getCompanies);

  useEffect(() => {
    if (isLoaded) {
      fnCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Show loading state when:
  // 1. User data is not loaded yet
  // 2. Companies are being fetched
  // 3. We're in edit mode and job details are being loaded or not yet applied to form
  // 4. Initial URL parameter check is not complete
  if (!isLoaded || loadingCompanies || (isEditMode && (loadingJobDetails || !jobDetailsLoaded)) || !initialLoadComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-semibold mb-4">
          {isEditMode ? "Loading job details..." : "Loading..."}
        </h2>
        <BarLoader width={"100%"} color="#36d7b7" />
      </div>
    );
  }

  if (user?.unsafeMetadata?.role !== "recruiter") {
    return <Navigate to="/jobs" />;
  }

  // Handle successful company creation
  const handleCompanySuccess = (companyData) => {
    // Refresh companies list
    fnCompanies();
    // Hide company form
    setShowCompanyForm(false);
  };

  return (
    <div>
      <h1 className="gradient-title font-extrabold text-5xl sm:text-7xl text-center pb-8">
        {showCompanyForm ? "Add Your Company" : (isEditMode ? "Edit Job" : "Post a Job")}
      </h1>
      
      {showCompanyForm ? (
        <div className="mb-8">
          <CompanyForm onSuccess={handleCompanySuccess} />
          <div className="flex justify-center mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowCompanyForm(false)}
            >
              Back to Job Posting
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <Button 
              type="button" 
              onClick={() => setShowCompanyForm(true)}
              variant="secondary"
            >
              Need to add your company first? Click here
            </Button>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 p-4 pb-0"
          >
        <Input placeholder="Job Title" {...register("title")} />
        {errors.title && <p className="text-red-500">{errors.title.message}</p>}

        <Textarea placeholder="Job Description" {...register("description")} />
        {errors.description && (
          <p className="text-red-500">{errors.description.message}</p>
        )}

        <div className="flex gap-4 items-center">
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Job Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {State.getStatesOfCountry("IN").map(({ name }) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <Controller
            name="company_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Company">
                    {field.value
                      ? companies?.find((com) => com.id === field.value)
                          ?.name
                      : "Company"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {companies?.map(({ name, id }) => (
                      <SelectItem key={name} value={id.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <AddCompanyDrawer fetchCompanies={fnCompanies} />
        </div>
        {errors.location && (
          <p className="text-red-500">{errors.location.message}</p>
        )}
        {errors.company_id && (
          <p className="text-red-500">{errors.company_id.message}</p>
        )}

        <Controller
          name="requirements"
          control={control}
          render={({ field }) => (
            <MDEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.requirements && (
          <p className="text-red-500">{errors.requirements.message}</p>
        )}
        {errors.errorCreateJob && (
          <p className="text-red-500">{errors?.errorCreateJob?.message}</p>
        )}
        {errorCreateJob?.message && (
          <p className="text-red-500">{errorCreateJob?.message}</p>
        )}
        {(loadingCreateJob || loadingUpdateJob) && <BarLoader width={"100%"} color="#36d7b7" />}
        {errorUpdateJob?.message && (
          <p className="text-red-500">{errorUpdateJob?.message}</p>
        )}
        <Button 
          type="submit" 
          variant="blue" 
          size="lg" 
          className="mt-2" 
          disabled={loadingCreateJob}
        >
          {loadingCreateJob ? "Creating Job..." : (loadingUpdateJob ? "Updating Job..." : (isEditMode ? "Update Job" : "Submit"))}
        </Button>
      </form>
        </>
      )}
    </div>
  );
};

export default PostJob;
