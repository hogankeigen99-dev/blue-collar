"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import { createCustomerSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
  const user = await requireUser();
  const data = parseForm(createCustomerSchema, formData);

  await prisma.customer.create({
    data: { organizationId: user.organizationId, ...data },
  });

  revalidatePath("/customers");
  redirect("/customers");
}
