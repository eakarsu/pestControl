const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with comprehensive data...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ==================== USERS ====================
  console.log('Creating users...');
  const users = [];

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pestcontrol.com' },
    update: {},
    create: { email: 'admin@pestcontrol.com', password: hashedPassword, firstName: 'Admin', lastName: 'User', phone: '555-0100', role: 'ADMIN' }
  });
  users.push(admin);

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@pestcontrol.com' },
    update: {},
    create: { email: 'manager@pestcontrol.com', password: hashedPassword, firstName: 'Mike', lastName: 'Manager', phone: '555-0101', role: 'MANAGER' }
  });
  users.push(manager);

  // Technicians (15+)
  const technicianData = [
    { email: 'john.smith@pestcontrol.com', firstName: 'John', lastName: 'Smith', employeeId: 'TECH001' },
    { email: 'jane.doe@pestcontrol.com', firstName: 'Jane', lastName: 'Doe', employeeId: 'TECH002' },
    { email: 'mike.johnson@pestcontrol.com', firstName: 'Mike', lastName: 'Johnson', employeeId: 'TECH003' },
    { email: 'sarah.wilson@pestcontrol.com', firstName: 'Sarah', lastName: 'Wilson', employeeId: 'TECH004' },
    { email: 'david.brown@pestcontrol.com', firstName: 'David', lastName: 'Brown', employeeId: 'TECH005' },
    { email: 'emily.davis@pestcontrol.com', firstName: 'Emily', lastName: 'Davis', employeeId: 'TECH006' },
    { email: 'james.miller@pestcontrol.com', firstName: 'James', lastName: 'Miller', employeeId: 'TECH007' },
    { email: 'lisa.anderson@pestcontrol.com', firstName: 'Lisa', lastName: 'Anderson', employeeId: 'TECH008' },
    { email: 'robert.taylor@pestcontrol.com', firstName: 'Robert', lastName: 'Taylor', employeeId: 'TECH009' },
    { email: 'jennifer.thomas@pestcontrol.com', firstName: 'Jennifer', lastName: 'Thomas', employeeId: 'TECH010' },
    { email: 'william.jackson@pestcontrol.com', firstName: 'William', lastName: 'Jackson', employeeId: 'TECH011' },
    { email: 'amanda.white@pestcontrol.com', firstName: 'Amanda', lastName: 'White', employeeId: 'TECH012' },
    { email: 'chris.harris@pestcontrol.com', firstName: 'Chris', lastName: 'Harris', employeeId: 'TECH013' },
    { email: 'michelle.martin@pestcontrol.com', firstName: 'Michelle', lastName: 'Martin', employeeId: 'TECH014' },
    { email: 'kevin.garcia@pestcontrol.com', firstName: 'Kevin', lastName: 'Garcia', employeeId: 'TECH015' }
  ];

  const techUsers = [];
  for (const tech of technicianData) {
    const user = await prisma.user.upsert({
      where: { email: tech.email },
      update: {},
      create: {
        email: tech.email,
        password: hashedPassword,
        firstName: tech.firstName,
        lastName: tech.lastName,
        phone: `555-${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'TECHNICIAN'
      }
    });
    techUsers.push({ user, employeeId: tech.employeeId });
  }
  console.log(`✓ Created ${techUsers.length + 2} users`);

  // ==================== TERRITORIES (15+) ====================
  console.log('Creating territories...');
  const territoryData = [
    { name: 'North Atlanta', zipCodes: ['30301', '30302', '30303'], color: '#4CAF50' },
    { name: 'South Atlanta', zipCodes: ['30304', '30305', '30306'], color: '#2196F3' },
    { name: 'East Atlanta', zipCodes: ['30307', '30308', '30309'], color: '#FF9800' },
    { name: 'West Atlanta', zipCodes: ['30310', '30311', '30312'], color: '#9C27B0' },
    { name: 'Midtown', zipCodes: ['30313', '30314', '30315'], color: '#E91E63' },
    { name: 'Buckhead', zipCodes: ['30316', '30317', '30318'], color: '#00BCD4' },
    { name: 'Sandy Springs', zipCodes: ['30319', '30320', '30321'], color: '#8BC34A' },
    { name: 'Marietta', zipCodes: ['30060', '30061', '30062'], color: '#FF5722' },
    { name: 'Decatur', zipCodes: ['30030', '30031', '30032'], color: '#607D8B' },
    { name: 'Alpharetta', zipCodes: ['30004', '30005', '30009'], color: '#795548' },
    { name: 'Roswell', zipCodes: ['30075', '30076', '30077'], color: '#FFEB3B' },
    { name: 'Lawrenceville', zipCodes: ['30043', '30044', '30045'], color: '#3F51B5' },
    { name: 'Duluth', zipCodes: ['30096', '30097', '30098'], color: '#F44336' },
    { name: 'Kennesaw', zipCodes: ['30144', '30152', '30156'], color: '#009688' },
    { name: 'Smyrna', zipCodes: ['30080', '30081', '30082'], color: '#673AB7' }
  ];

  const territories = [];
  for (const t of territoryData) {
    const territory = await prisma.territory.upsert({
      where: { name: t.name },
      update: {},
      create: t
    });
    territories.push(territory);
  }
  console.log(`✓ Created ${territories.length} territories`);

  // ==================== TECHNICIANS ====================
  console.log('Creating technicians...');
  const technicians = [];
  const certifications = ['General Pest Control', 'Termite Treatment', 'Fumigation', 'Wildlife Control', 'Rodent Management'];
  const specializations = ['General Pest Control', 'Termite Treatment', 'Rodent Control', 'Bed Bug Treatment', 'Mosquito Control', 'Wildlife Removal'];

  for (let i = 0; i < techUsers.length; i++) {
    const tech = await prisma.technician.upsert({
      where: { employeeId: techUsers[i].employeeId },
      update: {},
      create: {
        userId: techUsers[i].user.id,
        employeeId: techUsers[i].employeeId,
        licenseNumber: `LIC-GA-${2024}${String(i + 1).padStart(4, '0')}`,
        licenseState: 'GA',
        licenseExpiry: new Date(Date.now() + (365 + Math.random() * 365) * 24 * 60 * 60 * 1000),
        certifications: certifications.slice(0, Math.floor(Math.random() * 3) + 2),
        specializations: specializations.slice(0, Math.floor(Math.random() * 3) + 2),
        territoryId: territories[i % territories.length].id,
        isAvailable: Math.random() > 0.2,
        currentLatitude: 33.749 + (Math.random() - 0.5) * 0.2,
        currentLongitude: -84.388 + (Math.random() - 0.5) * 0.2
      }
    });
    technicians.push(tech);
  }
  console.log(`✓ Created ${technicians.length} technicians`);

  // ==================== SALES REPS (5+) ====================
  console.log('Creating sales reps...');
  const salesRepData = [
    { email: 'sarah.sales@pestcontrol.com', firstName: 'Sarah', lastName: 'Sales', employeeId: 'SALES001' },
    { email: 'tom.closer@pestcontrol.com', firstName: 'Tom', lastName: 'Closer', employeeId: 'SALES002' },
    { email: 'nancy.deal@pestcontrol.com', firstName: 'Nancy', lastName: 'Deal', employeeId: 'SALES003' },
    { email: 'mark.hunter@pestcontrol.com', firstName: 'Mark', lastName: 'Hunter', employeeId: 'SALES004' },
    { email: 'linda.prospect@pestcontrol.com', firstName: 'Linda', lastName: 'Prospect', employeeId: 'SALES005' }
  ];

  const salesReps = [];
  for (const sr of salesRepData) {
    const user = await prisma.user.upsert({
      where: { email: sr.email },
      update: {},
      create: { email: sr.email, password: hashedPassword, firstName: sr.firstName, lastName: sr.lastName, phone: `555-${Math.floor(2000 + Math.random() * 1000)}`, role: 'SALES' }
    });
    const rep = await prisma.salesRep.upsert({
      where: { employeeId: sr.employeeId },
      update: {},
      create: { userId: user.id, employeeId: sr.employeeId, commissionRate: 0.08 + Math.random() * 0.04, quota: 50000 + Math.random() * 50000 }
    });
    salesReps.push(rep);
  }
  console.log(`✓ Created ${salesReps.length} sales reps`);

  // ==================== PEST TYPES (20+) ====================
  console.log('Creating pest types...');
  const pestTypeData = [
    { name: 'German Cockroach', category: 'Insects', description: 'Small, light brown cockroach common in kitchens', commonTreatments: ['Gel Bait', 'IGR', 'Residual Spray'], seasonalPeak: ['Summer', 'Fall'] },
    { name: 'American Cockroach', category: 'Insects', description: 'Large, reddish-brown cockroach', commonTreatments: ['Residual Spray', 'Dust', 'Bait Stations'], seasonalPeak: ['Summer'] },
    { name: 'Oriental Cockroach', category: 'Insects', description: 'Dark, shiny cockroach found in damp areas', commonTreatments: ['Residual Spray', 'Granular Bait'], seasonalPeak: ['Spring', 'Summer'] },
    { name: 'House Mouse', category: 'Rodents', description: 'Small gray mouse commonly found indoors', commonTreatments: ['Snap Traps', 'Bait Stations', 'Exclusion'], seasonalPeak: ['Fall', 'Winter'] },
    { name: 'Norway Rat', category: 'Rodents', description: 'Large brown rat, burrows underground', commonTreatments: ['Bait Stations', 'Snap Traps', 'Exclusion'], seasonalPeak: ['Fall', 'Winter'] },
    { name: 'Roof Rat', category: 'Rodents', description: 'Slender black rat, excellent climber', commonTreatments: ['Bait Stations', 'Snap Traps', 'Exclusion'], seasonalPeak: ['Fall', 'Winter'] },
    { name: 'Carpenter Ant', category: 'Insects', description: 'Large black ant that damages wood', commonTreatments: ['Residual Spray', 'Dust', 'Bait'], seasonalPeak: ['Spring', 'Summer'] },
    { name: 'Fire Ant', category: 'Insects', description: 'Aggressive red ant with painful sting', commonTreatments: ['Mound Treatment', 'Broadcast Bait'], seasonalPeak: ['Spring', 'Summer', 'Fall'] },
    { name: 'Odorous House Ant', category: 'Insects', description: 'Small black ant with coconut odor when crushed', commonTreatments: ['Liquid Bait', 'Residual Spray'], seasonalPeak: ['Spring', 'Summer'] },
    { name: 'Subterranean Termite', category: 'Insects', description: 'Wood-destroying insect living in soil', commonTreatments: ['Liquid Treatment', 'Bait System', 'Wood Treatment'], seasonalPeak: ['Spring'] },
    { name: 'Drywood Termite', category: 'Insects', description: 'Termite that lives entirely in wood', commonTreatments: ['Fumigation', 'Spot Treatment'], seasonalPeak: ['Summer', 'Fall'] },
    { name: 'Bed Bug', category: 'Insects', description: 'Blood-feeding insect found in beds', commonTreatments: ['Heat Treatment', 'Residual Spray', 'Dust'], seasonalPeak: ['Summer'] },
    { name: 'Mosquito', category: 'Insects', description: 'Blood-feeding flying insect', commonTreatments: ['Larvicide', 'Adulticide', 'Misting System'], seasonalPeak: ['Summer'] },
    { name: 'Flea', category: 'Insects', description: 'Small jumping insect that feeds on pets and humans', commonTreatments: ['IGR', 'Residual Spray', 'Vacuuming'], seasonalPeak: ['Summer', 'Fall'] },
    { name: 'Tick', category: 'Arachnids', description: 'Blood-feeding arachnid, disease vector', commonTreatments: ['Yard Treatment', 'Residual Spray'], seasonalPeak: ['Spring', 'Summer'] },
    { name: 'Brown Recluse Spider', category: 'Arachnids', description: 'Venomous spider with violin marking', commonTreatments: ['Residual Spray', 'Dust', 'Glue Boards'], seasonalPeak: ['Spring', 'Summer'] },
    { name: 'Black Widow Spider', category: 'Arachnids', description: 'Venomous spider with red hourglass', commonTreatments: ['Residual Spray', 'Dust', 'Web Removal'], seasonalPeak: ['Summer'] },
    { name: 'Wasp', category: 'Insects', description: 'Stinging insect that builds nests', commonTreatments: ['Nest Removal', 'Residual Spray'], seasonalPeak: ['Summer', 'Fall'] },
    { name: 'Yellow Jacket', category: 'Insects', description: 'Aggressive stinging insect', commonTreatments: ['Nest Treatment', 'Trapping'], seasonalPeak: ['Late Summer', 'Fall'] },
    { name: 'Silverfish', category: 'Insects', description: 'Silver, fish-shaped insect in damp areas', commonTreatments: ['Residual Spray', 'Dust', 'Dehumidification'], seasonalPeak: ['Year-round'] }
  ];

  const pestTypes = [];
  for (const pt of pestTypeData) {
    const pestType = await prisma.pestType.upsert({
      where: { name: pt.name },
      update: {},
      create: pt
    });
    pestTypes.push(pestType);
  }
  console.log(`✓ Created ${pestTypes.length} pest types`);

  // ==================== SERVICE TYPES (15+) ====================
  console.log('Creating service types...');
  const serviceTypeData = [
    { name: 'General Pest Control', description: 'Treatment for common household pests', category: 'GENERAL', basePrice: 125, duration: 45, isRecurring: true, frequency: 'Monthly' },
    { name: 'Termite Inspection', description: 'Comprehensive termite inspection', category: 'INSPECTION', basePrice: 100, duration: 60, isRecurring: false },
    { name: 'Termite Treatment', description: 'Full termite treatment with warranty', category: 'TERMITE', basePrice: 1500, duration: 240, isRecurring: false },
    { name: 'Rodent Control', description: 'Rodent baiting and exclusion', category: 'RODENT', basePrice: 200, duration: 60, isRecurring: true, frequency: 'Monthly' },
    { name: 'Mosquito Treatment', description: 'Outdoor mosquito control', category: 'MOSQUITO', basePrice: 95, duration: 30, isRecurring: true, frequency: 'Monthly' },
    { name: 'Bed Bug Treatment', description: 'Complete bed bug elimination', category: 'BED_BUG', basePrice: 500, duration: 180, isRecurring: false },
    { name: 'Wildlife Removal', description: 'Humane wildlife removal and exclusion', category: 'WILDLIFE', basePrice: 350, duration: 120, isRecurring: false },
    { name: 'Ant Control', description: 'Interior and exterior ant treatment', category: 'GENERAL', basePrice: 150, duration: 45, isRecurring: true, frequency: 'Quarterly' },
    { name: 'Flea Treatment', description: 'Interior flea treatment and prevention', category: 'GENERAL', basePrice: 175, duration: 60, isRecurring: false },
    { name: 'Tick Treatment', description: 'Yard tick treatment', category: 'GENERAL', basePrice: 125, duration: 45, isRecurring: true, frequency: 'Monthly' },
    { name: 'Spider Control', description: 'Web removal and treatment', category: 'GENERAL', basePrice: 100, duration: 30, isRecurring: true, frequency: 'Quarterly' },
    { name: 'Wasp Nest Removal', description: 'Safe removal of wasp and hornet nests', category: 'GENERAL', basePrice: 150, duration: 30, isRecurring: false },
    { name: 'Commercial Pest Management', description: 'Comprehensive commercial service', category: 'GENERAL', basePrice: 300, duration: 90, isRecurring: true, frequency: 'Weekly' },
    { name: 'Restaurant Pest Control', description: 'Food service pest management', category: 'GENERAL', basePrice: 250, duration: 60, isRecurring: true, frequency: 'Weekly' },
    { name: 'Real Estate Inspection', description: 'WDO inspection for property sale', category: 'INSPECTION', basePrice: 150, duration: 60, isRecurring: false },
    { name: 'Fumigation Service', description: 'Whole structure fumigation', category: 'TERMITE', basePrice: 3000, duration: 480, isRecurring: false }
  ];

  const serviceTypes = [];
  for (const st of serviceTypeData) {
    const serviceType = await prisma.serviceType.upsert({
      where: { name: st.name },
      update: {},
      create: st
    });
    serviceTypes.push(serviceType);
  }
  console.log(`✓ Created ${serviceTypes.length} service types`);

  // ==================== PRODUCTS (20+) ====================
  console.log('Creating products...');
  const productData = [
    { name: 'Advion Cockroach Gel', sku: 'ADV-GEL-001', barcode: '7891234567890', category: 'Insecticide', manufacturer: 'Syngenta', activeIngredient: 'Indoxacarb', concentration: '0.6%', epaNumber: 'EPA-100-1498', unitOfMeasure: 'tube', unitCost: 35, inStock: 50, reorderLevel: 10 },
    { name: 'Demand CS', sku: 'DEM-CS-001', barcode: '7891234567891', category: 'Insecticide', manufacturer: 'Syngenta', activeIngredient: 'Lambda-cyhalothrin', concentration: '9.7%', epaNumber: 'EPA-100-1066', unitOfMeasure: 'qt', unitCost: 65, inStock: 30, reorderLevel: 5 },
    { name: 'Termidor SC', sku: 'TER-SC-001', barcode: '7891234567892', category: 'Insecticide', manufacturer: 'BASF', activeIngredient: 'Fipronil', concentration: '9.1%', epaNumber: 'EPA-7969-210', unitOfMeasure: 'qt', unitCost: 85, inStock: 20, reorderLevel: 5, isRestricted: true },
    { name: 'Contrac All-Weather Blox', sku: 'CON-BLK-001', barcode: '7891234567893', category: 'Rodenticide', manufacturer: 'Bell Labs', activeIngredient: 'Bromadiolone', concentration: '0.005%', epaNumber: 'EPA-12455-79', unitOfMeasure: 'lb', unitCost: 45, inStock: 40, reorderLevel: 10, isRestricted: true },
    { name: 'Gentrol IGR', sku: 'GEN-IGR-001', barcode: '7891234567894', category: 'Insecticide', manufacturer: 'Zoecon', activeIngredient: 'Hydroprene', concentration: '9%', epaNumber: 'EPA-2724-351', unitOfMeasure: 'pt', unitCost: 55, inStock: 25, reorderLevel: 5 },
    { name: 'Delta Dust', sku: 'DLT-DST-001', barcode: '7891234567895', category: 'Insecticide', manufacturer: 'Bayer', activeIngredient: 'Deltamethrin', concentration: '0.05%', epaNumber: 'EPA-432-772', unitOfMeasure: 'lb', unitCost: 30, inStock: 35, reorderLevel: 10 },
    { name: 'Suspend SC', sku: 'SUS-SC-001', barcode: '7891234567896', category: 'Insecticide', manufacturer: 'Bayer', activeIngredient: 'Deltamethrin', concentration: '4.75%', epaNumber: 'EPA-432-763', unitOfMeasure: 'pt', unitCost: 48, inStock: 28, reorderLevel: 8 },
    { name: 'Temprid FX', sku: 'TMP-FX-001', barcode: '7891234567897', category: 'Insecticide', manufacturer: 'Bayer', activeIngredient: 'Imidacloprid/Beta-Cyfluthrin', concentration: '21%/10.5%', epaNumber: 'EPA-432-1544', unitOfMeasure: 'qt', unitCost: 72, inStock: 22, reorderLevel: 6 },
    { name: 'Phantom SC', sku: 'PHN-SC-001', barcode: '7891234567898', category: 'Insecticide', manufacturer: 'BASF', activeIngredient: 'Chlorfenapyr', concentration: '21.45%', epaNumber: 'EPA-241-392', unitOfMeasure: 'qt', unitCost: 95, inStock: 15, reorderLevel: 4 },
    { name: 'Transport Mikron', sku: 'TRN-MK-001', barcode: '7891234567899', category: 'Insecticide', manufacturer: 'FMC', activeIngredient: 'Acetamiprid/Bifenthrin', concentration: '22.73%/27.27%', epaNumber: 'EPA-279-3313', unitOfMeasure: 'qt', unitCost: 68, inStock: 18, reorderLevel: 5 },
    { name: 'Maxforce FC', sku: 'MAX-FC-001', barcode: '7891234567900', category: 'Insecticide', manufacturer: 'Bayer', activeIngredient: 'Fipronil', concentration: '0.01%', epaNumber: 'EPA-432-1259', unitOfMeasure: 'tube', unitCost: 32, inStock: 45, reorderLevel: 12 },
    { name: 'Vendetta Plus', sku: 'VND-PL-001', barcode: '7891234567901', category: 'Insecticide', manufacturer: 'MGK', activeIngredient: 'Abamectin', concentration: '0.05%', epaNumber: 'EPA-1021-2591', unitOfMeasure: 'tube', unitCost: 28, inStock: 40, reorderLevel: 10 },
    { name: 'Advance Carpenter Ant Bait', sku: 'ADV-CAB-001', barcode: '7891234567902', category: 'Insecticide', manufacturer: 'BASF', activeIngredient: 'Abamectin', concentration: '0.011%', epaNumber: 'EPA-499-496', unitOfMeasure: 'lb', unitCost: 42, inStock: 20, reorderLevel: 6 },
    { name: 'Talstar P', sku: 'TAL-P-001', barcode: '7891234567903', category: 'Insecticide', manufacturer: 'FMC', activeIngredient: 'Bifenthrin', concentration: '7.9%', epaNumber: 'EPA-279-3206', unitOfMeasure: 'gal', unitCost: 55, inStock: 12, reorderLevel: 4 },
    { name: 'Cy-Kick CS', sku: 'CYK-CS-001', barcode: '7891234567904', category: 'Insecticide', manufacturer: 'BASF', activeIngredient: 'Cyfluthrin', concentration: '6%', epaNumber: 'EPA-499-362', unitOfMeasure: 'pt', unitCost: 38, inStock: 30, reorderLevel: 8 },
    { name: 'Sentricon Bait', sku: 'SEN-BT-001', barcode: '7891234567905', category: 'Termiticide', manufacturer: 'Dow', activeIngredient: 'Noviflumuron', concentration: '0.5%', epaNumber: 'EPA-62719-663', unitOfMeasure: 'each', unitCost: 25, inStock: 100, reorderLevel: 25, isRestricted: true },
    { name: 'Firstline Termite Bait', sku: 'FLN-TB-001', barcode: '7891234567906', category: 'Termiticide', manufacturer: 'FMC', activeIngredient: 'Sulfluramid', concentration: '0.5%', epaNumber: 'EPA-279-3158', unitOfMeasure: 'each', unitCost: 18, inStock: 80, reorderLevel: 20, isRestricted: true },
    { name: 'Catchmaster Glue Board', sku: 'CTM-GB-001', barcode: '7891234567907', category: 'Trap', manufacturer: 'Catchmaster', activeIngredient: 'N/A', unitOfMeasure: 'each', unitCost: 1.5, inStock: 500, reorderLevel: 100 },
    { name: 'Victor Snap Trap', sku: 'VIC-ST-001', barcode: '7891234567908', category: 'Trap', manufacturer: 'Victor', activeIngredient: 'N/A', unitOfMeasure: 'each', unitCost: 2.5, inStock: 300, reorderLevel: 75 },
    { name: 'Protecta LP Bait Station', sku: 'PRT-LP-001', barcode: '7891234567909', category: 'Equipment', manufacturer: 'Bell Labs', activeIngredient: 'N/A', unitOfMeasure: 'each', unitCost: 15, inStock: 50, reorderLevel: 15 }
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p
    });
    products.push(product);
  }
  console.log(`✓ Created ${products.length} products`);

  // ==================== CUSTOMERS (25+) ====================
  console.log('Creating customers...');
  const customerData = [
    { firstName: 'John', lastName: 'Anderson', email: 'john.anderson@email.com', phone: '555-1001', customerType: 'RESIDENTIAL' },
    { firstName: 'Mary', lastName: 'Wilson', email: 'mary.wilson@email.com', phone: '555-1002', customerType: 'RESIDENTIAL' },
    { firstName: 'Robert', lastName: 'Taylor', email: 'robert.taylor@email.com', phone: '555-1003', customerType: 'RESIDENTIAL' },
    { firstName: 'Jennifer', lastName: 'Brown', email: 'jennifer.brown@email.com', phone: '555-1004', customerType: 'RESIDENTIAL' },
    { firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@email.com', phone: '555-1005', customerType: 'RESIDENTIAL' },
    { firstName: 'Linda', lastName: 'Miller', email: 'linda.miller@email.com', phone: '555-1006', customerType: 'RESIDENTIAL' },
    { firstName: 'William', lastName: 'Garcia', email: 'william.garcia@email.com', phone: '555-1007', customerType: 'RESIDENTIAL' },
    { firstName: 'Elizabeth', lastName: 'Martinez', email: 'elizabeth.martinez@email.com', phone: '555-1008', customerType: 'RESIDENTIAL' },
    { firstName: 'David', lastName: 'Rodriguez', email: 'david.rodriguez@email.com', phone: '555-1009', customerType: 'RESIDENTIAL' },
    { firstName: 'Susan', lastName: 'Hernandez', email: 'susan.hernandez@email.com', phone: '555-1010', customerType: 'RESIDENTIAL' },
    { companyName: 'ACME Corporation', firstName: 'Bob', lastName: 'Manager', email: 'acme@company.com', phone: '555-2001', customerType: 'COMMERCIAL' },
    { companyName: 'Best Restaurant', firstName: 'Chef', lastName: 'Gordon', email: 'bestrestaurant@email.com', phone: '555-2002', customerType: 'COMMERCIAL' },
    { companyName: 'City Hotel', firstName: 'Grace', lastName: 'Manager', email: 'cityhotel@email.com', phone: '555-2003', customerType: 'COMMERCIAL' },
    { companyName: 'Main Street Diner', firstName: 'Sam', lastName: 'Owner', email: 'mainstreetdiner@email.com', phone: '555-2004', customerType: 'COMMERCIAL' },
    { companyName: 'Tech Office Park', firstName: 'Tom', lastName: 'Facilities', email: 'techoffice@email.com', phone: '555-2005', customerType: 'COMMERCIAL' },
    { companyName: 'Sunny Daycare', firstName: 'Amy', lastName: 'Director', email: 'sunnydaycare@email.com', phone: '555-2006', customerType: 'COMMERCIAL' },
    { companyName: 'Downtown Apartments', firstName: 'Jim', lastName: 'Property', email: 'downtownapts@email.com', phone: '555-2007', customerType: 'COMMERCIAL' },
    { companyName: 'Green Grocery', firstName: 'Pat', lastName: 'Manager', email: 'greengrocery@email.com', phone: '555-2008', customerType: 'COMMERCIAL' },
    { companyName: 'Health Clinic', firstName: 'Dr.', lastName: 'Smith', email: 'healthclinic@email.com', phone: '555-2009', customerType: 'COMMERCIAL' },
    { companyName: 'Pet Store Plus', firstName: 'Lisa', lastName: 'Owner', email: 'petstoreplus@email.com', phone: '555-2010', customerType: 'COMMERCIAL' },
    { firstName: 'James', lastName: 'White', email: 'james.white@email.com', phone: '555-1011', customerType: 'RESIDENTIAL' },
    { firstName: 'Patricia', lastName: 'Harris', email: 'patricia.harris@email.com', phone: '555-1012', customerType: 'RESIDENTIAL' },
    { firstName: 'Charles', lastName: 'Clark', email: 'charles.clark@email.com', phone: '555-1013', customerType: 'RESIDENTIAL' },
    { firstName: 'Barbara', lastName: 'Lewis', email: 'barbara.lewis@email.com', phone: '555-1014', customerType: 'RESIDENTIAL' },
    { firstName: 'Thomas', lastName: 'Walker', email: 'thomas.walker@email.com', phone: '555-1015', customerType: 'RESIDENTIAL' }
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      update: {},
      create: { ...c, status: 'ACTIVE' }
    });
    customers.push(customer);
  }
  console.log(`✓ Created ${customers.length} customers`);

  // ==================== PROPERTIES (30+) ====================
  console.log('Creating properties...');
  const propertyTypes = ['SINGLE_FAMILY', 'MULTI_FAMILY', 'APARTMENT', 'CONDO', 'COMMERCIAL', 'RESTAURANT', 'WAREHOUSE', 'OFFICE'];
  const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Pine Ln', 'Cedar Blvd', 'Elm St', 'Birch Rd', 'Willow Way', 'Peachtree St', 'Highland Ave'];
  const cities = ['Atlanta', 'Marietta', 'Decatur', 'Alpharetta', 'Roswell', 'Sandy Springs', 'Duluth', 'Lawrenceville'];

  const properties = [];
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const numProperties = customer.customerType === 'COMMERCIAL' ? Math.floor(Math.random() * 2) + 1 : 1;

    for (let j = 0; j < numProperties; j++) {
      const property = await prisma.property.create({
        data: {
          customerId: customer.id,
          name: customer.customerType === 'COMMERCIAL' ? (j === 0 ? 'Main Location' : 'Branch ' + j) : 'Home',
          addressLine1: `${Math.floor(Math.random() * 9000) + 1000} ${streets[Math.floor(Math.random() * streets.length)]}`,
          city: cities[Math.floor(Math.random() * cities.length)],
          state: 'GA',
          zipCode: `30${String(Math.floor(Math.random() * 400)).padStart(3, '0')}`,
          propertyType: customer.customerType === 'COMMERCIAL'
            ? propertyTypes[4 + Math.floor(Math.random() * 4)]
            : propertyTypes[Math.floor(Math.random() * 4)],
          squareFootage: customer.customerType === 'COMMERCIAL' ? 3000 + Math.floor(Math.random() * 7000) : 1500 + Math.floor(Math.random() * 2500),
          latitude: 33.749 + (Math.random() - 0.5) * 0.3,
          longitude: -84.388 + (Math.random() - 0.5) * 0.3
        }
      });
      properties.push(property);
    }
  }
  console.log(`✓ Created ${properties.length} properties`);

  // ==================== CONTRACTS (20+) ====================
  console.log('Creating contracts...');
  const contracts = [];
  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length];
    const startDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
    const contractNumber = `CTR-2024-${String(i + 1).padStart(4, '0')}`;
    const contract = await prisma.contract.upsert({
      where: { contractNumber },
      update: {},
      create: {
        customerId: customer.id,
        contractNumber,
        name: customer.customerType === 'COMMERCIAL' ? 'Commercial Pest Management Agreement' : 'Annual Pest Control Service',
        contractType: Math.random() > 0.3 ? 'ANNUAL' : 'RECURRING',
        startDate,
        endDate: new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        billingFrequency: Math.random() > 0.5 ? 'MONTHLY' : 'QUARTERLY',
        contractValue: customer.customerType === 'COMMERCIAL' ? 2400 + Math.floor(Math.random() * 3600) : 1200 + Math.floor(Math.random() * 800),
        status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING'
      }
    });
    contracts.push(contract);
  }
  console.log(`✓ Created ${contracts.length} contracts`);

  // ==================== INVOICES (25+) ====================
  console.log('Creating invoices...');
  const invoices = [];
  const invoiceStatuses = ['DRAFT', 'SENT', 'PAID', 'PAID', 'PAID', 'OVERDUE'];
  for (let i = 0; i < 25; i++) {
    const customer = customers[i % customers.length];
    const amount = 100 + Math.floor(Math.random() * 400);
    const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
    const invoiceNumber = `INV-2024-${String(i + 1).padStart(5, '0')}`;
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: {},
      create: {
        customerId: customer.id,
        contractId: contracts[i % contracts.length]?.id,
        invoiceNumber,
        issueDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + (30 - Math.random() * 60) * 24 * 60 * 60 * 1000),
        subtotal: amount,
        tax: amount * 0.08,
        total: amount * 1.08,
        amountPaid: status === 'PAID' ? amount * 1.08 : 0,
        status
      }
    });
    invoices.push(invoice);
  }
  console.log(`✓ Created ${invoices.length} invoices`);

  // ==================== SERVICE ORDERS (30+) ====================
  console.log('Creating service orders...');
  const serviceOrders = [];
  const orderStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
  for (let i = 0; i < 30; i++) {
    const property = properties[i % properties.length];
    const technician = technicians[i % technicians.length];
    const serviceType = serviceTypes[i % serviceTypes.length];
    const scheduledDate = new Date(Date.now() + (i - 15) * 24 * 60 * 60 * 1000);
    const status = scheduledDate < new Date() ? 'COMPLETED' : orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

    const orderNumber = `WO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
    const order = await prisma.serviceOrder.upsert({
      where: { orderNumber },
      update: {},
      create: {
        orderNumber,
        propertyId: property.id,
        contractId: contracts[i % contracts.length]?.id,
        serviceTypeId: serviceType.id,
        technicianId: technician.id,
        scheduledDate,
        scheduledTimeStart: `${8 + Math.floor(i % 8)}:00`,
        scheduledTimeEnd: `${9 + Math.floor(i % 8)}:00`,
        status,
        priority: Math.random() > 0.8 ? 'HIGH' : 'NORMAL',
        completedDate: status === 'COMPLETED' ? scheduledDate : null
      }
    });
    serviceOrders.push(order);
  }
  console.log(`✓ Created ${serviceOrders.length} service orders`);

  // ==================== LEADS (20+) ====================
  console.log('Creating leads...');
  const leadStatuses = ['NEW', 'NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];
  const leadSources = ['WEBSITE', 'PHONE', 'REFERRAL', 'ADVERTISING', 'SOCIAL_MEDIA'];
  const leadData = [
    { firstName: 'Tom', lastName: 'Prospect', phone: '555-3001', email: 'tom.prospect@email.com', pestConcerns: ['Ants', 'Cockroaches'] },
    { firstName: 'Lisa', lastName: 'Business', phone: '555-3002', email: 'lisa.business@email.com', companyName: 'New Office LLC', pestConcerns: ['Rodents'] },
    { firstName: 'Robert', lastName: 'Homeowner', phone: '555-3003', email: 'robert.homeowner@email.com', pestConcerns: ['Termites'] },
    { firstName: 'Nancy', lastName: 'New', phone: '555-3004', email: 'nancy.new@email.com', pestConcerns: ['Bed Bugs'] },
    { firstName: 'Steve', lastName: 'Seller', phone: '555-3005', email: 'steve.seller@email.com', pestConcerns: ['General Pest'] },
    { firstName: 'Karen', lastName: 'Kitchen', phone: '555-3006', email: 'karen.kitchen@email.com', companyName: 'Karens Cafe', pestConcerns: ['Cockroaches', 'Rodents'] },
    { firstName: 'Paul', lastName: 'Property', phone: '555-3007', email: 'paul.property@email.com', companyName: 'Paul Property Management', pestConcerns: ['Multiple Units'] },
    { firstName: 'Amy', lastName: 'Apartment', phone: '555-3008', email: 'amy.apartment@email.com', pestConcerns: ['Ants'] },
    { firstName: 'Dan', lastName: 'Developer', phone: '555-3009', email: 'dan.developer@email.com', companyName: 'Dan Dev Corp', pestConcerns: ['New Construction'] },
    { firstName: 'Beth', lastName: 'Baker', phone: '555-3010', email: 'beth.baker@email.com', companyName: 'Beths Bakery', pestConcerns: ['Rodents', 'Ants'] },
    { firstName: 'Chris', lastName: 'Church', phone: '555-3011', email: 'chris.church@email.com', pestConcerns: ['Wasps'] },
    { firstName: 'Diana', lastName: 'Doctor', phone: '555-3012', email: 'diana.doctor@email.com', companyName: 'Medical Center', pestConcerns: ['General Pest'] },
    { firstName: 'Eric', lastName: 'Estate', phone: '555-3013', email: 'eric.estate@email.com', pestConcerns: ['WDO Inspection'] },
    { firstName: 'Fran', lastName: 'Factory', phone: '555-3014', email: 'fran.factory@email.com', companyName: 'Fran Manufacturing', pestConcerns: ['Rodents', 'Birds'] },
    { firstName: 'Greg', lastName: 'Grocery', phone: '555-3015', email: 'greg.grocery@email.com', companyName: 'Gregs Market', pestConcerns: ['Flies', 'Rodents'] },
    { firstName: 'Helen', lastName: 'Hotel', phone: '555-3016', email: 'helen.hotel@email.com', companyName: 'Helens Inn', pestConcerns: ['Bed Bugs'] },
    { firstName: 'Ivan', lastName: 'Industrial', phone: '555-3017', email: 'ivan.industrial@email.com', companyName: 'Ivan Industries', pestConcerns: ['Rodents'] },
    { firstName: 'Julia', lastName: 'Juice', phone: '555-3018', email: 'julia.juice@email.com', companyName: 'Juice Bar', pestConcerns: ['Fruit Flies'] },
    { firstName: 'Ken', lastName: 'Kennel', phone: '555-3019', email: 'ken.kennel@email.com', companyName: 'Kens Pet Care', pestConcerns: ['Fleas', 'Ticks'] },
    { firstName: 'Laura', lastName: 'Landlord', phone: '555-3020', email: 'laura.landlord@email.com', pestConcerns: ['Multiple Properties'] }
  ];

  const leads = [];
  for (let i = 0; i < leadData.length; i++) {
    const ld = leadData[i];
    const lead = await prisma.lead.create({
      data: {
        firstName: ld.firstName,
        lastName: ld.lastName,
        phone: ld.phone,
        email: ld.email,
        companyName: ld.companyName,
        source: leadSources[Math.floor(Math.random() * leadSources.length)],
        status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
        pestConcerns: ld.pestConcerns,
        assignedToId: salesReps[i % salesReps.length].id,
        estimatedValue: 500 + Math.floor(Math.random() * 2500)
      }
    });
    leads.push(lead);
  }
  console.log(`✓ Created ${leads.length} leads`);

  // ==================== QUOTES (15+) ====================
  console.log('Creating quotes...');
  const quoteStatuses = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
  const quotes = [];
  for (let i = 0; i < 15; i++) {
    const lead = leads[i % leads.length];
    const subtotal = 500 + Math.floor(Math.random() * 2000);
    const discount = subtotal > 1000 ? subtotal * 0.1 : 0;
    const tax = (subtotal - discount) * 0.08;

    const quoteNumber = `QT-2024-${String(i + 1).padStart(4, '0')}`;
    const existingQuote = await prisma.quote.findUnique({ where: { quoteNumber } });

    const quote = await prisma.quote.upsert({
      where: { quoteNumber },
      update: {},
      create: {
        quoteNumber,
        leadId: lead.id,
        salesRepId: salesReps[i % salesReps.length].id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal,
        discount,
        tax,
        total: subtotal - discount + tax,
        status: quoteStatuses[Math.floor(Math.random() * quoteStatuses.length)],
        notes: 'Quote includes all labor and materials',
        terms: '50% due at signing, balance due upon completion',
        aiGenerated: Math.random() > 0.5
      }
    });

    // Add line items only if quote was newly created
    if (!existingQuote) {
      await prisma.quoteLineItem.createMany({
        data: [
          { quoteId: quote.id, description: 'Initial Inspection', serviceType: 'INSPECTION', quantity: 1, unitPrice: 100, total: 100 },
          { quoteId: quote.id, description: 'Treatment Service', serviceType: 'TREATMENT', quantity: 1, unitPrice: subtotal - 100, total: subtotal - 100 }
        ]
      });
    }

    quotes.push(quote);
  }
  console.log(`✓ Created ${quotes.length} quotes`);

  // ==================== INSPECTIONS (15+) ====================
  console.log('Creating inspections...');
  const inspectionStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
  const inspections = [];
  for (let i = 0; i < 15; i++) {
    const property = properties[i % properties.length];
    const scheduledDate = new Date(Date.now() + (i - 7) * 24 * 60 * 60 * 1000);
    const status = scheduledDate < new Date() ? 'COMPLETED' : inspectionStatuses[Math.floor(Math.random() * inspectionStatuses.length)];

    const inspection = await prisma.inspection.create({
      data: {
        propertyId: property.id,
        inspectorId: technicians[i % technicians.length].id,
        scheduledDate,
        completedDate: status === 'COMPLETED' ? scheduledDate : null,
        status,
        findings: status === 'COMPLETED' ? { pestActivity: 'moderate', areasAffected: ['kitchen', 'bathroom'], recommendations: ['seal entry points', 'reduce moisture'] } : null,
        photoUrls: status === 'COMPLETED' ? ['/photos/inspection-1.jpg', '/photos/inspection-2.jpg'] : [],
        notes: 'Standard property inspection'
      }
    });
    inspections.push(inspection);
  }
  console.log(`✓ Created ${inspections.length} inspections`);

  // ==================== LICENSES (15+) ====================
  console.log('Creating licenses...');
  const licenseTypes = ['BUSINESS', 'PESTICIDE_APPLICATOR', 'RESTRICTED_USE', 'OPERATOR', 'COMMERCIAL'];
  const licenses = [];

  // Business license
  await prisma.license.create({
    data: { type: 'BUSINESS', licenseNumber: 'BL-GA-2024-001', issuedBy: 'State of Georgia', issuedTo: 'PestControl Pro Inc', issueDate: new Date(2024, 0, 1), expiryDate: new Date(2025, 11, 31), status: 'ACTIVE' }
  });

  // Technician licenses
  for (let i = 0; i < technicians.length; i++) {
    const tech = technicians[i];
    const license = await prisma.license.create({
      data: {
        type: licenseTypes[1 + Math.floor(Math.random() * 4)],
        licenseNumber: `PA-GA-2024-${String(i + 1).padStart(3, '0')}`,
        issuedBy: 'Georgia Department of Agriculture',
        issuedTo: techUsers[i].user.firstName + ' ' + techUsers[i].user.lastName,
        issueDate: new Date(2024, Math.floor(Math.random() * 6), 1),
        expiryDate: new Date(2025, Math.floor(Math.random() * 6) + 6, 28),
        status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING_RENEWAL',
        documentUrl: `/licenses/license-${i + 1}.pdf`
      }
    });
    licenses.push(license);
  }
  console.log(`✓ Created ${licenses.length + 1} licenses`);

  // ==================== PEST ISSUES (20+) ====================
  console.log('Creating pest issues...');
  const severities = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];
  const issueStatuses = ['ACTIVE', 'MONITORING', 'RESOLVED', 'RECURRING'];
  const pestIssues = [];
  for (let i = 0; i < 20; i++) {
    const issue = await prisma.pestIssue.create({
      data: {
        propertyId: properties[i % properties.length].id,
        pestTypeId: pestTypes[i % pestTypes.length].id,
        severity: severities[Math.floor(Math.random() * severities.length)],
        location: ['Kitchen', 'Bathroom', 'Basement', 'Garage', 'Exterior'][Math.floor(Math.random() * 5)],
        description: `${pestTypes[i % pestTypes.length].name} activity detected`,
        firstReported: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: issueStatuses[Math.floor(Math.random() * issueStatuses.length)]
      }
    });
    pestIssues.push(issue);
  }
  console.log(`✓ Created ${pestIssues.length} pest issues`);

  // ==================== FOLLOW-UPS (20+) ====================
  console.log('Creating follow-ups...');
  const followUpTypes = ['CALL', 'EMAIL', 'TEXT', 'VISIT', 'SERVICE_REMINDER', 'SATISFACTION_SURVEY'];
  const followUpStatuses = ['PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'];
  const followUps = [];
  for (let i = 0; i < 20; i++) {
    const followUp = await prisma.followUp.create({
      data: {
        leadId: i < 10 ? leads[i].id : null,
        serviceOrderId: i >= 10 ? serviceOrders[i - 10]?.id : null,
        type: followUpTypes[Math.floor(Math.random() * followUpTypes.length)],
        dueDate: new Date(Date.now() + (Math.random() * 14 - 7) * 24 * 60 * 60 * 1000),
        status: followUpStatuses[Math.floor(Math.random() * followUpStatuses.length)],
        notes: 'Follow up with customer',
        aiGenerated: Math.random() > 0.5
      }
    });
    followUps.push(followUp);
  }
  console.log(`✓ Created ${followUps.length} follow-ups`);

  // ==================== COMMUNICATIONS (15+) ====================
  console.log('Creating communications...');
  const commTypes = ['PHONE', 'EMAIL', 'SMS'];
  const communications = [];
  for (let i = 0; i < 15; i++) {
    const comm = await prisma.communication.create({
      data: {
        customerId: customers[i % customers.length].id,
        type: commTypes[Math.floor(Math.random() * commTypes.length)],
        direction: Math.random() > 0.5 ? 'INBOUND' : 'OUTBOUND',
        subject: 'Service inquiry',
        content: 'Customer communication regarding pest control service',
        status: 'COMPLETED',
        aiHandled: Math.random() > 0.7
      }
    });
    communications.push(comm);
  }
  console.log(`✓ Created ${communications.length} communications`);

  // ==================== ROUTES (15+) ====================
  console.log('Creating routes...');
  const routes = [];
  for (let i = 0; i < 15; i++) {
    const route = await prisma.route.create({
      data: {
        date: new Date(Date.now() + (i - 7) * 24 * 60 * 60 * 1000),
        technicianId: technicians[i % technicians.length].id,
        stops: [
          { order: 1, address: '1234 Main St, Atlanta, GA', estimatedDuration: 45 },
          { order: 2, address: '5678 Oak Ave, Atlanta, GA', estimatedDuration: 60 },
          { order: 3, address: '9012 Pine Ln, Atlanta, GA', estimatedDuration: 45 }
        ],
        totalDistance: 15 + Math.random() * 25,
        totalDuration: 180 + Math.floor(Math.random() * 120),
        status: i < 7 ? 'COMPLETED' : 'PLANNED'
      }
    });
    routes.push(route);
  }
  console.log(`✓ Created ${routes.length} routes`);

  // ==================== SAFETY DATA SHEETS (10+) ====================
  console.log('Creating safety data sheets...');
  for (let i = 0; i < 10; i++) {
    await prisma.safetyDataSheet.create({
      data: {
        productName: products[i].name,
        manufacturer: products[i].manufacturer || 'Unknown',
        revisionDate: new Date(2024, Math.floor(Math.random() * 12), 1),
        documentUrl: `/sds/sds-${products[i].sku}.pdf`,
        hazardClassifications: ['Flammable', 'Toxic to aquatic life'].slice(0, Math.floor(Math.random() * 2) + 1),
        firstAidMeasures: 'If swallowed, call poison control immediately'
      }
    });
  }
  console.log('✓ Created 10 safety data sheets');

  // ==================== PRODUCT REGISTRATIONS (10+) ====================
  console.log('Creating product registrations...');
  for (let i = 0; i < 10; i++) {
    await prisma.productRegistration.create({
      data: {
        productName: products[i].name,
        epaNumber: products[i].epaNumber || `EPA-${Math.floor(Math.random() * 99999)}`,
        stateRegNumber: `GA-REG-${String(i + 1).padStart(5, '0')}`,
        state: 'GA',
        registrationDate: new Date(2024, 0, 1),
        expiryDate: new Date(2025, 11, 31),
        status: 'ACTIVE'
      }
    });
  }
  console.log('✓ Created 10 product registrations');

  // ==================== USAGE REPORTS (5+) ====================
  console.log('Creating usage reports...');
  for (let i = 0; i < 5; i++) {
    await prisma.usageReport.create({
      data: {
        reportPeriod: `2024-Q${i + 1}`,
        productName: products[i].name,
        epaNumber: products[i].epaNumber,
        totalQuantity: 50 + Math.floor(Math.random() * 100),
        unit: products[i].unitOfMeasure,
        applicationCount: 20 + Math.floor(Math.random() * 50),
        reportedBy: admin.firstName + ' ' + admin.lastName,
        submittedAt: i < 3 ? new Date() : null,
        status: i < 3 ? 'SUBMITTED' : 'DRAFT'
      }
    });
  }
  console.log('✓ Created 5 usage reports');

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log(`  - Users: ${techUsers.length + salesRepData.length + 2}`);
  console.log(`  - Technicians: ${technicians.length}`);
  console.log(`  - Sales Reps: ${salesReps.length}`);
  console.log(`  - Territories: ${territories.length}`);
  console.log(`  - Pest Types: ${pestTypes.length}`);
  console.log(`  - Service Types: ${serviceTypes.length}`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Properties: ${properties.length}`);
  console.log(`  - Contracts: ${contracts.length}`);
  console.log(`  - Invoices: ${invoices.length}`);
  console.log(`  - Service Orders: ${serviceOrders.length}`);
  console.log(`  - Leads: ${leads.length}`);
  console.log(`  - Quotes: ${quotes.length}`);
  console.log(`  - Inspections: ${inspections.length}`);
  console.log(`  - Licenses: ${licenses.length + 1}`);
  console.log(`  - Pest Issues: ${pestIssues.length}`);
  console.log(`  - Follow-ups: ${followUps.length}`);
  console.log(`  - Routes: ${routes.length}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
