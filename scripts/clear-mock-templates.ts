// Script to clear mock KPI templates from localStorage
// Run this in browser console to remove seed data

export function clearMockTemplates() {
  // Get current templates
  const templatesKey = 'vicc_kpi_templates'
  const templatesJson = localStorage.getItem(templatesKey)

  if (!templatesJson) {
    console.log('✅ No templates found in localStorage')
    return
  }

  const templates = JSON.parse(templatesJson)
  console.log(`Found ${templates.length} templates`)

  // Filter out system-created mock templates
  const realTemplates = templates.filter((t: any) => t.createdBy !== 'system')

  console.log(`Keeping ${realTemplates.length} real templates (uploaded from Excel)`)
  console.log(`Removing ${templates.length - realTemplates.length} mock templates`)

  // Save filtered templates back
  localStorage.setItem(templatesKey, JSON.stringify(realTemplates))

  console.log('✅ Mock templates cleared!')
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('To clear mock templates, run: clearMockTemplates()')
  // Expose to window
  ;(window as any).clearMockTemplates = clearMockTemplates
}
