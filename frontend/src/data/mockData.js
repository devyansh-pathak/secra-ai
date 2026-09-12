// All mock data lives here — swap with real API calls via services/api.js

export const MOCK_DOCS = [
  { id: 1, name: 'Pump Maintenance SOP', type: 'SOP',    status: 'ready',      ext: 'pdf' },
  { id: 2, name: 'Refinery Safety Manual 2024', type: 'Manual', status: 'ready', ext: 'pdf' },
  { id: 3, name: 'Compressor Inspection Guide', type: 'Manual', status: 'processing', ext: 'docx' },
  { id: 4, name: 'Equipment Inspection Report Q3-2026', type: 'Report', status: 'ready', ext: 'pdf' },
  { id: 5, name: 'Fire Safety Evacuation Procedure', type: 'SOP', status: 'ready', ext: 'pdf' },
  { id: 6, name: 'Heat Exchanger Maintenance SOP', type: 'SOP', status: 'warn', ext: 'docx' },
]

export const MOCK_CONVERSATIONS = [
  { id: 0, title: 'Pump vibration analysis', group: 'Today' },
  { id: 1, title: 'Safety procedure for compressor', group: 'Today' },
  { id: 2, title: 'Crude unit SOP question', group: 'Today' },
  { id: 3, title: 'Heat exchanger inspection', group: 'Yesterday' },
  { id: 4, title: 'Maintenance checklist — V-203', group: 'Yesterday' },
  { id: 5, title: 'Fire safety evacuation SOP', group: 'Earlier' },
  { id: 6, title: 'Corrosion allowance values', group: 'Earlier' },
]

export const MOCK_RESPONSES = {
  default: {
    text: `Based on the available refinery documents, the standard procedure recommends a scheduled inspection every 3 months for rotating equipment, with an intermediate visual check at 6-week intervals.\n\nAny detected anomalies — such as unusual vibration, increased temperature, or abnormal noise — should be escalated immediately per the maintenance escalation protocol.`,
    sources: [
      { name: 'Pump Maintenance SOP', page: 'Page 14', section: 'Section 4.2' },
      { name: 'Equipment Inspection Manual', page: 'Page 27', section: 'Section 6.1' },
    ],
    safety: true,
  },
  checklist: {
    text: `Here is a maintenance checklist for the requested equipment:\n\n1. Visual inspection for leaks, corrosion, or physical damage\n2. Check bearing temperature — should be below 70°C\n3. Record vibration readings and compare against baseline\n4. Inspect seals and gaskets\n5. Verify alignment using dial gauge\n6. Check lubrication levels\n7. Test safety relief valves\n8. Log all findings in the maintenance register`,
    sources: [{ name: 'Pump Maintenance SOP', page: 'Page 8', section: 'Section 2.1' }],
    safety: false,
  },
  sop: {
    text: `The procedure specifies that before any maintenance work begins, the equipment must be properly isolated, de-pressurized, and locked out per the LOTO (Lock-Out Tag-Out) procedure.\n\nA permit-to-work must be obtained from the shift supervisor. Appropriate PPE must be worn throughout the duration of work.`,
    sources: [
      { name: 'Refinery Safety Manual 2024', page: 'Page 42', section: 'Section 8.3' },
      { name: 'Pump Maintenance SOP', page: 'Page 3', section: 'Section 1.2' },
    ],
    safety: true,
  },
  uncertain: { uncertain: true },
}

export const AUDIT_LOGS = [
  { time: '10:42', user: 'Engineer 1042', activity: 'Asked about pump maintenance', role: 'Engineer' },
  { time: '10:38', user: 'Safety 2041',   activity: 'Viewed Safety SOP — compressor',role: 'Safety'   },
  { time: '10:31', user: 'Engineer 1042', activity: 'Uploaded inspection report',    role: 'Engineer' },
  { time: '10:22', user: 'Manager 0301',  activity: 'Generated operational summary', role: 'Manager'  },
  { time: '10:14', user: 'Pari (ENG-1042)', activity: 'Signed in',                  role: 'Engineer' },
  { time: '09:58', user: 'Safety 2041',   activity: 'Analyzed equipment image',     role: 'Safety'   },
  { time: '09:40', user: 'Engineer 0876', activity: 'Asked about heat exchanger',   role: 'Engineer' },
]
