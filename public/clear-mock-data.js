// Clear mock KPI templates from localStorage
// Copy and paste this entire code into browser Console (F12) and press Enter

(function clearMockTemplates() {
  console.log('🧹 Clearing mock KPI templates...')

  // Get current templates
  const templatesKey = 'vicc_kpi_templates'
  const templatesJson = localStorage.getItem(templatesKey)

  if (!templatesJson) {
    console.log('✅ No templates found in localStorage')
    return
  }

  try {
    const templates = JSON.parse(templatesJson)
    console.log(`📊 Found ${templates.length} templates`)

    // Filter out system-created mock templates
    const realTemplates = templates.filter(t => t.createdBy !== 'system')

    console.log(`✅ Keeping ${realTemplates.length} real templates (uploaded from Excel)`)
    console.log(`❌ Removing ${templates.length - realTemplates.length} mock templates`)

    // Save filtered templates back
    localStorage.setItem(templatesKey, JSON.stringify(realTemplates))

    console.log('✅ Mock templates cleared successfully!')
    console.log('🔄 Please refresh the page to see changes')

  } catch (error) {
    console.error('❌ Error clearing templates:', error)
  }
})()
