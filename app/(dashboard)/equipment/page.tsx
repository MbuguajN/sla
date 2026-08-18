import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canViewEquipment, getCurrentUser } from "@/lib/permissions";
import { EquipmentStatus } from "@prisma/client";
import EquipmentClient from "./EquipmentClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

type SeedItem = {
  make: string;
  model: string;
  ownerLabel: string;
  status: string;
  serialNumber: string;
};

const DEFAULT_LAPTOPS: SeedItem[] = [
  { make: "Asus", model: "ZenBook UX325EA_UX325EA", ownerLabel: "5DM", status: "In Use", serialNumber: "M9N0LP00J91936F" },
  { make: "Asus", model: "ZenBook UX325EA_UX325EA", ownerLabel: "5DM", status: "In Use", serialNumber: "M8N0LP00J824319" },
  { make: "Apple", model: "iMac", ownerLabel: "5DM", status: "Not in Use", serialNumber: "C02JXAKRDNCV" },
  { make: "Asus", model: "iBUYPOWER pc", ownerLabel: "5DM", status: "In Use", serialNumber: "To be filled by O.E.M." },
  { make: "Asus", model: "Asus X415", ownerLabel: "5DM", status: "Maintenance", serialNumber: "254D8F65-B56E-4F46-9879-D5798297689" },
  { make: "Apple", model: "Macbook air m2", ownerLabel: "5DM", status: "In Use", serialNumber: "W4X9KKG3DC" },
  { make: "Asus", model: "Zenbook UX3402ZA_Q409ZA", ownerLabel: "5DM", status: "In Use", serialNumber: "NBN0LP00N517452" },
  { make: "HP", model: "Dell Latitude E7470", ownerLabel: "5DM", status: "Not in Use", serialNumber: "B1D39BC2-9291-422A-9FD5-00B3E43F8F2C" },
  { make: "Asus", model: "ROG Strix G513RC_G513RC", ownerLabel: "5DM", status: "In Use", serialNumber: "N2NRKD002650088" },
  { make: "Asus", model: "ROG Strix G513RC_G513RC", ownerLabel: "5DM", status: "In Use", serialNumber: "2FC4B3B8-43B6-408C-A443-F1FE54CE0458" },
  { make: "Apple", model: "Macbook Pro", ownerLabel: "5DM", status: "Maintenance", serialNumber: "C022CK2P3Y2" },
  { make: "Apple", model: "macbook air 15", ownerLabel: "5DM", status: "In Use", serialNumber: "V0W7NQXK26" },
  { make: "Apple", model: "macbook air m2", ownerLabel: "5DM", status: "Not in Use", serialNumber: "W76FM23LQW" },
  { make: "Apple", model: "macbook air 15", ownerLabel: "5DM", status: "In Use", serialNumber: "F7Y7H7JQ7L" },
  { make: "Apple", model: "macbook pro m1", ownerLabel: "5DM", status: "In Use", serialNumber: "CO2GK38DQ05D" },
  { make: "Apple", model: "macbook air 15", ownerLabel: "5DM", status: "In Use", serialNumber: "D4Y3RVPJX4" },
  { make: "Apple", model: "macbook pro", ownerLabel: "5DM", status: "In Use", serialNumber: "CO2SXZ15GTFJ" },
  { make: "Asus", model: "Asus vivobook", ownerLabel: "5DM", status: "Not in Use", serialNumber: "FC8A40D1-E68A-4499-85F3-7EF01EA16385" },
  { make: "Asus", model: "Asus X415", ownerLabel: "5DM", status: "In Use", serialNumber: "N3NOCV07T68110A" },
  { make: "Asus", model: "Asus vivobook", ownerLabel: "5DM", status: "In Use", serialNumber: "R5N0LP039187216" },
  { make: "Asus", model: "Asus Vivibook 11'", ownerLabel: "5DM", status: "In use", serialNumber: "M7N0CX03F83927B" },
  { make: "Asus", model: "Asus Zephyrus", ownerLabel: "5DM", status: "In use", serialNumber: "N9NRKDO14702389" },
  { make: "HP", model: "HP prodesk", ownerLabel: "5DM", status: "In use", serialNumber: "CZC6349JVP" },
  { make: "HP", model: "HP EliteBook 840 G6", ownerLabel: "5DM", status: "In use", serialNumber: "5CG041BPGW" },
  { make: "Apple", model: "Mackbook air m1", ownerLabel: "5DM", status: "In use", serialNumber: "HXJMLK7J1WFV" },
  { make: "Dell", model: "latitude 7420", ownerLabel: "5DM", status: "Not In use", serialNumber: "9P863J3" },
  { make: "Dell", model: "latitude 7421", ownerLabel: "5DM", status: "In use", serialNumber: "2K713J3" },
  { make: "Apple", model: "MacBook M1", ownerLabel: "5DM", status: "In use", serialNumber: "FVFMQC691WFV" },
  { make: "Dell", model: "", ownerLabel: "5DM", status: "In use", serialNumber: "" },
  { make: "Dell", model: "", ownerLabel: "5DM", status: "In use", serialNumber: "" },
];

function normalizeStatus(value: string): EquipmentStatus {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (cleaned.includes("MAINTENANCE")) return EquipmentStatus.MAINTENANCE;
  if (cleaned.includes("NOT")) return EquipmentStatus.NOT_IN_USE;
  if (cleaned.includes("RETIRED")) return EquipmentStatus.RETIRED;
  return EquipmentStatus.IN_USE;
}

async function ensureEquipmentSeed() {
  const count = await db.equipmentItem.count();
  if (count > 0) return;

  const laptopCategory = await db.equipmentCategory.upsert({
    where: { name: "Laptops" },
    update: {},
    create: { name: "Laptops" },
  });

  await db.equipmentItem.createMany({
    data: DEFAULT_LAPTOPS.map((item) => ({
      categoryId: laptopCategory.id,
      make: item.make.trim() || "Unknown",
      model: item.model.trim() || "Pending Details",
      ownerLabel: item.ownerLabel.trim() || "5DM",
      status: normalizeStatus(item.status),
      serialNumber: item.serialNumber.trim() || "Pending Details",
    })),
  });
}

export default async function EquipmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = await canViewEquipment({ id: user.id, role: user.role });
  if (!hasAccess) redirect("/dashboard");

  await ensureEquipmentSeed();

  const [categories, items, viewers, users] = await Promise.all([
    db.equipmentCategory.findMany({ orderBy: { name: "asc" } }),
    db.equipmentItem.findMany({
      include: {
        category: true,
        ownerUser: { select: { id: true, name: true, email: true } },
        specs: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    user.role === "ADMIN"
      ? db.equipmentViewer.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, isActive: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    user.role === "ADMIN"
      ? db.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <EquipmentClient
        currentUserRole={user.role}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        items={items.map((i) => ({
          id: i.id,
          categoryId: i.categoryId,
          categoryName: i.category.name,
          make: i.make,
          model: i.model,
          ownerUserId: i.ownerUserId,
          ownerUserName: i.ownerUser?.name || null,
          ownerLabel: i.ownerLabel,
          status: i.status,
          serialNumber: i.serialNumber || "",
          createdAt: i.createdAt.toISOString(),
          specs: i.specs.map((s) => ({ specType: s.specType, specValue: s.specValue })),
        }))}
        viewers={viewers.map((v) => ({
          userId: v.userId,
          name: v.user.name,
          email: v.user.email,
          isActive: v.user.isActive,
        }))}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        }))}
      />
    </>
  );
}
