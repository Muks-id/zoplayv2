import { Suspense } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import SignInForm from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="safelink-page auth-page">
      <SiteNavigation />
      <div className="auth-page-body">
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}
