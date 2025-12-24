// scripts/fix-dynamic-routes.js
// Add "export const dynamic = 'force-dynamic'" to all API routes that need it

const fs = require('fs')
const path = require('path')
const glob = require('glob')

const API_DIR = path.join(__dirname, '..', 'app', 'api')

// Find all route.ts files
const pattern = path.join(API_DIR, '**', 'route.ts').replace(/\\/g, '/')
const files = glob.sync(pattern)

console.log(`Found ${files.length} route files`)

let fixedCount = 0
let alreadyHasCount = 0

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8')

  // Check if already has dynamic export
  if (content.includes("export const dynamic")) {
    alreadyHasCount++
    console.log(`✓ Already has dynamic: ${path.relative(process.cwd(), file)}`)
    return
  }

  // Check if file uses getAuthenticatedUser or request.url
  if (!content.includes('getAuthenticatedUser') && !content.includes('request.url')) {
    console.log(`- Skipping (no auth): ${path.relative(process.cwd(), file)}`)
    return
  }

  // Add dynamic export after imports
  const lines = content.split('\n')
  let insertIndex = 0

  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      insertIndex = i + 1
    }
    // Stop at first non-import, non-comment, non-empty line
    if (lines[i].trim() &&
        !lines[i].trim().startsWith('import') &&
        !lines[i].trim().startsWith('//') &&
        !lines[i].trim().startsWith('/*') &&
        !lines[i].trim().startsWith('*')) {
      break
    }
  }

  // Insert the dynamic export
  lines.splice(insertIndex, 0, '', '// Force dynamic rendering for authenticated routes', "export const dynamic = 'force-dynamic'", '')

  const newContent = lines.join('\n')
  fs.writeFileSync(file, newContent, 'utf8')

  fixedCount++
  console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`)
})

console.log('\n' + '='.repeat(60))
console.log(`Summary:`)
console.log(`  Total files: ${files.length}`)
console.log(`  Already had dynamic: ${alreadyHasCount}`)
console.log(`  Fixed: ${fixedCount}`)
console.log(`  Skipped: ${files.length - alreadyHasCount - fixedCount}`)
console.log('='.repeat(60))
