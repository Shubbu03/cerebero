"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Background from "../Background";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

const signupSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthFormProps {
  mode: "login" | "signup";
}

const formAnimation = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const inputAnimation = {
  focus: { scale: 1.02, transition: { duration: 0.2 } },
  blur: { scale: 1, transition: { duration: 0.2 } },
};

const buttonAnimation = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const [formData, setFormData] = useState<LoginFormData | SignupFormData>(
    mode === "login"
      ? { email: "", password: "" }
      : { name: "", email: "", password: "", confirmPassword: "" }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  const validateForm = () => {
    try {
      if (mode === "login") {
        loginSchema.parse(formData);
      } else {
        signupSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          redirect: false,
          email: (formData as LoginFormData).email,
          password: (formData as LoginFormData).password,
        });

        if (result?.error) {
          setServerError(result.error);
        } else if (result?.ok) {
        }
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: (formData as SignupFormData).name,
            email: (formData as SignupFormData).email,
            password: (formData as SignupFormData).password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setServerError(data.message || "Something went wrong");
        } else {
          const result = await signIn("credentials", {
            redirect: false,
            email: (formData as SignupFormData).email,
            password: (formData as SignupFormData).password,
          });

          if (result?.ok) {
          }
        }
      }
    } catch (error) {
      setServerError("An unexpected error occurred. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Google sign in error:", error);
      setServerError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex justify-center items-center w-full h-screen">
      <Background className="absolute top-0 left-0 w-full h-screen" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={formAnimation}
        className="w-full max-w-md z-10 px-4"
      >
        <Card className="border-none shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-black text-center">
              {mode === "login"
                ? "Sign in to your account"
                : "Create a new account"}
            </CardTitle>
            <p className="text-sm text-black text-center">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <Link
                href={mode === "login" ? "/signup" : "/login"}
                className="font-medium text-black hover:underline inline-flex items-center"
              >
                <motion.span
                  className="inline-flex items-center"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </motion.span>
              </Link>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 text-gray-800"
                >
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-black">
                    Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                    <motion.div whileFocus="focus" variants={inputAnimation}>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={(formData as SignupFormData).name || ""}
                        onChange={handleChange}
                        className="pl-10 focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Your name"
                      />
                    </motion.div>
                    {errors.name && (
                      <motion.p
                        className="mt-1 text-xs text-black"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.name}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                  <motion.div whileFocus="focus" variants={inputAnimation}>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="you@example.com"
                    />
                  </motion.div>
                  {errors.email && (
                    <motion.p
                      className="mt-1 text-xs text-black"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-black">
                    Password
                  </Label>
                  {mode === "login" && (
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-black hover:underline"
                    >
                      <motion.span
                        className="inline-block"
                        whileHover={{ x: 3 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        Forgot your password?
                      </motion.span>
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                  <motion.div whileFocus="focus" variants={inputAnimation}>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10 focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="••••••••"
                    />
                  </motion.div>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-black"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  {errors.password && (
                    <motion.p
                      className="mt-1 text-xs text-black"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-black">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                    <motion.div whileFocus="focus" variants={inputAnimation}>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={
                          (formData as SignupFormData).confirmPassword || ""
                        }
                        onChange={handleChange}
                        className="pl-10 focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="••••••••"
                      />
                    </motion.div>
                    {errors.confirmPassword && (
                      <motion.p
                        className="mt-1 text-xs text-black"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.confirmPassword}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}

              <motion.div
                whileHover={!isLoading ? "hover" : undefined}
                whileTap={!isLoading ? "tap" : undefined}
                variants={buttonAnimation}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black hover:bg-black/90 text-white cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <span>{mode === "login" ? "Sign in" : "Sign up"}</span>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-black">
                  Or continue with
                </span>
              </div>
            </div>

            <motion.div
              whileHover={!isLoading ? "hover" : undefined}
              whileTap={!isLoading ? "tap" : undefined}
              variants={buttonAnimation}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full border-gray-300 text-white cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  className="mr-2"
                >
                  <path
                    fill="#EA4335"
                    d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                  />
                  <path
                    fill="#4A90E2"
                    d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1272727,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthForm;
