import { redirect } from "next/navigation";

export default function AdminWalletsRedirectPage() {
  redirect("/admin/gaswallet");
}
