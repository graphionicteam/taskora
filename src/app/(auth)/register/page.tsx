import React from "react";
import { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create Account — Taskora",
  description: "Register for a Taskora workspace account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
