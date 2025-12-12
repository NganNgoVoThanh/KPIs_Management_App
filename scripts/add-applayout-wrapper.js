// scripts/add-applayout-wrapper.js - Add AppLayout wrapper to pages
const fs = require('fs')
const path = require('path')

const PAGES_TO_UPDATE = [
  'app/kpis/page.tsx',
  'app/reports/page.tsx',
  'app/cycles/page.tsx',
  'app/admin/page.tsx',
  'app/admin/kpi-library/page.tsx'
]

const IMPORT_TO_ADD = `import { AppLayout } from "@/components/layout/app-layout"\nimport { Loader2 } from "lucide-react"`

function wrapWithAppLayout(content, filePath) {
  // Check if already has AppLayout
  if (content.includes('import { AppLayout }') || content.includes('from "@/components/layout/app-layout"')) {
    console.log(`  ✓ ${filePath} already has AppLayout`)
    return null
  }

  // Add import at the top (after "use client" if exists)
  let updatedContent = content

  // Find where to insert import
  const useClientMatch = content.match(/"use client"\s*\n/)
  if (useClientMatch) {
    const insertPos = useClientMatch.index + useClientMatch[0].length
    const beforeImport = content.substring(0, insertPos)
    const afterImport = content.substring(insertPos)

    // Check if there are existing imports
    const firstImportMatch = afterImport.match(/\nimport/)
    if (firstImportMatch) {
      updatedContent = beforeImport + '\n' + IMPORT_TO_ADD + afterImport
    }
  }

  // Find the main return statement and wrap it
  // Look for patterns like: return (\n  <div className="min-h-screen
  const returnMatch = updatedContent.match(/return \(\s*\n\s*<div className="min-h-screen[^>]*>/m)

  if (returnMatch) {
    // Replace min-h-screen div with AppLayout wrapper
    updatedContent = updatedContent.replace(
      /return \(\s*\n\s*<div className="min-h-screen[^>]*>/m,
      'return (\n    <AppLayout>\n      <div className="p-6">'
    )

    // Find the matching closing </div> before the last )
    // This is tricky, so let's just add the closing tag before the last return )
    const lastReturnParen = updatedContent.lastIndexOf('\n  )\n}')
    if (lastReturnParen > 0) {
      updatedContent =
        updatedContent.substring(0, lastReturnParen) +
        '\n      </div>\n    </AppLayout>' +
        updatedContent.substring(lastReturnParen)
    }
  }

  // Also handle loading states
  updatedContent = updatedContent.replace(
    /<div className="min-h-screen[^"]*"[^>]*>\s*<div className="(?:flex items-center justify-center|text-center)">/g,
    '<AppLayout>\n        <div className="flex items-center justify-center h-96">'
  )

  updatedContent = updatedContent.replace(
    /<div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4"><\/div>/g,
    '<Loader2 className="h-8 w-8 text-red-600 animate-spin" />'
  )

  return updatedContent
}

async function main() {
  console.log('=== Adding AppLayout to Pages ===\n')

  for (const pagePath of PAGES_TO_UPDATE) {
    const fullPath = path.join(process.cwd(), pagePath)

    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠ ${pagePath} not found, skipping...`)
      continue
    }

    console.log(`Processing ${pagePath}...`)

    const content = fs.readFileSync(fullPath, 'utf-8')
    const updated = wrapWithAppLayout(content, pagePath)

    if (updated && updated !== content) {
      // Create backup
      fs.writeFileSync(fullPath + '.backup', content)
      // Write updated content
      fs.writeFileSync(fullPath, updated)
      console.log(`  ✓ Updated ${pagePath} (backup created)`)
    } else if (!updated) {
      // Already has AppLayout
      continue
    } else {
      console.log(`  - No changes needed for ${pagePath}`)
    }
  }

  console.log('\n=== Done ===')
  console.log('\nNOTE: Please review the changes manually.')
  console.log('Backups have been created with .backup extension.')
}

main().catch(console.error)
