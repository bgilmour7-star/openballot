import { locate } from "@/app/actions";
export default function PostalForm({ refId, postal, id = "postal", cta = "See my ballot" }: { refId?: string; postal?: string; id?: string; cta?: string }) {
  return (
    <form action={locate} className="postal-form">
      <label htmlFor={id} className="sr-only">Your postal code</label>
      <input type="hidden" name="ref" value={refId ?? ""} />
      <input id={id} name="postal" type="text" autoComplete="postal-code" placeholder="Postal code, e.g. V9R 5J9" maxLength={7} required defaultValue={postal ?? ""} />
      <button className="btn">{cta}</button>
    </form>
  );
}
