import { redirect } from "next/navigation";

export default function VisitsRedirect() {
  redirect("/appointments");
}
