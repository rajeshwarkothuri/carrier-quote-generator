"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
/** Global boundary: catches mapping failures, schema mismatches and any unexpected exception. */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTitle>We couldn't prepare your quote form</AlertTitle>
        <AlertDescription>{error.message || "Something went wrong while mapping your profile."}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  );
}
