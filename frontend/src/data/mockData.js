
// ── Fallback responses shown when backend is offline ──────
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
