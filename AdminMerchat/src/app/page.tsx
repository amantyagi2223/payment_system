import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value;
  const adminToken = cookieStore.get("auth_token")?.value;
  const merchantApiKey = cookieStore.get("auth_merchant_api_key")?.value;
  const merchantToken = cookieStore.get("auth_merchant_token")?.value;

  if (role === "admin" && adminToken) {
    redirect("/admin/dashboard");
  }

  if (role === "merchant" && (merchantToken || merchantApiKey)) {
    redirect("/merchant/dashboard");
  }

  redirect("/login");
}
