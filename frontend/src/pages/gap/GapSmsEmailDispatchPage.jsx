// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapSmsEmailDispatchPage() {
  return (
    <GapFeaturePage
      title="SMS/Email Customer Notifications"
      description="SMS/Email Customer Notifications"
      slug="sms-email-dispatch"
      aiResultKey="message"
      fields={[
  {
    "name": "customerId",
    "label": "Customer ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "channel",
    "label": "Channel (sms/email)",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "body",
    "label": "Body",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
