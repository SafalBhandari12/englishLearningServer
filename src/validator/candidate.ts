import { z } from "zod";

// Schema for candidate profile creation
export const candidateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  about: z
    .string()
    .min(1, "About section is required")
    .max(1000, "About must be less than 1000 characters"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location must be less than 100 characters"),
});

// Schema for education creation
export const educationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Institution name is required")
      .max(200, "Institution name must be less than 200 characters"),
    degree: z
      .string()
      .min(1, "Degree is required")
      .max(100, "Degree must be less than 100 characters"),
    startYear: z
      .number()
      .int()
      .min(1900, "Start year must be after 1900")
      .max(new Date().getFullYear(), "Start year cannot be in the future"),
    endYear: z
      .number()
      .int()
      .min(1900, "End year must be after 1900")
      .max(
        new Date().getFullYear() + 10,
        "End year cannot be more than 10 years in the future"
      ),
  })
  .refine((data) => data.endYear >= data.startYear, {
    message: "End year must be after or equal to start year",
    path: ["endYear"],
  });

// Schema for profile creation
export const profileSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  resume: z.string().url("Resume must be a valid URL").optional(),
  skills: z
    .array(z.string().min(1, "Skill cannot be empty"))
    .min(1, "At least one skill is required")
    .max(50, "Maximum 50 skills allowed"),
  experienceYear: z
    .number()
    .int()
    .min(0, "Experience years cannot be negative")
    .max(50, "Experience years cannot be more than 50"),
  responsibilitiesHandled: z
    .array(z.string().min(1, "Responsibility cannot be empty"))
    .min(1, "At least one responsibility is required"),
});

// Schema for updating candidate profile
export const updateCandidateProfileSchema = candidateProfileSchema.partial();

// Schema for updating education
export const updateEducationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Institution name is required")
      .max(200, "Institution name must be less than 200 characters")
      .optional(),
    degree: z
      .string()
      .min(1, "Degree is required")
      .max(100, "Degree must be less than 100 characters")
      .optional(),
    startYear: z
      .number()
      .int()
      .min(1900, "Start year must be after 1900")
      .max(new Date().getFullYear(), "Start year cannot be in the future")
      .optional(),
    endYear: z
      .number()
      .int()
      .min(1900, "End year must be after 1900")
      .max(
        new Date().getFullYear() + 10,
        "End year cannot be more than 10 years in the future"
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.endYear && data.startYear) {
        return data.endYear >= data.startYear;
      }
      return true;
    },
    {
      message: "End year must be after or equal to start year",
      path: ["endYear"],
    }
  );

// Schema for updating profile
export const updateProfileSchema = profileSchema.partial();

// Schema for education ID parameter
export const educationIdSchema = z.object({
  id: z.string().min(1, "Education ID is required"),
});

// Schema for profile ID parameter
export const profileIdSchema = z.object({
  id: z.string().min(1, "Profile ID is required"),
});
