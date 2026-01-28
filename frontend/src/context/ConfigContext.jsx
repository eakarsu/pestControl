import { createContext, useContext, useState, useEffect } from 'react';
import { configService } from '../services/api';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [dropdowns, setDropdowns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      const response = await configService.getDropdowns();
      setDropdowns(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dropdown configurations:', err);
      setError('Failed to load configuration');
      // Set default values as fallback
      setDropdowns(getDefaultDropdowns());
    } finally {
      setLoading(false);
    }
  };

  const refreshDropdowns = () => {
    loadDropdowns();
  };

  // Helper function to get options by key
  const getOptions = (key) => {
    return dropdowns[key] || [];
  };

  // Helper to get label for a value
  const getLabel = (key, value) => {
    const options = dropdowns[key] || [];
    const option = options.find(o => o.value === value);
    return option ? option.label : value;
  };

  return (
    <ConfigContext.Provider value={{
      dropdowns,
      loading,
      error,
      refreshDropdowns,
      getOptions,
      getLabel
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Default dropdowns as fallback
function getDefaultDropdowns() {
  return {
    customerTypes: [
      { value: 'RESIDENTIAL', label: 'Residential' },
      { value: 'COMMERCIAL', label: 'Commercial' },
      { value: 'INDUSTRIAL', label: 'Industrial' }
    ],
    customerStatuses: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'SUSPENDED', label: 'Suspended' },
      { value: 'PROSPECT', label: 'Prospect' }
    ],
    propertyTypes: [
      { value: 'SINGLE_FAMILY', label: 'Single Family' },
      { value: 'MULTI_FAMILY', label: 'Multi Family' },
      { value: 'APARTMENT', label: 'Apartment' },
      { value: 'CONDO', label: 'Condo' },
      { value: 'COMMERCIAL', label: 'Commercial' },
      { value: 'INDUSTRIAL', label: 'Industrial' },
      { value: 'WAREHOUSE', label: 'Warehouse' },
      { value: 'RESTAURANT', label: 'Restaurant' },
      { value: 'OFFICE', label: 'Office' },
      { value: 'RETAIL', label: 'Retail' },
      { value: 'OTHER', label: 'Other' }
    ],
    severities: [
      { value: 'LOW', label: 'Low' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'SEVERE', label: 'Severe' }
    ],
    contractTypes: [
      { value: 'ONE_TIME', label: 'One Time' },
      { value: 'RECURRING', label: 'Recurring' },
      { value: 'ANNUAL', label: 'Annual' }
    ],
    billingFrequencies: [
      { value: 'ONE_TIME', label: 'One Time' },
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
      { value: 'MONTHLY', label: 'Monthly' },
      { value: 'QUARTERLY', label: 'Quarterly' },
      { value: 'ANNUALLY', label: 'Annually' }
    ],
    contractStatuses: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'SUSPENDED', label: 'Suspended' }
    ],
    invoiceStatuses: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'SENT', label: 'Sent' },
      { value: 'PAID', label: 'Paid' },
      { value: 'PARTIAL', label: 'Partial' },
      { value: 'OVERDUE', label: 'Overdue' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ],
    paymentMethods: [
      { value: 'CASH', label: 'Cash' },
      { value: 'CHECK', label: 'Check' },
      { value: 'CREDIT_CARD', label: 'Credit Card' },
      { value: 'DEBIT_CARD', label: 'Debit Card' },
      { value: 'ACH', label: 'ACH' },
      { value: 'OTHER', label: 'Other' }
    ],
    serviceOrderStatuses: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'EN_ROUTE', label: 'En Route' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'RESCHEDULED', label: 'Rescheduled' }
    ],
    priorities: [
      { value: 'LOW', label: 'Low' },
      { value: 'NORMAL', label: 'Normal' },
      { value: 'HIGH', label: 'High' },
      { value: 'URGENT', label: 'Urgent' }
    ],
    leadSources: [
      { value: 'WEBSITE', label: 'Website' },
      { value: 'PHONE', label: 'Phone' },
      { value: 'REFERRAL', label: 'Referral' },
      { value: 'ADVERTISING', label: 'Advertising' },
      { value: 'SOCIAL_MEDIA', label: 'Social Media' },
      { value: 'PARTNER', label: 'Partner' },
      { value: 'OTHER', label: 'Other' }
    ],
    leadStatuses: [
      { value: 'NEW', label: 'New' },
      { value: 'CONTACTED', label: 'Contacted' },
      { value: 'QUALIFIED', label: 'Qualified' },
      { value: 'INSPECTION_SCHEDULED', label: 'Inspection Scheduled' },
      { value: 'QUOTED', label: 'Quoted' },
      { value: 'NEGOTIATION', label: 'Negotiation' },
      { value: 'WON', label: 'Won' },
      { value: 'LOST', label: 'Lost' }
    ],
    quoteStatuses: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'SENT', label: 'Sent' },
      { value: 'VIEWED', label: 'Viewed' },
      { value: 'ACCEPTED', label: 'Accepted' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'EXPIRED', label: 'Expired' }
    ],
    inspectionStatuses: [
      { value: 'SCHEDULED', label: 'Scheduled' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ],
    inspectionTypes: [
      { value: 'INITIAL', label: 'Initial Inspection' },
      { value: 'FOLLOW_UP', label: 'Follow-up' },
      { value: 'ANNUAL', label: 'Annual' },
      { value: 'COMPLAINT', label: 'Complaint' },
      { value: 'TERMITE', label: 'Termite Inspection' },
      { value: 'WDO', label: 'WDO Report' }
    ],
    licenseTypes: [
      { value: 'BUSINESS', label: 'Business License' },
      { value: 'PESTICIDE_APPLICATOR', label: 'Pesticide Applicator' },
      { value: 'RESTRICTED_USE', label: 'Restricted Use' },
      { value: 'OPERATOR', label: 'Operator' },
      { value: 'COMMERCIAL', label: 'Commercial' }
    ],
    licenseStatuses: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'SUSPENDED', label: 'Suspended' },
      { value: 'PENDING_RENEWAL', label: 'Pending Renewal' }
    ],
    productCategories: [
      { value: 'INSECTICIDE', label: 'Insecticide' },
      { value: 'RODENTICIDE', label: 'Rodenticide' },
      { value: 'HERBICIDE', label: 'Herbicide' },
      { value: 'FUNGICIDE', label: 'Fungicide' },
      { value: 'BAIT', label: 'Bait' },
      { value: 'TRAP', label: 'Trap' },
      { value: 'EQUIPMENT', label: 'Equipment' },
      { value: 'SAFETY', label: 'Safety Gear' },
      { value: 'OTHER', label: 'Other' }
    ],
    unitsOfMeasure: [
      { value: 'oz', label: 'Ounces (oz)' },
      { value: 'lb', label: 'Pounds (lb)' },
      { value: 'gal', label: 'Gallons (gal)' },
      { value: 'qt', label: 'Quarts (qt)' },
      { value: 'pt', label: 'Pints (pt)' },
      { value: 'ml', label: 'Milliliters (ml)' },
      { value: 'L', label: 'Liters (L)' },
      { value: 'g', label: 'Grams (g)' },
      { value: 'kg', label: 'Kilograms (kg)' },
      { value: 'each', label: 'Each' },
      { value: 'box', label: 'Box' },
      { value: 'case', label: 'Case' }
    ]
  };
}

export default ConfigContext;
