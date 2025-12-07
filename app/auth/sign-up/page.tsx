import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <p className="text-center text-muted-foreground">
          Please contact the {" "}
          <a
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.mdfasadik.com/"
          >
            Developer
          </a>{" "}
          for Admin access.
        </p>
        {/* <SignUpForm /> */}
      </div>
    </div>
  );
}
