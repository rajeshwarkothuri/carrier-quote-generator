import { clearProfile, selectSample, submitQuote } from "@/app/actions";
import { ProfileInput } from "@/components/profile-input";
import { ProfileToggle } from "@/components/profile-toggle";
import { QuoteForm } from "@/components/quote-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCarrier } from "@/lib/carriers/registry";
import { assess } from "@/lib/core/pipeline";
import { getSession } from "@/lib/session/current";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

function Flow({ session, carrierId }: { session: Session; carrierId: string }) {
  const carrier = getCarrier(carrierId);
  if (!carrier) {
    return (
      <Alert variant="destructive" data-testid="problem">
        <AlertTitle>Carrier not found</AlertTitle>
        <AlertDescription>The selected carrier is not available.</AlertDescription>
      </Alert>
    );
  }

  const { definition } = carrier.adapter;
  const { mapping, eligibility } = assess(carrier.adapter, session.profile); // throws MappingContractError -> app/error.tsx
  if (!eligibility.eligible)
    return (
      <Alert variant="destructive" data-testid="problem">
        <AlertTitle>We can't issue a quote with {definition.name}</AlertTitle>
        <AlertDescription><ul className="list-disc space-y-1 pl-5">{eligibility.reasons.map((r) => <li key={r}>{r}</li>)}</ul></AlertDescription>
      </Alert>
    );
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">You're eligible. We filled in what we could; the highlighted fields still need your answer.</p>
      <QuoteForm key={session.id} schema={definition.schema} mapping={mapping} onSubmit={submitQuote.bind(null, definition.version.carrier)} />
    </div>
  );
}

export default async function Home() {
  const session = await getSession();
  const carrierId = process.env.DEFAULT_CARRIER || "harbor"; // Load carrier dynamically (e.g., from env or config)
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <ProfileToggle active={session?.sample} action={selectSample} />
        <h1 className="text-3xl font-semibold">{getCarrier(carrierId)?.adapter.definition.name || "Carrier"} renters quote</h1>
      </header>
      {session ? <Flow session={session} carrierId={carrierId} /> : <Alert><AlertDescription>Choose a sample profile above, or paste your own below.</AlertDescription></Alert>}
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-sans text-sm font-medium">Use your own profile JSON</summary>
        <div className="mt-3"><ProfileInput /></div>
      </details>
      {session && (
        <form action={clearProfile} className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" type="submit">Clear my data</Button>
          Profiles are held server-side for 30 minutes and never placed in the URL.
        </form>
      )}
    </div>
  );
}