/**
 * TransitOps — Seed Script
 * Generates robust, dynamic, and realistic data for analytics and demos.
 */
import { PrismaClient, type Vehicle, type Driver } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const BCRYPT_COST_FACTOR = 10;
const DEMO_PASSWORD = "demo1234";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();

// Helper to get a date N days ago
function daysAgo(days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

// Helper to generate a random number between min and max
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main(): Promise<void> {
  console.log("🌱 TransitOps seed — generating robust analytics data...");

  // 1. Users
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST_FACTOR);
  const demoUsers = [
    { name: "Priya Sharma", email: "manager@transitops.local", role: "FLEET_MANAGER" as const },
    { name: "Arjun Mehta", email: "driver@transitops.local", role: "DRIVER" as const },
    { name: "Kavita Rao", email: "safety@transitops.local", role: "SAFETY_OFFICER" as const },
    { name: "Rohan Desai", email: "analyst@transitops.local", role: "FINANCIAL_ANALYST" as const },
  ];

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash: demoPasswordHash },
    });
  }
  console.log(`✅ Seeded Users`);

  // 2. Vehicles
  const demoVehicles = [
    { reg: "MH12AB1234", name: "Tata Prima 2830.K", type: "TRUCK", cap: 16000, cost: 3200000, region: "NORTH" },
    { reg: "DL8CAF5678", name: "Mahindra Bolero", type: "VAN", cap: 1500, cost: 950000, region: "SOUTH" },
    { reg: "KA05MN9012", name: "Tata Ace Gold", type: "MINI_TRUCK", cap: 750, cost: 620000, region: "EAST" },
    { reg: "TN09XY3456", name: "Ashok Leyland 3718", type: "TRAILER", cap: 25000, cost: 4500000, region: "WEST" },
    { reg: "GJ01PQ7890", name: "Bajaj CT100", type: "BIKE", cap: 50, cost: 65000, region: "CENTRAL" },
    { reg: "RJ14ST2345", name: "Eicher Pro 3015", type: "TRUCK", cap: 9000, cost: 2100000, region: "SOUTH" },
    { reg: "MH20UV6789", name: "Mahindra Supro", type: "VAN", cap: 1200, cost: 780000, region: "NORTH" },
  ];

  const vehicleIds: string[] = [];
  for (const v of demoVehicles) {
    const record = await prisma.vehicle.upsert({
      where: { registrationNumber: v.reg },
      update: { status: "AVAILABLE", odometer: randomInt(15000, 100000) },
      create: {
        registrationNumber: v.reg,
        name: v.name,
        type: v.type as any,
        maxLoadCapacity: v.cap,
        odometer: randomInt(15000, 100000),
        acquisitionCost: v.cost,
        status: "AVAILABLE",
        region: v.region as any,
        lastServiceOdometer: 10000,
      },
    });
    vehicleIds.push(record.id);
  }
  console.log(`✅ Seeded Vehicles`);

  // 3. Drivers
  const demoDrivers = [
    { license: "DL-0420110012345", name: "Vikram Singh", region: "NORTH", score: 92, expireDays: 300 },
    { license: "KA-0320150067890", name: "Anjali Nair", region: "SOUTH", score: 88, expireDays: 15 }, // Expiring soon
    { license: "TN-0720180023456", name: "Ramesh Kumar", region: "WEST", score: 65, expireDays: -10 }, // Expired
    { license: "MH-1420190098765", name: "Fatima Sheikh", region: "CENTRAL", score: 95, expireDays: 500 },
    { license: "UP-3220170034567", name: "Suresh Yadav", region: "EAST", score: 78, expireDays: 200 },
    { license: "RJ-1420160056789", name: "Deepak Joshi", region: "NORTH", score: 100, expireDays: 400 },
  ];

  const driverIds: string[] = [];
  for (const d of demoDrivers) {
    const record = await prisma.driver.upsert({
      where: { licenseNumber: d.license },
      update: { status: d.expireDays < 0 ? "SUSPENDED" : "AVAILABLE" },
      create: {
        name: d.name,
        licenseNumber: d.license,
        licenseCategory: "HMV",
        licenseExpiryDate: new Date(now.getTime() + d.expireDays * DAY_MS),
        contactNumber: `98765${randomInt(10000, 99999)}`,
        safetyScore: d.score,
        status: d.expireDays < 0 ? "SUSPENDED" : "AVAILABLE",
        region: d.region as any,
      },
    });
    driverIds.push(record.id);
  }
  console.log(`✅ Seeded Drivers`);

  // Wipe old trips, fuel, maintenance, expenses to generate clean robust data
  await prisma.expense.deleteMany({});
  await prisma.fuelLog.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.trip.deleteMany({});

  // 4. Generate 60 Trips over the last 180 days (6 months) for the Revenue Chart
  const locations = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Hyderabad", "Kolkata", "Ahmedabad"];
  
  for (let i = 1; i <= 60; i++) {
    // Distribute dates mostly over the last 6 months, growing slightly towards recent months
    // We'll use a curved distribution to make the revenue chart look like it's growing
    const daysInPast = Math.floor(180 - (i * 2.8) - randomInt(0, 10)); 
    const tripDate = daysAgo(Math.max(1, daysInPast));
    
    const vId = vehicleIds[randomInt(0, vehicleIds.length - 1)];
    const dId = driverIds[randomInt(0, driverIds.length - 1)];
    
    const distance = randomInt(50, 800);
    const revenue = distance * randomInt(50, 150); // E.g., 50 to 150 per km
    
    const trip = await prisma.trip.create({
      data: {
        trackingNumber: `TO-${2000 + i}`,
        source: locations[randomInt(0, locations.length - 1)] + " Hub",
        destination: locations[randomInt(0, locations.length - 1)] + " Depot",
        vehicleId: vId,
        driverId: dId,
        cargoWeight: randomInt(100, 15000),
        plannedDistance: distance,
        actualDistance: distance + randomInt(0, 20),
        revenue: revenue,
        status: "COMPLETED",
        dispatchedAt: new Date(tripDate.getTime() - 2 * DAY_MS),
        completedAt: tripDate,
        fuelConsumed: distance / randomInt(3, 10),
      }
    });

    // Create a Fuel Log for this trip
    await prisma.fuelLog.create({
      data: {
        vehicleId: vId,
        tripId: trip.id,
        liters: Number(trip.fuelConsumed),
        cost: Number(trip.fuelConsumed) * 95, // assuming $95/L cost
        date: tripDate,
      }
    });

    // Add random expenses (Tolls, etc.)
    if (Math.random() > 0.5) {
      await prisma.expense.create({
        data: {
          vehicleId: vId,
          type: "TOLL",
          amount: randomInt(200, 1500),
          date: tripDate,
          description: "Highway Tolls",
        }
      });
    }
  }

  // 5. Create some Maintenance Logs (causes Operational Cost spikes for specific vehicles)
  // Let's heavily penalize Vehicle 0 and Vehicle 3 to make them show up on "Top Costliest"
  await prisma.maintenanceLog.create({
    data: { vehicleId: vehicleIds[0], description: "Engine Overhaul", cost: 150000, status: "CLOSED", openedAt: daysAgo(40), closedAt: daysAgo(35) }
  });
  await prisma.expense.create({
    data: { vehicleId: vehicleIds[0], type: "MAINTENANCE", amount: 150000, date: daysAgo(35), description: "Engine Overhaul" }
  });

  await prisma.maintenanceLog.create({
    data: { vehicleId: vehicleIds[3], description: "Transmission Repair", cost: 85000, status: "CLOSED", openedAt: daysAgo(100), closedAt: daysAgo(98) }
  });
  await prisma.expense.create({
    data: { vehicleId: vehicleIds[3], type: "MAINTENANCE", amount: 85000, date: daysAgo(98), description: "Transmission Repair" }
  });

  // Put one vehicle IN_SHOP right now
  await prisma.maintenanceLog.create({
    data: { vehicleId: vehicleIds[2], description: "Brake Pad Replacement", cost: 12000, status: "OPEN", openedAt: daysAgo(1) }
  });
  await prisma.vehicle.update({ where: { id: vehicleIds[2] }, data: { status: "IN_SHOP" } });

  // Put one trip in ON_TRIP (Dispatched)
  await prisma.trip.create({
    data: {
      trackingNumber: `TO-ACTIVE-01`,
      source: "Delhi Hub",
      destination: "Agra Depot",
      vehicleId: vehicleIds[1],
      driverId: driverIds[1],
      cargoWeight: 500,
      plannedDistance: 200,
      revenue: 15000,
      status: "DISPATCHED",
      dispatchedAt: daysAgo(1),
    }
  });
  await prisma.vehicle.update({ where: { id: vehicleIds[1] }, data: { status: "ON_TRIP" } });
  await prisma.driver.update({ where: { id: driverIds[1] }, data: { status: "ON_TRIP" } });

  console.log(`✅ Seeded 60 dynamic Trips, Fuel Logs, and Operational Costs`);
  console.log("🎉 Seed complete! Start the app to see beautiful charts and analytics.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
