import { Suspense } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import SignUpForm from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="safelink-page auth-page">
      <SiteNavigation />
      <div className="auth-page-body">
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
    </main>
  );
}
