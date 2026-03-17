"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequisition } from "@/app/actions/financeActions";
import { Receipt, Plus, X, AlertCircle, Trash2 } from "lucide-react";
import {
  Card,
  CardBody,
  Badge,
  Button,
  Input,
  Textarea,
  FormGroup,
  Alert,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/daisy-components";

type ReqItem = { id: number; itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean };
type RequisitionItem = {
  id: number;
  title: string;
  reason: string;
  totalAmount: number;
  status: string;
  managerNote: string | null;
  financeNote: string | null;
  ceoNote: string | null;
  items: ReqItem[];
  createdAt: string;
};

interface Props {
  initialRequisitions: RequisitionItem[];
}

export default function RequisitionsClient({ initialRequisitions }: Props) {
  const router = useRouter();
  const [requisitions] = useState(initialRequisitions);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    reason: "",
    items: [{ itemName: "", quantity: 1, unitPrice: 0, vatInclusive: false }] as { itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean }[],
  });

  const statusToBadgeVariant: Record<string, string> = {
    PENDING_MANAGER: "warning",
    PENDING_FINANCE: "info",
    PENDING_CEO: "primary",
    APPROVED: "success",
    DENIED: "error",
  };

  const statusLabels: Record<string, string> = {
    PENDING_MANAGER: "Pending Manager",
    PENDING_FINANCE: "Pending Finance",
    PENDING_CEO: "Pending CEO",
    APPROVED: "Approved",
    DENIED: "Denied",
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { itemName: "", quantity: 1, unitPrice: 0, vatInclusive: false }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const total = formData.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.some((i) => !i.itemName)) { setError("All items need a name"); return; }
    setLoading(true);
    setError("");

    try {
      await createRequisition({
        title: formData.title,
        reason: formData.reason,
        items: formData.items,
      });
      setShowModal(false);
      setFormData({ title: "", reason: "", items: [{ itemName: "", quantity: 1, unitPrice: 0, vatInclusive: false }] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <Receipt className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Requisitions</h1>
            <p className="text-sm text-gray-500">{requisitions.length} requests</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowModal(true);
            setError("");
          }}
        >
          <Plus className="h-4 w-4" />
          New Requisition
        </Button>
      </div>

      <div className="space-y-3">
        {requisitions.map((r) => (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardBody>
              <div
                onClick={() =>
                  setExpandedId(expandedId === r.id ? null : r.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {r.title}
                      </h3>
                      <Badge
                        variant={statusToBadgeVariant[r.status]}
                      >
                        {statusLabels[r.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {r.reason}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 ml-4">
                    R{r.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {expandedId === r.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Table>
                    <TableHead>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Price</TableHeader>
                      <TableHeader>Total</TableHeader>
                    </TableHead>
                    <TableBody>
                      {r.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.itemName}
                            {item.vatInclusive && (
                              <span className="text-xs text-gray-400 ml-1">
                                (VAT)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            R{item.unitPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            R
                            {(
                              item.quantity * item.unitPrice
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    {r.managerNote && <p>Manager: {r.managerNote}</p>}
                    {r.financeNote && <p>Finance: {r.financeNote}</p>}
                    {r.ceoNote && <p>CEO: {r.ceoNote}</p>}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}

        {requisitions.length === 0 && (
          <Card>
            <CardBody className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">No requisitions</p>
            </CardBody>
          </Card>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <Card className="relative w-full max-w-lg mx-4 z-50 max-h-[90vh] overflow-y-auto">
            <CardBody>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">New Requisition</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {error && (
                <Alert variant="error" className="mb-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormGroup label="Title">
                  <Input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </FormGroup>
                <FormGroup label="Reason">
                  <Textarea
                    required
                    value={formData.reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    rows={2}
                  />
                </FormGroup>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs text-[#c91f41] font-medium hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                        <Input
                          type="text"
                          placeholder="Item name"
                          value={item.itemName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(i, "itemName", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(i, "quantity", parseInt(e.target.value) || 1)
                          }
                          placeholder="Qty"
                          className="w-16"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          placeholder="Price"
                          className="w-24"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={item.vatInclusive}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateItem(i, "vatInclusive", e.target.checked)
                            }
                            className="w-3 h-3 text-[#c91f41] rounded border-gray-300"
                          />
                          VAT
                        </label>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-right text-sm font-semibold text-gray-900 mt-2">
                    Total: R{total.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Requisition"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
