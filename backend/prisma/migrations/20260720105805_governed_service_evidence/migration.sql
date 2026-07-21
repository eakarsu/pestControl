-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TECHNICIAN', 'SALES', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PROSPECT');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'MULTI_FAMILY', 'APARTMENT', 'CONDO', 'COMMERCIAL', 'INDUSTRIAL', 'WAREHOUSE', 'RESTAURANT', 'OFFICE', 'RETAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'SEVERE');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED', 'RECURRING');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('ONE_TIME', 'RECURRING', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('GENERAL', 'TERMITE', 'RODENT', 'MOSQUITO', 'BED_BUG', 'WILDLIFE', 'FUMIGATION', 'INSPECTION', 'PREVENTION');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('BUSINESS', 'PESTICIDE_APPLICATOR', 'RESTRICTED_USE', 'OPERATOR', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING_RENEWAL');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'PHONE', 'REFERRAL', 'ADVERTISING', 'SOCIAL_MEDIA', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'INSPECTION_SCHEDULED', 'QUOTED', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'TEXT', 'VISIT', 'SERVICE_REMINDER', 'PAYMENT_REMINDER', 'SATISFACTION_SURVEY');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'CHAT');

-- CreateEnum
CREATE TYPE "EvidenceAccessLevel" AS ENUM ('READ', 'CONTRIBUTE', 'REVIEW', 'ADMINISTER');

-- CreateEnum
CREATE TYPE "EvidenceDocumentKind" AS ENUM ('SERVICE_REPORT', 'TREATMENT_PLAN', 'INSPECTION_REPORT', 'SAFETY_DATA_SHEET', 'LICENSE', 'CONTRACT', 'EXPORT_MANIFEST');

-- CreateEnum
CREATE TYPE "EvidenceDocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SIGNATURE_PENDING', 'SIGNED', 'FILED', 'RETAINED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "EvidenceReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceOcrStatus" AS ENUM ('NOT_REQUESTED', 'QUEUED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExternalConnectorKind" AS ENUM ('OCR', 'ESIGN', 'FILING', 'STORAGE', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ExternalOperationType" AS ENUM ('OCR_EXTRACT', 'ESIGN_SEND', 'FILE_RECORD', 'STORE_EXPORT', 'DELETE_OBJECT', 'TEMPLATE_REFRESH');

-- CreateEnum
CREATE TYPE "ExternalOperationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'RETRY', 'COMPLETED', 'DEAD_LETTER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureEnvelopeStatus" AS ENUM ('CREATED', 'SENT', 'SIGNED', 'DECLINED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "LegalHoldStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateEnum
CREATE TYPE "EvidenceDispositionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'QUEUED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'RESIDENTIAL',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "referralSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'SINGLE_FAMILY',
    "squareFootage" INTEGER,
    "yearBuilt" INTEGER,
    "accessNotes" TEXT,
    "gateCode" TEXT,
    "hasPets" BOOLEAN NOT NULL DEFAULT false,
    "petDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestIssue" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "pestTypeId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MODERATE',
    "location" TEXT NOT NULL,
    "description" TEXT,
    "firstReported" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObserved" TIMESTAMP(3),
    "status" "IssueStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoUrls" TEXT[],
    "aiIdentified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PestIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "commonTreatments" TEXT[],
    "seasonalPeak" TEXT[],
    "riskLevel" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL DEFAULT 'RECURRING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "billingFrequency" "BillingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "contractValue" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "terms" TEXT,
    "signedDate" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "serviceOrderId" TEXT,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL DEFAULT 'GENERAL',
    "basePrice" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "ServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "technicianId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT,
    "activeIngredient" TEXT,
    "concentration" TEXT,
    "epaNumber" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "inStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "safetyDataSheetUrl" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentRecord" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "pestIssueId" TEXT,
    "productId" TEXT NOT NULL,
    "applicationMethod" TEXT NOT NULL,
    "areasTreated" TEXT[],
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "dilutionRate" TEXT,
    "targetPests" TEXT[],
    "weatherConditions" TEXT,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedById" TEXT NOT NULL,

    CONSTRAINT "TreatmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contractId" TEXT,
    "serviceTypeId" TEXT NOT NULL,
    "technicianId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTimeStart" TEXT,
    "scheduledTimeEnd" TEXT,
    "completedDate" TIMESTAMP(3),
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "isRetreatment" BOOLEAN NOT NULL DEFAULT false,
    "originalOrderId" TEXT,
    "customerNotes" TEXT,
    "technicianNotes" TEXT,
    "internalNotes" TEXT,
    "signatureUrl" TEXT,
    "signedBy" TEXT,
    "signedAt" TIMESTAMP(3),
    "photoUrls" TEXT[],
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUsage" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "applicationRate" TEXT,
    "areasTreated" TEXT[],
    "notes" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "certifications" TEXT[],
    "specializations" TEXT[],
    "vehicleId" TEXT,
    "territoryId" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianSchedule" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "TechnicianSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "zipCodes" TEXT[],
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "technicianId" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "totalDistance" DOUBLE PRECISION,
    "totalDuration" INTEGER,
    "optimizedAt" TIMESTAMP(3),
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRegistration" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "epaNumber" TEXT NOT NULL,
    "stateRegNumber" TEXT,
    "state" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyDataSheet" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "revisionDate" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "hazardClassifications" TEXT[],
    "firstAidMeasures" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyDataSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageReport" (
    "id" TEXT NOT NULL,
    "reportPeriod" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "epaNumber" TEXT,
    "totalQuantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "applicationCount" INTEGER NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "companyName" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "pestConcerns" TEXT[],
    "notes" TEXT,
    "assignedToId" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "quota" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "propertyId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "findings" JSONB,
    "photoUrls" TEXT[],
    "reportUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "salesRepId" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "terms" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceType" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT,
    "notes" TEXT,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "serviceOrderId" TEXT,
    "type" "FollowUpType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT,
    "aiHandled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentRecommendation" (
    "id" TEXT NOT NULL,
    "pestTypeId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "season" TEXT NOT NULL,
    "recommendedProducts" TEXT[],
    "applicationMethods" TEXT[],
    "frequency" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "effectivenessScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalPrediction" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "zipCode" TEXT,
    "pestType" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "factors" TEXT[],
    "recommendations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestIdentification" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "identifiedPest" TEXT,
    "confidence" DOUBLE PRECISION,
    "alternativePests" JSONB,
    "recommendations" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PestIdentification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_access_grants" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "EvidenceAccessLevel" NOT NULL,
    "privilegedAccess" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "revokeReason" TEXT,

    CONSTRAINT "service_order_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_evidence_documents" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "kind" "EvidenceDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "EvidenceDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "privileged" BOOLEAN NOT NULL DEFAULT false,
    "jurisdiction" TEXT NOT NULL,
    "effectiveDate" TIMESTAMPTZ(3) NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "retentionPolicyId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_evidence_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_evidence_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageObjectKey" TEXT NOT NULL,
    "storageVersion" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "ocrStatus" "EvidenceOcrStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "ocrTextHash" TEXT,
    "redactedFromVersionId" TEXT,
    "redactionManifest" JSONB,
    "templateVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_evidence_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_reviews" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "EvidenceReviewDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "jurisdictionValidated" BOOLEAN NOT NULL,
    "effectiveDateValidated" BOOLEAN NOT NULL,
    "productRegistrationChecked" BOOLEAN NOT NULL,
    "safetyDataChecked" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authoritative_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EvidenceDocumentKind" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authoritative_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authoritative_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageObjectKey" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3) NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authoritative_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_connectors" (
    "id" TEXT NOT NULL,
    "kind" "ExternalConnectorKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "credentialRef" TEXT NOT NULL,
    "webhookSecretRef" TEXT,
    "serviceUserId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_operations" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "documentId" TEXT,
    "versionId" TEXT,
    "type" "ExternalOperationType" NOT NULL,
    "status" "ExternalOperationStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "providerReceipt" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_envelopes" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "SignatureEnvelopeStatus" NOT NULL DEFAULT 'CREATED',
    "signers" JSONB NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "signedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "signature_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "documentKind" "EvidenceDocumentKind" NOT NULL,
    "retainDays" INTEGER NOT NULL,
    "dispositionReviewDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_holds" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "LegalHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "placedById" TEXT NOT NULL,
    "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT,
    "releaseReason" TEXT,
    "releasedAt" TIMESTAMPTZ(3),

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_exports" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "storageProvider" TEXT,
    "storageObjectKey" TEXT,
    "providerReceipt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "evidence_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_dispositions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reason" TEXT NOT NULL,
    "status" "EvidenceDispositionStatus" NOT NULL DEFAULT 'REQUESTED',
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "evidence_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_audit_events" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "previousHash" TEXT NOT NULL,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PestType_name_key" ON "PestType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_orderNumber_key" ON "ServiceOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_employeeId_key" ON "Technician"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianSchedule_technicianId_date_key" ON "TechnicianSchedule"("technicianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_name_key" ON "Territory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_userId_key" ON "SalesRep"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_employeeId_key" ON "SalesRep"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalPrediction_region_pestType_month_year_key" ON "SeasonalPrediction"("region", "pestType", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Configuration_category_idx" ON "Configuration"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_category_value_key" ON "Configuration"("category", "value");

-- CreateIndex
CREATE INDEX "service_order_access_grants_userId_revokedAt_idx" ON "service_order_access_grants"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_access_grants_serviceOrderId_userId_key" ON "service_order_access_grants"("serviceOrderId", "userId");

-- CreateIndex
CREATE INDEX "service_evidence_documents_serviceOrderId_status_idx" ON "service_evidence_documents"("serviceOrderId", "status");

-- CreateIndex
CREATE INDEX "service_evidence_documents_retentionPolicyId_idx" ON "service_evidence_documents"("retentionPolicyId");

-- CreateIndex
CREATE INDEX "service_evidence_versions_contentHash_idx" ON "service_evidence_versions"("contentHash");

-- CreateIndex
CREATE INDEX "service_evidence_versions_createdById_idx" ON "service_evidence_versions"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "service_evidence_versions_documentId_version_key" ON "service_evidence_versions"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "service_evidence_versions_storageProvider_storageObjectKey__key" ON "service_evidence_versions"("storageProvider", "storageObjectKey", "storageVersion");

-- CreateIndex
CREATE INDEX "evidence_reviews_documentId_createdAt_idx" ON "evidence_reviews"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_reviews_versionId_reviewerId_key" ON "evidence_reviews"("versionId", "reviewerId");

-- CreateIndex
CREATE INDEX "authoritative_templates_kind_jurisdiction_active_idx" ON "authoritative_templates"("kind", "jurisdiction", "active");

-- CreateIndex
CREATE UNIQUE INDEX "authoritative_templates_sourceSystem_externalId_key" ON "authoritative_templates"("sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "authoritative_template_versions_effectiveFrom_effectiveTo_idx" ON "authoritative_template_versions"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "authoritative_template_versions_templateId_version_key" ON "authoritative_template_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "external_connectors_enabled_idx" ON "external_connectors"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "external_connectors_kind_provider_key" ON "external_connectors"("kind", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "external_operations_idempotencyKey_key" ON "external_operations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "external_operations_status_nextAttemptAt_idx" ON "external_operations"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "external_operations_leaseExpiresAt_idx" ON "external_operations"("leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "signature_envelopes_externalId_key" ON "signature_envelopes"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "signature_envelopes_idempotencyKey_key" ON "signature_envelopes"("idempotencyKey");

-- CreateIndex
CREATE INDEX "signature_envelopes_documentId_status_idx" ON "signature_envelopes"("documentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_name_key" ON "retention_policies"("name");

-- CreateIndex
CREATE INDEX "retention_policies_jurisdiction_documentKind_active_idx" ON "retention_policies"("jurisdiction", "documentKind", "active");

-- CreateIndex
CREATE INDEX "legal_holds_serviceOrderId_status_idx" ON "legal_holds"("serviceOrderId", "status");

-- CreateIndex
CREATE INDEX "legal_holds_documentId_status_idx" ON "legal_holds"("documentId", "status");

-- CreateIndex
CREATE INDEX "evidence_exports_serviceOrderId_createdAt_idx" ON "evidence_exports"("serviceOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "evidence_dispositions_documentId_status_idx" ON "evidence_dispositions"("documentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_audit_events_eventHash_key" ON "evidence_audit_events"("eventHash");

-- CreateIndex
CREATE INDEX "evidence_audit_events_entityType_entityId_createdAt_idx" ON "evidence_audit_events"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_audit_events_serviceOrderId_sequence_key" ON "evidence_audit_events"("serviceOrderId", "sequence");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PestIssue" ADD CONSTRAINT "PestIssue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PestIssue" ADD CONSTRAINT "PestIssue_pestTypeId_fkey" FOREIGN KEY ("pestTypeId") REFERENCES "PestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_pestIssueId_fkey" FOREIGN KEY ("pestIssueId") REFERENCES "PestIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUsage" ADD CONSTRAINT "ProductUsage_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUsage" ADD CONSTRAINT "ProductUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianSchedule" ADD CONSTRAINT "TechnicianSchedule_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecommendation" ADD CONSTRAINT "TreatmentRecommendation_pestTypeId_fkey" FOREIGN KEY ("pestTypeId") REFERENCES "PestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_access_grants" ADD CONSTRAINT "service_order_access_grants_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_access_grants" ADD CONSTRAINT "service_order_access_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_access_grants" ADD CONSTRAINT "service_order_access_grants_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_documents" ADD CONSTRAINT "service_evidence_documents_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_documents" ADD CONSTRAINT "service_evidence_documents_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "retention_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_versions" ADD CONSTRAINT "service_evidence_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_versions" ADD CONSTRAINT "service_evidence_versions_redactedFromVersionId_fkey" FOREIGN KEY ("redactedFromVersionId") REFERENCES "service_evidence_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_versions" ADD CONSTRAINT "service_evidence_versions_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "authoritative_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_evidence_versions" ADD CONSTRAINT "service_evidence_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "service_evidence_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authoritative_template_versions" ADD CONSTRAINT "authoritative_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "authoritative_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_connectors" ADD CONSTRAINT "external_connectors_serviceUserId_fkey" FOREIGN KEY ("serviceUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_operations" ADD CONSTRAINT "external_operations_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "external_connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_operations" ADD CONSTRAINT "external_operations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_operations" ADD CONSTRAINT "external_operations_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "service_evidence_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "service_evidence_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "external_connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_exports" ADD CONSTRAINT "evidence_exports_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_exports" ADD CONSTRAINT "evidence_exports_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dispositions" ADD CONSTRAINT "evidence_dispositions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "service_evidence_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dispositions" ADD CONSTRAINT "evidence_dispositions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dispositions" ADD CONSTRAINT "evidence_dispositions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_audit_events" ADD CONSTRAINT "evidence_audit_events_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants that Prisma cannot express.
ALTER TABLE "service_evidence_documents" ADD CONSTRAINT "service_evidence_documents_current_version_positive" CHECK ("currentVersion" >= 0);
ALTER TABLE "service_evidence_versions"
  ADD CONSTRAINT "service_evidence_versions_version_positive" CHECK (version > 0),
  ADD CONSTRAINT "service_evidence_versions_byte_size_positive" CHECK ("byteSize" > 0),
  ADD CONSTRAINT "service_evidence_versions_hash_shape" CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "service_evidence_versions_ocr_hash_shape" CHECK ("ocrTextHash" IS NULL OR "ocrTextHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "external_operations"
  ADD CONSTRAINT "external_operations_attempt_bounds" CHECK (attempts >= 0 AND "maxAttempts" BETWEEN 1 AND 20),
  ADD CONSTRAINT "external_operations_payload_hash_shape" CHECK ("payloadHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_days_nonnegative" CHECK ("retainDays" >= 0 AND "dispositionReviewDays" >= 0);
ALTER TABLE "authoritative_template_versions"
  ADD CONSTRAINT "authoritative_template_versions_dates_valid" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  ADD CONSTRAINT "authoritative_template_versions_hash_shape" CHECK ("contentHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "evidence_dispositions" ADD CONSTRAINT "evidence_dispositions_separate_reviewer" CHECK ("reviewedById" IS NULL OR "reviewedById" <> "requestedById");
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_release_consistent" CHECK (
  (status = 'ACTIVE' AND "releasedAt" IS NULL AND "releasedById" IS NULL)
  OR (status = 'RELEASED' AND "releasedAt" IS NOT NULL AND "releasedById" IS NOT NULL AND "releaseReason" IS NOT NULL)
);
ALTER TABLE "service_order_access_grants" ADD CONSTRAINT "service_order_access_grants_revocation_consistent" CHECK (
  ("revokedAt" IS NULL AND "revokeReason" IS NULL) OR ("revokedAt" IS NOT NULL AND "revokeReason" IS NOT NULL)
);

CREATE OR REPLACE FUNCTION reject_immutable_evidence_row() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'governed evidence is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_audit_immutable BEFORE UPDATE OR DELETE ON "evidence_audit_events" FOR EACH ROW EXECUTE FUNCTION reject_immutable_evidence_row();
CREATE TRIGGER evidence_reviews_immutable BEFORE UPDATE OR DELETE ON "evidence_reviews" FOR EACH ROW EXECUTE FUNCTION reject_immutable_evidence_row();
CREATE TRIGGER template_versions_immutable BEFORE UPDATE OR DELETE ON "authoritative_template_versions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_evidence_row();

CREATE OR REPLACE FUNCTION restrict_evidence_version_updates() RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW) - 'ocrStatus' - 'ocrTextHash') <> (to_jsonb(OLD) - 'ocrStatus' - 'ocrTextHash') THEN
    RAISE EXCEPTION 'evidence version provenance is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_versions_immutable_except_ocr BEFORE UPDATE ON "service_evidence_versions" FOR EACH ROW EXECUTE FUNCTION restrict_evidence_version_updates();
CREATE TRIGGER evidence_versions_no_delete BEFORE DELETE ON "service_evidence_versions" FOR EACH ROW EXECUTE FUNCTION reject_immutable_evidence_row();

CREATE OR REPLACE FUNCTION enforce_separate_evidence_reviewer() RETURNS trigger AS $$
DECLARE creator_id text;
BEGIN
  SELECT "createdById" INTO creator_id FROM "service_evidence_versions" WHERE id = NEW."versionId";
  IF creator_id = NEW."reviewerId" THEN RAISE EXCEPTION 'evidence author cannot review their own version'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_review_separation BEFORE INSERT ON "evidence_reviews" FOR EACH ROW EXECUTE FUNCTION enforce_separate_evidence_reviewer();
