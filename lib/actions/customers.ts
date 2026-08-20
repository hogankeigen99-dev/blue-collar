"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createCustomer(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.customer.create({
    data: {
      organizationId: user.organizationId,
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/customers");
  redirect("/customers");
}
