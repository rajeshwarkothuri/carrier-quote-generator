"use client";
import { useActionState } from "react";
import { submitProfileJson } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function ProfileInput() {
  const [state, action, pending] = useActionState(submitProfileJson, {});
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="profile-json" className="text-sm font-medium">Customer profile (JSON, canonical v1)</label>
      <textarea id="profile-json" name="profile" rows={6} required
        className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {state.errors && <ul role="alert" className="list-disc pl-5 text-xs text-destructive">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <Button type="submit" disabled={pending}>Use this profile</Button>
    </form>
  );
}
