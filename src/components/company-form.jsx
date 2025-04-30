import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { BarLoader } from "react-spinners";
import useFetch from "@/hooks/use-fetch";
import { addNewCompany, isValidUUID } from "@/api/apiCompanies";

// Form validation schema
const companySchema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  description: z.string().min(1, { message: "Company description is required" }),
  logo: z
    .any()
    .refine(
      (files) =>
        files?.[0] instanceof File &&
        (files[0].type === "image/png" ||
          files[0].type === "image/jpeg" ||
          files[0].type === "image/jpg"),
      {
        message: "Company logo is required (PNG or JPEG only)",
      }
    ),
});

const CompanyForm = ({ onSuccess }) => {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { fn: submitCompany, loading, error: apiError } = useFetch(addNewCompany);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate user ID
      if (!user?.id || !isValidUUID(user.id)) {
        throw new Error("Invalid user ID. Please sign in again.");
      }

      console.log('Submitting company with logo upload...');
      
      // Submit company data with logo
      const result = await submitCompany({
        name: data.name,
        description: data.description,
        logo: data.logo[0],
        userId: user.id,
      });

      // Reset form on success
      if (result) {
        reset();
        if (onSuccess && typeof onSuccess === "function") {
          onSuccess(result);
        }
      }
    } catch (err) {
      console.error("Error submitting company:", err);
      setError(err.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Add Your Company</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium mb-1">
            Company Name *
          </label>
          <Input
            id="company-name"
            placeholder="Enter company name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="company-description" className="block text-sm font-medium mb-1">
            Company Description *
          </label>
          <Textarea
            id="company-description"
            placeholder="Enter company description"
            {...register("description")}
            className={`min-h-[120px] ${errors.description ? "border-red-500" : ""}`}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="company-logo" className="block text-sm font-medium mb-1">
            Company Logo *
          </label>
          <Input
            id="company-logo"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            {...register("logo")}
            className={`${errors.logo ? "border-red-500" : ""}`}
          />
          {errors.logo && (
            <p className="text-red-500 text-sm mt-1">{errors.logo.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Upload a PNG or JPEG image (max 5MB)
          </p>
        </div>

        {(error || apiError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-red-600 dark:text-red-400">
            {error || apiError?.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? (
            <>
              <BarLoader color="#ffffff" height={4} width={30} />
              <span className="ml-2">Uploading...</span>
            </>
          ) : (
            "Submit Company Information"
          )}
        </Button>
      </form>
    </div>
  );
};

export default CompanyForm;