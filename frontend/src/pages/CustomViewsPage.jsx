import React from 'react';
import 'leaflet/dist/leaflet.css';
import ServiceAreaMap from '../components/ServiceAreaMap';
import TreatmentCalendar from '../components/TreatmentCalendar';
import ServiceReportPDF from '../components/ServiceReportPDF';
import ChemicalInventoryTracker from '../components/ChemicalInventoryTracker';

const CustomViewsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pest Views</h1>
        <p className="text-gray-500">Custom domain views for pest control operations.</p>
      </div>
      <ServiceAreaMap />
      <TreatmentCalendar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceReportPDF />
        <ChemicalInventoryTracker />
      </div>
    </div>
  );
};

export default CustomViewsPage;
