require("dotenv").config();
const { z } = require("zod");

// Define schema for environment variables
const envSchema = z.object({
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  ACCESS_SECRET: z.string().min(1, "ACCESS_SECRET is required"),
  REFRESH_SECRET: z.string().min(1, "REFRESH_SECRET is required"),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  FRONTEND_NETWORK_URL: z.string().url().optional(),
  FRONTEND_PORT: z.coerce.number().int().positive().default(5173),
  PORT: z.coerce.number().int().positive().default(5000),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("Environment validation failed:");
  console.error(result.error.format());
  process.exit(1);
}

const env = result.data;

// warn on partial cloudinary config
const hasCloudinary =
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET &&
  env.CLOUDINARY_CLOUD_NAME;
if (
  !hasCloudinary &&
  (env.CLOUDINARY_API_KEY ||
    env.CLOUDINARY_API_SECRET ||
    env.CLOUDINARY_CLOUD_NAME)
) {
  console.warn(
    "Cloudinary appears partially configured. Ensure CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and CLOUDINARY_CLOUD_NAME are all set.",
  );
}

module.exports = {
  MONGO_URI: env.MONGO_URI,
  ACCESS_SECRET: env.ACCESS_SECRET,
  REFRESH_SECRET: env.REFRESH_SECRET,
  CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY || null,
  CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET || null,
  CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME || null,
  FRONTEND_URL: env.FRONTEND_URL || null,
  FRONTEND_NETWORK_URL: env.FRONTEND_NETWORK_URL || null,
  FRONTEND_PORT: env.FRONTEND_PORT,
  PORT: env.PORT,
};
