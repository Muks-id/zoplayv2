import { Suspense } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="safelink-page auth-page">
      <SiteNavigation />
      <div className="auth-page-body">
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}