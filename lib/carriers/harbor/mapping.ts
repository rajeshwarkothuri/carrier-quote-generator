import type { CanonicalProfile } from "@/lib/canonical";
import { isoToUsDate, smallestTierAtLeast, STATE_NAMES, usd } from "@/lib/core/converters";
import { MappingBuilder } from "@/lib/core/mapper";
import type { MappingResult } from "@/lib/core/types";
import { optionsOf } from "./definition";

/** Carrier Harbor-specific customer mapping  */
export function mapHarbor(p: CanonicalProfile): MappingResult {
  const m = new MappingBuilder();

  p.first_name && p.last_name
    ? m.converted("applicant_full_name", `${p.first_name} ${p.last_name}`, ["first_name", "last_name"], "Combined first and last name.")
    : m.missing("applicant_full_name", "Both first and last name are needed.");

  p.date_of_birth
    ? m.converted("date_of_birth", isoToUsDate(p.date_of_birth), ["date_of_birth"], "Reformatted YYYY-MM-DD to MM/DD/YYYY.")
    : m.missing("date_of_birth", "Not in the customer profile.");

  p.email ? m.mapped("contact_email", p.email, ["email"]) : m.missing("contact_email", "Not in the customer profile.");
  m.missing("phone", "Not available in the customer profile.");

  const states = optionsOf("residence_state") as string[];
  const stateName = p.state ? STATE_NAMES[p.state] : undefined;
  if (!p.state) m.missing("residence_state", "Not in the customer profile.");
  else if (stateName && states.includes(stateName)) m.converted("residence_state", stateName, ["state"], "Converted state code to full name.");
  else m.unsupported("residence_state", `Harbor doesn't currently offer renters coverage in ${p.state}. Available states: ${states.join(", ")}.`);

  p.zip ? m.mapped("postal_code", p.zip, ["zip"]) : m.missing("postal_code", "Not in the customer profile.");

  const tiers = optionsOf("contents_coverage") as number[];
  if (p.personal_property_value === undefined) m.missing("contents_coverage", "Not in the customer profile.");
  else {
    const tier = smallestTierAtLeast(p.personal_property_value, tiers);
    tier === undefined
      ? m.unsupported("contents_coverage", `Harbor's maximum contents coverage is ${usd(Math.max(...tiers))}, and your belongings are valued above that.`)
      : m.converted("contents_coverage", tier, ["personal_property_value"], `Rounded ${usd(p.personal_property_value)} up to the nearest Harbor tier.`, true);
  }

  if (p.has_dog === undefined) m.missing("pets", "Not in the customer profile.");
  else if (p.has_dog) {
    m.converted("pets", ["Dog"], ["has_dog"], "We only know about a dog; add any other pets.", true);
    const breeds = optionsOf("dog_breed") as string[];
    if (!p.dog_breed) m.missing("dog_breed", "Breed not provided in the customer profile.");
    else if (breeds.includes(p.dog_breed)) m.mapped("dog_breed", p.dog_breed, ["dog_breed"]);
    else m.converted("dog_breed", "Other", ["dog_breed"], `"${p.dog_breed}" isn't a Harbor option, so it maps to "Other".`);
  } else m.converted("pets", ["None"], ["has_dog"], "Your profile says no dog. Add any cats or other pets.", true);

  // 3-year claims history vs carrier specific 5 years claim
  m.missing("claims_last_5_years", "Your profile covers 3 years of claims; Harbor asks about 5.");

  const sprinklers = p.extensions.building_has_sprinklers;
  typeof sprinklers === "boolean"
    ? m.mapped("building_has_sprinklers", sprinklers, ["extensions.building_has_sprinklers"])
    : m.missing("building_has_sprinklers", "Not available in the customer profile.");

  return m.result();
}
