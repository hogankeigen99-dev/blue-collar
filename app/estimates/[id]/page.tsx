import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  addLineItem,
  removeLineItem,
  updateEstimateStatus,
  convertEstimateToProject,
} from "@/lib/actions/estimates";

const STATUSES = ["DRAFT", "SENT", "APPROVED", "REJECTED"] as const;

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { customer: true, lead: true, lineItems: { orderBy: { position: "asc" } }, project: true },
  });
  if (!estimate) notFound();

  const total = estimate.lineItems.reduce(
    (sum, li) => sum + Number(li.quantity) * Number(li.unitPrice),
    0
  );

  async function addItem(formData: FormData) {
    "use server";
    await addLineItem(id, formData);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/estimates" className="text-sm text-slate-500 hover:underline">
          ← Estimates
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-semibold">{estimate.title}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
            {estimate.status}
          </span>
        </div>
        {estimate.customer && (
          <p className="text-slate-500 text-sm mt-1">For {estimate.customer.name}</p>
        )}
        {estimate.lead && (
          <p className="text-slate-500 text-sm">
            From lead{" "}
            <Link href={`/leads/${estimate.leadId}`} className="text-blue-600 hover:underline">
              {estimate.lead.name}
            </Link>
          </p>
        )}
      </div>

      {estimate.project ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          Converted to project{" "}
          <Link href={`/projects/${estimate.projectId}`} className="text-blue-600 hover:underline">
            {estimate.project.title}
          </Link>
          .
        </div>
      ) : (
        estimate.status === "APPROVED" && (
          <form action={convertEstimateToProject.bind(null, estimate.id)}>
            <button
              type="submit"
              className="bg-green-600 text-white text-sm px-4 py-2 rounded-md hover:bg-green-700"
            >
              Convert to project
            </button>
          </form>
        )
      )}

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div>
          <div className="text-sm font-medium text-slate-500 mb-2">Line items</div>
          {estimate.lineItems.length === 0 ? (
            <p className="text-sm text-slate-500">No line items yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {estimate.lineItems.map((li) => (
                  <tr key={li.id} className="border-b last:border-0">
                    <td className="py-2">{li.description}</td>
                    <td className="py-2 text-right text-slate-500">{Number(li.quantity)}</td>
                    <td className="py-2 text-right text-slate-500">
                      ${Number(li.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      ${(Number(li.quantity) * Number(li.unitPrice)).toFixed(2)}
                    </td>
                    <td className="py-2 pl-2">
                      <form action={removeLineItem.bind(null, estimate.id, li.id)}>
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-2 text-right font-medium">
                    Total
                  </td>
                  <td className="pt-2 text-right font-semibold">${total.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <form action={addItem} className="flex flex-wrap gap-2 items-end pt-2 border-t">
          <div className="flex-1 min-w-[8rem]">
            <label className="block text-xs font-medium mb-1">Description</label>
            <input name="description" required className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium mb-1">Qty</label>
            <input
              name="quantity"
              type="number"
              step="0.01"
              defaultValue={1}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium mb-1">Unit price</label>
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              defaultValue={0}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded-md hover:bg-slate-700"
          >
            Add
          </button>
        </form>

        <div className="pt-4 border-t">
          <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
          <form action={updateEstimateStatus.bind(null, estimate.id)} className="flex items-center gap-2">
            <select name="status" defaultValue={estimate.status} className="border rounded-md px-3 py-2 text-sm">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-900 text-white text-sm px-3 py-2 rounded-md hover:bg-slate-700"
            >
              Update
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
