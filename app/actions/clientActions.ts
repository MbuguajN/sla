"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canOnboardClient, canViewClients, canCloseClient } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getClients() {
  const user = await getCurrentUser();
  if (!user || !canViewClients(user)) {
    throw new Error("Unauthorized");
  }

  return db.client.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(clientId: number) {
  const user = await getCurrentUser();
  if (!user || !canViewClients(user)) {
    throw new Error("Unauthorized");
  }

  return db.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        include: {
          departments: { include: { department: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createClient(data: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  description?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !canOnboardClient(user)) {
    throw new Error("Unauthorized - Only Business Development can onboard clients");
  }

  const client = await db.client.create({
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      description: data.description || null,
      createdBy: user.id,
    },
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClient(
  clientId: number,
  data: {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    description?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || !canOnboardClient(user)) {
    throw new Error("Unauthorized");
  }

  const client = await db.client.update({
    where: { id: clientId },
    data: {
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      description: data.description,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return client;
}

export async function deleteClient(clientId: number) {
  const user = await getCurrentUser();
  if (!user || !canOnboardClient(user)) {
    throw new Error("Unauthorized");
  }

  await db.client.delete({ where: { id: clientId } });
  revalidatePath("/clients");
}

export async function closeClient(clientId: number) {
  const user = await getCurrentUser();
  if (!user || !canCloseClient(user)) {
    throw new Error("Unauthorized - Only Business Development can close clients");
  }

  const client = await db.client.update({
    where: { id: clientId },
    data: {
      status: "CLOSED",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return client;
}

export async function addClientDocument(clientId: number, name: string, url: string) {
  const user = await getCurrentUser();
  if (!user || !canOnboardClient(user)) {
    throw new Error("Unauthorized");
  }

  const doc = await db.clientDocument.create({
    data: { clientId, name, url },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return doc;
}

export async function deleteClientDocument(docId: number) {
  const user = await getCurrentUser();
  if (!user || !canOnboardClient(user)) {
    throw new Error("Unauthorized");
  }

  await db.clientDocument.delete({ where: { id: docId } });
  revalidatePath("/clients");
}
