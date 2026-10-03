import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function token(len = 24) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding RepairFlow demo data…");

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "RepairFlow Service Center",
      address: "12 MG Road, Ranchi, Jharkhand 834001",
      phone: "+91 98765 43210",
      whatsappNumber: "+91 98765 43210",
      email: "support@repairflow.demo",
      gstNumber: "20ABCDE1234F1Z5",
      invoicePrefix: "INV",
      jobPrefix: "JOB",
      currency: "INR",
      defaultTaxPercent: 18,
      defaultWarrantyDays: 90,
      autoSendWhatsAppOnStatus: false,
    },
  });

  // ---------------------------------------------------------------------
  // WhatsApp templates
  // ---------------------------------------------------------------------
  const templates: { key: string; name: string; body: string }[] = [
    {
      key: "JOB_RECEIVED",
      name: "Job Received",
      body:
        "Hello {{customerName}}, your {{deviceBrand}} {{deviceModel}} has been received for service.\n\nService ID: {{jobNumber}}\nCurrent Status: Received\n\nWe will update you once diagnosis is completed.\n— {{companyName}}",
    },
    {
      key: "DIAGNOSIS_COMPLETE",
      name: "Diagnosis Completed",
      body:
        "Hello {{customerName}},\n\nYour laptop diagnosis has been completed.\nIssue: {{diagnosisSummary}}\nEstimated Repair Cost: {{estimatedCost}}\n\nPlease contact us for approval.\nService ID: {{jobNumber}}",
    },
    {
      key: "ESTIMATE_SENT",
      name: "Estimate Sent",
      body:
        "Hi {{customerName}}, your repair estimate for {{jobNumber}} is ready: {{estimatedCost}}.\nReply or visit us to approve, reject, or ask for more time.\n— {{companyName}}",
    },
    {
      key: "REPAIR_STARTED",
      name: "Repair Started",
      body:
        "Your laptop repair has started.\n\nService ID: {{jobNumber}}\nExpected completion: {{expectedDate}}\n— {{companyName}}",
    },
    {
      key: "READY_FOR_PICKUP",
      name: "Ready for Pickup",
      body:
        "🎉 Your laptop is ready for collection.\n\nService ID: {{jobNumber}}\nPending Amount: {{pendingAmount}}\n\nThank you!\n— {{companyName}}",
    },
    {
      key: "DELIVERED",
      name: "Delivered",
      body:
        "Thank you for choosing us. Your laptop has been successfully delivered.\n\nService ID: {{jobNumber}}\n— {{companyName}}",
    },
    {
      key: "PAYMENT_REMINDER",
      name: "Payment Reminder",
      body:
        "Hi {{customerName}}, a friendly reminder that {{pendingAmount}} is pending for service {{jobNumber}}. Please clear it at your convenience.\n— {{companyName}}",
    },
    {
      key: "STATUS_LINK",
      name: "Status Check Link",
      body:
        "Hi {{customerName}} 👋\n\nYou can check your laptop's service status anytime here:\n{{statusLink}}\n\nService ID: {{jobNumber}}",
    },
    {
      key: "CUSTOM",
      name: "Custom Message",
      body: "Hi {{customerName}}, ",
    },
  ];
  for (const t of templates) {
    await prisma.whatsAppTemplate.upsert({ where: { key: t.key }, update: {}, create: t });
  }

  // ---------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------
  async function makeUser(name: string, email: string, role: string, password: string, phone: string) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role, phone, passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  const admin = await makeUser("Krishna Sharma", "admin@repairflow.demo", "ADMIN", "Admin@123", "+91 90000 00001");
  const manager = await makeUser(
    "Priya Verma",
    "manager@repairflow.demo",
    "SERVICE_MANAGER",
    "Manager@123",
    "+91 90000 00002"
  );
  const tech1 = await makeUser("Rohan Gupta", "tech@repairflow.demo", "TECHNICIAN", "Tech@123", "+91 90000 00003");
  const tech2 = await makeUser(
    "Sneha Kumari",
    "sneha.tech@repairflow.demo",
    "TECHNICIAN",
    "Tech@123",
    "+91 90000 00004"
  );
  const frontdesk = await makeUser(
    "Aman Singh",
    "frontdesk@repairflow.demo",
    "FRONT_DESK",
    "Front@123",
    "+91 90000 00005"
  );

  // ---------------------------------------------------------------------
  // Parts / Inventory
  // ---------------------------------------------------------------------
  const partDefs = [
    { name: "Kingston 8GB DDR4 RAM", category: "RAM", brand: "Kingston", quantity: 14, minStock: 5, purchasePrice: 1400, sellingPrice: 1900 },
    { name: "Crucial 512GB SSD", category: "SSD", brand: "Crucial", quantity: 1, minStock: 4, purchasePrice: 2650, sellingPrice: 3400 },
    { name: "Seagate 1TB HDD", category: "HDD", brand: "Seagate", quantity: 6, minStock: 3, purchasePrice: 2200, sellingPrice: 2800 },
    { name: "HP 15 Laptop Keyboard", category: "KEYBOARD", brand: "HP", model: "15-series", quantity: 2, minStock: 3, purchasePrice: 950, sellingPrice: 1500 },
    { name: "Dell Inspiron 15.6\" Display Panel", category: "DISPLAY", brand: "Dell", quantity: 3, minStock: 2, purchasePrice: 3200, sellingPrice: 4500 },
    { name: "Lenovo ThinkPad Battery (6-cell)", category: "BATTERY", brand: "Lenovo", quantity: 5, minStock: 3, purchasePrice: 2100, sellingPrice: 2900 },
    { name: "65W Universal Charger", category: "CHARGER", brand: "Generic", quantity: 0, minStock: 4, purchasePrice: 550, sellingPrice: 900 },
    { name: "Type-C 90W Adapter", category: "ADAPTER", brand: "Generic", quantity: 7, minStock: 3, purchasePrice: 700, sellingPrice: 1100 },
    { name: "Laptop Cooling Fan (Dell)", category: "FAN", brand: "Dell", quantity: 4, minStock: 2, purchasePrice: 450, sellingPrice: 750 },
    { name: "Thermal Paste (Arctic MX-4)", category: "THERMAL_PASTE", brand: "Arctic", quantity: 9, minStock: 4, purchasePrice: 250, sellingPrice: 500 },
    { name: "HDMI Port Connector", category: "CONNECTOR", brand: "Generic", quantity: 6, minStock: 3, purchasePrice: 180, sellingPrice: 350 },
    { name: "Windows 11 Pro License", category: "SOFTWARE", brand: "Microsoft", quantity: 20, minStock: 5, purchasePrice: 6500, sellingPrice: 8500 },
    { name: "Laptop Sleeve Bag 15.6\"", category: "ACCESSORY", brand: "Generic", quantity: 10, minStock: 3, purchasePrice: 300, sellingPrice: 600 },
  ];
  const parts = [];
  for (const p of partDefs) {
    parts.push(
      await prisma.part.create({
        data: { ...p, location: "Main Store", rack: "R-" + Math.ceil(Math.random() * 6), purchaseDate: daysAgo(30) },
      })
    );
  }
  const [ram8gb, ssd512, , hpKeyboard, dellDisplay, , charger65w] = parts;

  // ---------------------------------------------------------------------
  // Suppliers + supplier product comparison
  // ---------------------------------------------------------------------
  const supplierA = await prisma.supplier.create({
    data: {
      name: "TechParts Wholesale",
      company: "TechParts Wholesale Pvt Ltd",
      contactPerson: "Anil Mehta",
      mobile: "+91 98100 11111",
      whatsapp: "+91 98100 11111",
      email: "sales@techpartswholesale.example",
      address: "Nehru Place",
      city: "Delhi",
      gst: "07AAACT1234F1Z8",
      paymentTerms: "Net 15",
    },
  });
  const supplierB = await prisma.supplier.create({
    data: {
      name: "EastTech Distributors",
      company: "EastTech Distributors",
      contactPerson: "Sourav Das",
      mobile: "+91 98300 22222",
      whatsapp: "+91 98300 22222",
      email: "orders@easttech.example",
      address: "Camac Street",
      city: "Kolkata",
      gst: "19AACCE5678F1Z3",
      paymentTerms: "Advance",
    },
  });
  const supplierC = await prisma.supplier.create({
    data: {
      name: "Ranchi Computer Hub",
      company: "Ranchi Computer Hub",
      contactPerson: "Vikas Oraon",
      mobile: "+91 94310 33333",
      whatsapp: "+91 94310 33333",
      email: "hub.ranchi@example.com",
      address: "Main Road",
      city: "Ranchi",
      paymentTerms: "Cash on Delivery",
    },
  });

  await prisma.supplierProduct.createMany({
    data: [
      { supplierId: supplierA.id, partId: ssd512.id, price: 2800, availability: "AVAILABLE", location: "Delhi", deliveryEstimate: "2 Days" },
      { supplierId: supplierB.id, partId: ssd512.id, price: 2650, availability: "AVAILABLE", location: "Kolkata", deliveryEstimate: "3 Days" },
      { supplierId: supplierC.id, partId: ssd512.id, price: 2950, availability: "AVAILABLE", location: "Ranchi", deliveryEstimate: "Same Day" },
      { supplierId: supplierA.id, partId: charger65w.id, price: 520, availability: "AVAILABLE", location: "Delhi", deliveryEstimate: "2 Days" },
      { supplierId: supplierC.id, partId: charger65w.id, price: 580, availability: "AVAILABLE", location: "Ranchi", deliveryEstimate: "Same Day" },
      { supplierId: supplierA.id, partId: hpKeyboard.id, price: 900, availability: "AVAILABLE", location: "Delhi", deliveryEstimate: "2 Days" },
    ],
  });

  // A received purchase order (already reflected in the stock numbers above)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-00001",
      supplierId: supplierB.id,
      orderDate: daysAgo(20),
      invoiceNumber: "ETD-8841",
      status: "RECEIVED",
      taxAmount: 450,
      shippingAmount: 150,
      totalAmount: 2650 * 4 + 450 + 150,
      paymentStatus: "PAID",
      receivedDate: daysAgo(17),
      createdById: manager.id,
    },
  });
  await prisma.purchaseOrderItem.create({
    data: { purchaseOrderId: po1.id, partId: ssd512.id, quantity: 4, unitCost: 2650, total: 2650 * 4 },
  });
  await prisma.inventoryMovement.create({
    data: { partId: ssd512.id, type: "PURCHASE", quantity: 4, note: "PO-2026-00001 received", createdById: manager.id },
  });

  // A pending purchase order (for the low-stock -> purchase flow demo)
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-00002",
      supplierId: supplierA.id,
      orderDate: daysAgo(1),
      status: "ORDERED",
      taxAmount: 90,
      shippingAmount: 100,
      totalAmount: 520 * 6 + 90 + 100,
      paymentStatus: "UNPAID",
      createdById: admin.id,
    },
  });
  await prisma.purchaseOrderItem.create({
    data: { purchaseOrderId: po2.id, partId: charger65w.id, quantity: 6, unitCost: 520, total: 520 * 6 },
  });

  // ---------------------------------------------------------------------
  // Customers + devices
  // ---------------------------------------------------------------------
  const customerDefs = [
    { name: "Rahul Mehta", mobile: "9876543210", email: "rahul.mehta@example.com", address: "Ashok Nagar, Ranchi" },
    { name: "Anjali Sinha", mobile: "9123456780", email: "anjali.sinha@example.com", address: "Doranda, Ranchi" },
    { name: "Vikas Kumar", mobile: "9988776655", email: "vikas.kumar@example.com", address: "Lalpur, Ranchi" },
    { name: "Sunita Devi", mobile: "9871234560", email: "", address: "Kanke Road, Ranchi" },
    { name: "Manoj Tiwari", mobile: "9012345678", email: "manoj.tiwari@example.com", address: "Harmu, Ranchi" },
    { name: "Divya Prakash", mobile: "9765432109", email: "divya.prakash@example.com", address: "Bariatu, Ranchi" },
  ];
  const customers = [];
  let ci = 1;
  for (const c of customerDefs) {
    customers.push(
      await prisma.customer.create({
        data: {
          customerCode: `CUST-${String(ci++).padStart(5, "0")}`,
          name: c.name,
          mobile: c.mobile,
          whatsapp: c.mobile,
          email: c.email || null,
          address: c.address,
        },
      })
    );
  }
  const [rahul, anjali, vikas, sunita, manoj, divya] = customers;

  const deviceDefs: Record<string, { brand: string; model: string; serial: string; os: string; cpu: string; ram: string; storage: string }> = {
    rahul: { brand: "HP", model: "Pavilion 15", serial: "HP15-88213", os: "Windows 11", cpu: "Intel i5 11th Gen", ram: "8GB", storage: "512GB SSD" },
    anjali: { brand: "Dell", model: "Inspiron 3511", serial: "DL3511-22190", os: "Windows 10", cpu: "Intel i3 10th Gen", ram: "4GB", storage: "1TB HDD" },
    vikas: { brand: "Lenovo", model: "ThinkPad E14", serial: "LNV-E14-77201", os: "Windows 11", cpu: "AMD Ryzen 5", ram: "16GB", storage: "512GB SSD" },
    sunita: { brand: "Asus", model: "VivoBook 15", serial: "ASUS-VB15-33012", os: "Windows 10", cpu: "Intel i3 8th Gen", ram: "4GB", storage: "1TB HDD" },
    manoj: { brand: "Acer", model: "Aspire 5", serial: "ACR-A5-99441", os: "Windows 11", cpu: "Intel i5 12th Gen", ram: "8GB", storage: "512GB SSD" },
    divya: { brand: "HP", model: "Pavilion 15", serial: "HP15-51290", os: "Windows 11", cpu: "Intel i7 11th Gen", ram: "16GB", storage: "1TB SSD" },
  };

  const devices: Record<string, Awaited<ReturnType<typeof prisma.device.create>>> = {};
  for (const [key, cust] of Object.entries({ rahul, anjali, vikas, sunita, manoj, divya })) {
    const d = deviceDefs[key];
    devices[key] = await prisma.device.create({
      data: {
        customerId: cust.id,
        deviceType: "LAPTOP",
        brand: d.brand,
        model: d.model,
        serialNumber: d.serial,
        operatingSystem: d.os,
        processor: d.cpu,
        ram: d.ram,
        storage: d.storage,
        color: "Silver",
        deviceAgeYears: 2,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Service jobs across the full status spectrum
  // ---------------------------------------------------------------------
  let jobSeq = 1;
  function jobNumber() {
    return `JOB-${new Date().getFullYear()}-${String(jobSeq++).padStart(5, "0")}`;
  }

  async function addStatusHistory(jobId: string, status: string, changedById: string, note: string, when: Date) {
    await prisma.serviceJobStatusHistory.create({
      data: { jobId, status, changedById, note, createdAt: when },
    });
  }

  const condition = (overrides: Record<string, string> = {}) =>
    JSON.stringify({
      screen: "GOOD",
      keyboard: "GOOD",
      touchpad: "GOOD",
      body: "FAIR",
      hinges: "GOOD",
      charger: "GOOD",
      battery: "FAIR",
      ports: "GOOD",
      camera: "GOOD",
      speakers: "GOOD",
      wifi: "GOOD",
      bluetooth: "GOOD",
      ...overrides,
    });

  // Job 1 — brand new, just dropped off
  const job1 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: rahul.id,
      deviceId: devices.rahul.id,
      status: "RECEIVED",
      priority: "NORMAL",
      createdByUserId: frontdesk.id,
      conditionChecklist: condition(),
      accessoriesReceived: JSON.stringify(["Charger", "Bag"]),
      quickIssues: JSON.stringify(["Not Powering On"]),
      complaintText: "Laptop does not power on at all. No lights, no fan sound.",
      expectedCompletionDate: daysFromNow(3),
      createdAt: daysAgo(0),
    },
  });
  await addStatusHistory(job1.id, "RECEIVED", frontdesk.id, "Job created at front desk.", daysAgo(0));

  // Job 2 — in diagnosis
  const job2 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: anjali.id,
      deviceId: devices.anjali.id,
      status: "REPAIR_IN_PROGRESS",
      priority: "NORMAL",
      createdByUserId: frontdesk.id,
      assignedTechnicianId: tech1.id,
      conditionChecklist: condition({ battery: "DAMAGED" }),
      accessoriesReceived: JSON.stringify(["Charger"]),
      quickIssues: JSON.stringify(["Slow Performance", "Heating"]),
      complaintText: "Laptop automatically shuts down after 20-30 minutes.",
      additionalNotes: "Customer says laptop becomes very hot.",
      expectedCompletionDate: daysFromNow(2),
      createdAt: daysAgo(1),
    },
  });
  await addStatusHistory(job2.id, "NEW", frontdesk.id, "Job created at front desk.", daysAgo(1));
  await addStatusHistory(job2.id, "RECEIVED", frontdesk.id, "Device checked in.", daysAgo(1));
  await addStatusHistory(job2.id, "DIAGNOSIS", tech1.id, "Started diagnosis.", daysAgo(0));
  await prisma.diagnosis.create({
    data: {
      jobId: job2.id,
      diagnosisText: "Cooling fan blocked and thermal paste degraded.",
      rootCause: "Dust accumulation blocking the cooling fan; dried thermal paste causing overheating shutdowns.",
      recommendedRepair: "Fan cleaning + thermal paste replacement.",
      partsRequired: JSON.stringify(["Thermal Paste (Arctic MX-4)"]),
      labourRequired: "1 hour",
      estimatedTimeHours: 2,
      estimatedCost: 1050,
      diagnosedById: tech1.id,
    },
  });

  // Job 3 — estimate sent, waiting for customer approval
  const job3 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: vikas.id,
      deviceId: devices.vikas.id,
      status: "REPAIR_IN_PROGRESS",
      priority: "HIGH",
      createdByUserId: manager.id,
      assignedTechnicianId: tech2.id,
      conditionChecklist: condition({ keyboard: "DAMAGED" }),
      accessoriesReceived: JSON.stringify(["Charger", "Mouse"]),
      quickIssues: JSON.stringify(["Keyboard Problem", "SSD/HDD Problem"]),
      complaintText: "Several keys not responding; also wants an SSD upgrade for speed.",
      expectedCompletionDate: daysFromNow(4),
      createdAt: daysAgo(3),
    },
  });
  await addStatusHistory(job3.id, "NEW", manager.id, "Job created.", daysAgo(3));
  await addStatusHistory(job3.id, "RECEIVED", frontdesk.id, "Device checked in.", daysAgo(3));
  await addStatusHistory(job3.id, "DIAGNOSIS", tech2.id, "Diagnosis started.", daysAgo(2));
  await addStatusHistory(job3.id, "ESTIMATE_SENT", tech2.id, "Estimate prepared and sent.", daysAgo(1));
  await addStatusHistory(job3.id, "WAITING_APPROVAL", tech2.id, "Awaiting customer approval.", daysAgo(1));
  await prisma.diagnosis.create({
    data: {
      jobId: job3.id,
      diagnosisText: "Keyboard membrane damaged on 6 keys; existing HDD is a bottleneck.",
      rootCause: "Liquid spill residue under keyboard membrane.",
      recommendedRepair: "Replace keyboard assembly; optional SSD upgrade for performance.",
      partsRequired: JSON.stringify(["HP 15 Laptop Keyboard", "Crucial 512GB SSD"]),
      labourRequired: "1.5 hours",
      estimatedTimeHours: 3,
      estimatedCost: 6400,
      diagnosedById: tech2.id,
    },
  });
  const est3 = await prisma.estimate.create({
    data: {
      jobId: job3.id,
      status: "SENT",
      subtotal: 6400,
      discount: 200,
      taxPercent: 18,
      taxAmount: 1116,
      total: 7316,
      sentAt: daysAgo(1),
    },
  });
  await prisma.estimateItem.createMany({
    data: [
      { estimateId: est3.id, type: "PART", description: "HP 15 Laptop Keyboard", quantity: 1, unitPrice: 1500, total: 1500, partId: hpKeyboard.id },
      { estimateId: est3.id, type: "PART", description: "Crucial 512GB SSD", quantity: 1, unitPrice: 3400, total: 3400, partId: ssd512.id },
      { estimateId: est3.id, type: "LABOUR", description: "Keyboard replacement + data migration labour", quantity: 1, unitPrice: 1500, total: 1500 },
    ],
  });

  // Job 4 — repair in progress, parts already consumed
  const job4 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: sunita.id,
      deviceId: devices.sunita.id,
      status: "REPAIR_IN_PROGRESS",
      priority: "NORMAL",
      createdByUserId: frontdesk.id,
      assignedTechnicianId: tech1.id,
      conditionChecklist: condition({ ports: "DAMAGED" }),
      accessoriesReceived: JSON.stringify(["Charger", "Adapter"]),
      quickIssues: JSON.stringify(["RAM Problem"]),
      complaintText: "Laptop hangs frequently while multitasking.",
      estimatedCost: 1900,
      approvedCost: 1900,
      advancePaid: 1000,
      expectedCompletionDate: daysFromNow(1),
      createdAt: daysAgo(4),
    },
  });
  await addStatusHistory(job4.id, "NEW", frontdesk.id, "Job created.", daysAgo(4));
  await addStatusHistory(job4.id, "RECEIVED", frontdesk.id, "Device checked in.", daysAgo(4));
  await addStatusHistory(job4.id, "DIAGNOSIS", tech1.id, "RAM diagnosed as faulty.", daysAgo(3));
  await addStatusHistory(job4.id, "ESTIMATE_SENT", tech1.id, "Estimate sent for RAM upgrade.", daysAgo(3));
  await addStatusHistory(job4.id, "APPROVED", frontdesk.id, "Customer approved over phone.", daysAgo(2));
  await addStatusHistory(job4.id, "REPAIR_IN_PROGRESS", tech1.id, "Replacing RAM module.", daysAgo(1));
  await prisma.jobPart.create({
    data: { jobId: job4.id, partId: ram8gb.id, technicianId: tech1.id, quantity: 1, unitCost: 1400, unitPrice: 1900 },
  });
  await prisma.inventoryMovement.create({
    data: { partId: ram8gb.id, type: "SERVICE_USE", quantity: -1, jobId: job4.id, createdById: tech1.id, note: `Used on ${job4.jobNumber}` },
  });
  await prisma.payment.create({
    data: { jobId: job4.id, amount: 1000, method: "UPI", type: "ADVANCE", receivedById: frontdesk.id, note: "Advance at intake" },
  });

  // Job 5 — ready for delivery
  const job5 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: manoj.id,
      deviceId: devices.manoj.id,
      status: "REPAIR_IN_PROGRESS",
      priority: "NORMAL",
      createdByUserId: manager.id,
      assignedTechnicianId: tech2.id,
      conditionChecklist: condition(),
      accessoriesReceived: JSON.stringify(["Charger"]),
      quickIssues: JSON.stringify(["Windows Problem"]),
      complaintText: "Windows not booting, stuck on repair screen.",
      estimatedCost: 800,
      approvedCost: 800,
      advancePaid: 0,
      expectedCompletionDate: daysAgo(0),
      actualCompletionDate: daysAgo(0),
      createdAt: daysAgo(2),
    },
  });
  await addStatusHistory(job5.id, "NEW", manager.id, "Job created.", daysAgo(2));
  await addStatusHistory(job5.id, "RECEIVED", frontdesk.id, "Device checked in.", daysAgo(2));
  await addStatusHistory(job5.id, "DIAGNOSIS", tech2.id, "Corrupt Windows installation found.", daysAgo(2));
  await addStatusHistory(job5.id, "APPROVED", frontdesk.id, "Customer approved Windows reinstall.", daysAgo(1));
  await addStatusHistory(job5.id, "REPAIR_IN_PROGRESS", tech2.id, "Reinstalling Windows + drivers.", daysAgo(1));
  await addStatusHistory(job5.id, "QUALITY_CHECK", tech2.id, "Verifying all drivers and updates.", daysAgo(0));
  await addStatusHistory(job5.id, "READY_FOR_DELIVERY", tech2.id, "Ready for customer pickup.", daysAgo(0));

  // Job 6 — delivered, closed, with warranty (older job for history/warranty demo)
  const job6 = await prisma.serviceJob.create({
    data: {
      jobNumber: jobNumber(),
      publicToken: token(),
      customerId: divya.id,
      deviceId: devices.divya.id,
      status: "CLOSED",
      priority: "NORMAL",
      createdByUserId: frontdesk.id,
      assignedTechnicianId: tech1.id,
      conditionChecklist: condition(),
      accessoriesReceived: JSON.stringify(["Charger", "Bag"]),
      quickIssues: JSON.stringify(["Screen Problem"]),
      complaintText: "Screen flickers and shows vertical lines.",
      estimatedCost: 4500,
      approvedCost: 4500,
      advancePaid: 4500,
      expectedCompletionDate: daysAgo(28),
      actualCompletionDate: daysAgo(27),
      createdAt: daysAgo(30),
    },
  });
  await addStatusHistory(job6.id, "NEW", frontdesk.id, "Job created.", daysAgo(30));
  await addStatusHistory(job6.id, "RECEIVED", frontdesk.id, "Device checked in.", daysAgo(30));
  await addStatusHistory(job6.id, "DIAGNOSIS", tech1.id, "Panel damage confirmed.", daysAgo(29));
  await addStatusHistory(job6.id, "APPROVED", frontdesk.id, "Customer approved panel replacement.", daysAgo(29));
  await addStatusHistory(job6.id, "REPAIR_IN_PROGRESS", tech1.id, "Replacing display panel.", daysAgo(28));
  await addStatusHistory(job6.id, "QUALITY_CHECK", tech1.id, "Panel tested, no defects.", daysAgo(27));
  await addStatusHistory(job6.id, "READY_FOR_DELIVERY", tech1.id, "Ready for pickup.", daysAgo(27));
  await addStatusHistory(job6.id, "DELIVERED", frontdesk.id, "Handed over to customer.", daysAgo(27));
  await addStatusHistory(job6.id, "CLOSED", frontdesk.id, "Payment settled, job closed.", daysAgo(27));
  await prisma.jobPart.create({
    data: { jobId: job6.id, partId: dellDisplay.id, technicianId: tech1.id, quantity: 1, unitCost: 3200, unitPrice: 4500 },
  });
  await prisma.inventoryMovement.create({
    data: { partId: dellDisplay.id, type: "SERVICE_USE", quantity: -1, jobId: job6.id, createdById: tech1.id, note: `Used on ${job6.jobNumber}` },
  });
  await prisma.payment.create({
    data: { jobId: job6.id, amount: 4500, method: "CASH", type: "FINAL", receivedById: frontdesk.id },
  });
  await prisma.invoice.create({
    data: {
      jobId: job6.id,
      invoiceNumber: "INV-2026-00001",
      subtotal: 4500,
      discount: 0,
      taxAmount: 0,
      total: 4500,
      paidAmount: 4500,
      pendingAmount: 0,
      status: "PAID",
    },
  });
  await prisma.warranty.create({
    data: {
      jobId: job6.id,
      periodDays: 90,
      startDate: daysAgo(27),
      endDate: daysFromNow(63),
      terms: "90-day warranty on the replaced display panel only. Does not cover physical/liquid damage.",
    },
  });

  // ---------------------------------------------------------------------
  // Notifications (a realistic starting set)
  // ---------------------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      {
        type: "LOW_STOCK",
        title: "SSD 512GB — Low Stock",
        message: "Crucial 512GB SSD has only 1 unit left. Consider raising a purchase order.",
        isRead: false,
      },
      {
        type: "LOW_STOCK",
        title: "65W Universal Charger — Out of Stock",
        message: "65W Universal Charger is out of stock. A purchase order (PO-2026-00002) is already in progress.",
        isRead: false,
      },
      {
        type: "APPROVAL_NEEDED",
        title: "Estimate awaiting approval",
        message: `${vikas.name}'s estimate for ${job3.jobNumber} is awaiting approval.`,
        jobId: job3.id,
        isRead: false,
      },
      {
        type: "READY_FOR_DELIVERY",
        title: "Job ready for pickup",
        message: `${manoj.name}'s ${devices.manoj.brand} ${devices.manoj.model} (${job5.jobNumber}) is ready for delivery.`,
        jobId: job5.id,
        isRead: false,
      },
      {
        type: "PAYMENT_PENDING",
        title: "Payment pending",
        message: `${manoj.name} has ₹800 pending on ${job5.jobNumber}.`,
        jobId: job5.id,
        isRead: false,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Audit log samples
  // ---------------------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: tech1.id,
        action: "STATUS_CHANGE",
        entityType: "ServiceJob",
        entityId: job2.id,
        beforeJson: JSON.stringify({ status: "RECEIVED" }),
        afterJson: JSON.stringify({ status: "DIAGNOSIS" }),
      },
      {
        actorId: manager.id,
        action: "ESTIMATE_UPDATE",
        entityType: "Estimate",
        entityId: est3.id,
        beforeJson: JSON.stringify({ total: 7500 }),
        afterJson: JSON.stringify({ total: 7316 }),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("\nDemo logins:");
  console.log("  Admin:            admin@repairflow.demo / Admin@123");
  console.log("  Service Manager:  manager@repairflow.demo / Manager@123");
  console.log("  Technician:       tech@repairflow.demo / Tech@123");
  console.log("  Front Desk:       frontdesk@repairflow.demo / Front@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
