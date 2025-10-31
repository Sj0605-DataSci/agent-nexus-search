import * as yup from "yup";

// Phone regex - exactly 10 digits
const phoneRegex = /^\d{10}$/;

// Contact form validation schema
export const contactFormSchema = yup.object().shape({
  firstName: yup
    .string()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s]+$/, "First name can only contain letters"),

  lastName: yup
    .string()
    .required("Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s]+$/, "Last name can only contain letters"),

  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address")
    .test(
      "no-plus-in-email",
      "Email addresses with '+' are not allowed",
      value => !value || !value.includes("+")
    )
    .lowercase()
    .trim(),

  phone: yup
    .string()
    .required("Phone number is required")
    .matches(phoneRegex, "Phone number must be exactly 10 digits")
    .length(10, "Phone number must be exactly 10 digits"),

  country: yup
    .string()
    .required("Country is required")
    .oneOf(
      ["India", "USA", "UK", "Canada", "Australia", "Other"],
      "Please select a valid country"
    ),

  role: yup
    .string()
    .required("Role is required")
    .oneOf(
      ["Business Owner", "Accountant", "Finance Manager", "CA/CPA", "Other"],
      "Please select a valid role"
    ),

  message: yup
    .string()
    .required("Message is required")
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must not exceed 1000 characters")
    .trim(),
});

export type ContactFormData = yup.InferType<typeof contactFormSchema>;
