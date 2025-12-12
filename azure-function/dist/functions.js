"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Main functions file - exports all HTTP triggers
const functions_1 = require("@azure/functions");
const index_1 = require("./query/index");
const index_2 = require("./execute/index");
const index_3 = require("./health/index");
// Register all HTTP triggers
functions_1.app.http('query', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'query',
    handler: index_1.queryHandler
});
functions_1.app.http('execute', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'execute',
    handler: index_2.executeHandler
});
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: index_3.healthHandler
});
//# sourceMappingURL=functions.js.map