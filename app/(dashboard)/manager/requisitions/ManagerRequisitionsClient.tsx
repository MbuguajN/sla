"use client";

import { Receipt } from "lucide-react";

type Requisition = {
  id: number;
  title: string;
  totalAmount: number;
  status: string;
  user: { name: string };
  items: Array<{ itemName: string; quantity: number; unitPrice: number }>;
};

interface Props {
  initialRequisitions: Requisition[];
}

export default function ManagerRequisitionsClient({ initialRequisitions }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Receipt className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Requisitions</h1>
          <p className="text-sm text-gray-500">Review and approve team member requests</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-900 font-bold text-lg">Manager Approval Simplified</p>
        <p className="text-gray-500 font-medium mt-2">All team requisitions now go directly to Finance for review. Managers are no longer part of the approval workflow.</p>
        <p className="text-xs text-gray-400 mt-3">This change streamlines the procurement process for faster approvals.</p>
      </div>
    </div>
  );
}
