/* eslint-disable react/prop-types */
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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import useFetch from "@/hooks/use-fetch";
import { addNewCompany } from "@/api/apiCompanies";
import { BarLoader } from "react-spinners";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

const schema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  description: z.string().optional(),
  logo: z
    .any()
    .refine(
      (file) =>
        file[0] &&
        (file[0].type === "image/png" || file[0].type === "image/jpeg"),
      {
        message: "Only Images are allowed",
      }
    ),
});

const AddCompanyDrawer = ({ fetchCompanies }) => {
  const { user } = useUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  const {
    loading: loadingAddCompany,
    error: errorAddCompany,
    data: dataAddCompany,
    fn: fnAddCompany,
  } = useFetch(addNewCompany);

  const onSubmit = async (data) => {
    try {
      if (!user?.id) {
        throw new Error("User ID is required");
      }
      
      console.log('Submitting company with logo upload...');
      
      await fnAddCompany({
        ...data,
        logo: data.logo[0],
        userId: user.id, // Pass the user ID for logo filename generation
      });
      
      console.log('Company added successfully!');
    } catch (error) {
      console.error("Error adding company:", error);
      // Error is already handled by useFetch hook
    }
  };

  useEffect(() => {
    if (dataAddCompany?.length > 0) {
      fetchCompanies();
      reset(); // Reset the form after successful submission
    }
  }, [dataAddCompany, fetchCompanies, reset]);

  // State to control drawer open/close
  const [open, setOpen] = useState(false);

  // Close drawer after successful submission
  useEffect(() => {
    if (dataAddCompany?.length > 0) {
      setOpen(false);
    }
  }, [dataAddCompany]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          Add Company
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby="add-company-description">
        <DrawerHeader>
          <DrawerTitle>Add a New Company</DrawerTitle>
          <DrawerDescription id="add-company-description">Fill in the company details below</DrawerDescription>
        </DrawerHeader>
        <form className="flex flex-col gap-4 p-4 pb-0">
          {/* Company Name */}
          <Input placeholder="Company name" {...register("name")} />

          {/* Company Description */}
          <Textarea 
            placeholder="Company description (optional)" 
            {...register("description")} 
            className="min-h-[100px]"
          />

          {/* Company Logo */}
          <div className="flex flex-col gap-2">
            <label htmlFor="company-logo" className="text-sm font-medium">Company Logo</label>
            <Input
              id="company-logo"
              type="file"
              accept="image/*"
              className="file:text-gray-500"
              {...register("logo")}
            />
          </div>

          {/* Add Button */}
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            variant="destructive"
            className="w-full"
          >
            Add Company
          </Button>
        </form>
        <DrawerFooter>
          {errors.name && <p className="text-red-500">{errors.name.message}</p>}
          {errors.description && <p className="text-red-500">{errors.description.message}</p>}
          {errors.logo && <p className="text-red-500">{errors.logo.message}</p>}
          {errorAddCompany?.message && (
            <p className="text-red-500">{errorAddCompany?.message}</p>
          )}
          {loadingAddCompany && <BarLoader width={"100%"} color="#36d7b7" />}
          <DrawerClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AddCompanyDrawer;
