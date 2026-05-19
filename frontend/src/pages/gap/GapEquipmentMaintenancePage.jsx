// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapEquipmentMaintenancePage() {
  return (
    <GapFeaturePage
      title="Equipment Maintenance Scheduler"
      description="Equipment Maintenance Scheduler"
      slug="equipment-maintenance"
      aiResultKey="schedule"
      fields={[
  {
    "name": "equipment",
    "label": "Equipment",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "mileage",
    "label": "Mileage/Hours",
    "type": "number"
  },
  {
    "name": "lastService",
    "label": "Last Service Date",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
