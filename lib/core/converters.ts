/** Reusable, carrier-agnostic converters.
 *  Carrier-specific decisions stay in each carrier's mapping file. */
export const STATE_NAMES: Record<string, string> = Object.fromEntries(
    "AL:Alabama,AK:Alaska,AZ:Arizona,AR:Arkansas,CA:California,CO:Colorado,CT:Connecticut,DE:Delaware,DC:District of Columbia,FL:Florida,GA:Georgia,HI:Hawaii,ID:Idaho,IL:Illinois,IN:Indiana,IA:Iowa,KS:Kansas,KY:Kentucky,LA:Louisiana,ME:Maine,MD:Maryland,MA:Massachusetts,MI:Michigan,MN:Minnesota,MS:Mississippi,MO:Missouri,MT:Montana,NE:Nebraska,NV:Nevada,NH:New Hampshire,NJ:New Jersey,NM:New Mexico,NY:New York,NC:North Carolina,ND:North Dakota,OH:Ohio,OK:Oklahoma,OR:Oregon,PA:Pennsylvania,RI:Rhode Island,SC:South Carolina,SD:South Dakota,TN:Tennessee,TX:Texas,UT:Utah,VT:Vermont,VA:Virginia,WA:Washington,WV:West Virginia,WI:Wisconsin,WY:Wyoming"
        .split(",").map((p) => p.split(":") as [string, string])
);
export const isoToUsDate = (iso: string): string => { const [y, m, d] = iso.split("-"); return `${m}/${d}/${y}`; };
export const smallestTierAtLeast = (value: number, tiers: number[]): number | undefined => [...tiers].sort((a, b) => a - b).find((t) => t >= value);
export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
