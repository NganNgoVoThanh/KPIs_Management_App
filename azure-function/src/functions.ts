// Main functions file - exports all HTTP triggers
import { app } from '@azure/functions'
import { queryHandler } from './query/index'
import { executeHandler } from './execute/index'
import { healthHandler } from './health/index'

// Register all HTTP triggers
app.http('query', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'query',
  handler: queryHandler
})

app.http('execute', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'execute',
  handler: executeHandler
})

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler
})
