import { z } from "zod";

function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const inquirySchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name").max(48),
  lastName: z.string().trim().min(1, "Please enter your last name").max(48),
  partnerFirstName: z
    .string()
    .trim()
    .min(1, "Please enter your partner's first name")
    .max(48),
  partnerLastName: z.string().trim().max(48),
  email: z.email("Please enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Please enter a valid phone number")
    .max(24)
    .regex(/^[+\d\s().-]+$/, "Please enter a valid phone number"),
  weddingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose your wedding date")
    // Allow one day of slack for time-zone differences between browser and server.
    .refine((d) => {
      const y = new Date(Date.now() - 86_400_000);
      return d >= y.toISOString().slice(0, 10);
    }, "Wedding date should be in the future"),
  packageId: z.string().min(1, "Please choose a package"),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export { todayLocal };
