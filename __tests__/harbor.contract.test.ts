import { describeAdapterContract, type Fixture } from "@/lib/core/contract";
import { harborAdapter } from "@/lib/carriers/harbor";
import { MAYA, SAM } from "./helpers";

const NOW = new Date("2026-06-01T12:00:00Z");
const maya = (o: object) => ({ ...MAYA, ...o });

const fixtures: Fixture[] = [
  { name: "Sample A (Maya)", profile: MAYA, eligible: true,
    mapped: { applicant_full_name: "Maya Torres", date_of_birth: "03/12/1994", contact_email: "maya@example.com", residence_state: "Oregon", postal_code: "97205", contents_coverage: 50000, pets: ["Dog"], dog_breed: "Labrador" },
    unmapped: ["phone", "claims_last_5_years", "building_has_sprinklers"] },
  { name: "Sample B (Sam): fails age AND state", profile: SAM, eligible: false, reasons: [/at least 21/, /NV/] },
  { name: "age boundary: turns 21 today", profile: maya({ date_of_birth: "2005-06-01" }), now: NOW, eligible: true },
  { name: "age boundary: turns 21 tomorrow", profile: maya({ date_of_birth: "2005-06-02" }), now: NOW, eligible: false, reasons: [/at least 21/] },
  { name: "coverage boundary: exactly a tier", profile: maya({ personal_property_value: 10000 }), eligible: true, mapped: { contents_coverage: 10000 } },
  { name: "coverage boundary: just above a tier", profile: maya({ personal_property_value: 10001 }), eligible: true, mapped: { contents_coverage: 25000 } },
  { name: "coverage boundary: top tier", profile: maya({ personal_property_value: 75000 }), eligible: true, mapped: { contents_coverage: 75000 } },
  { name: "coverage boundary: above top tier", profile: maya({ personal_property_value: 75001 }), eligible: false, reasons: [/maximum contents coverage/], unmapped: ["contents_coverage"] },
  { name: "unknown data is pending, not rejected", profile: { version: 1, first_name: "Pat", extensions: {} }, eligible: true,
    pending: ["date_of_birth", "residence_state", "contents_coverage"], unmapped: ["applicant_full_name", "pets", "contact_email", "postal_code"] },
  { name: "unknown has_dog is not assumed", profile: { ...MAYA, has_dog: undefined, dog_breed: undefined }, eligible: true, unmapped: ["pets"] },
  { name: "no dog -> None, no breed question", profile: maya({ has_dog: false, dog_breed: undefined }), eligible: true, mapped: { pets: ["None"] } },
  { name: "dog without breed", profile: maya({ dog_breed: undefined }), eligible: true, unmapped: ["dog_breed"] },
  { name: "unlisted breed maps to Other", profile: maya({ dog_breed: "Poodle" }), eligible: true, mapped: { dog_breed: "Other" } },
  { name: "3-year claims never become 5-year claims", profile: maya({ claims_last_3_years: 4 }), eligible: true, unmapped: ["claims_last_5_years"] },
  { name: "extension fills sprinklers", profile: maya({ extensions: { building_has_sprinklers: true } }), eligible: true, mapped: { building_has_sprinklers: true } },
  { name: "partial name is not a legal name", profile: maya({ last_name: undefined }), eligible: true, unmapped: ["applicant_full_name"] },
];

describeAdapterContract(harborAdapter, fixtures, "9798041f90420a4f");
