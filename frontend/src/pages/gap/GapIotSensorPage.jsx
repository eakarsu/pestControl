// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapIotSensorPage() {
  return (
    <GapFeaturePage
      title="IoT Sensor Integration"
      description="IoT Sensor Integration"
      slug="iot-sensor"
      aiResultKey="reading"
      fields={[
  {
    "name": "sensorId",
    "label": "Sensor ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "reading",
    "label": "Reading (JSON)",
    "type": "json"
  }
]}
    />
  )
}
