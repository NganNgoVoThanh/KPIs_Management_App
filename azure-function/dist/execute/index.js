"use strict";
// Azure Function: Execute Non-Query
// Handles INSERT, UPDATE, DELETE operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeHandler = executeHandler;
const functions_1 = require("@azure/functions");
const connection_1 = require("../lib/connection");
async function executeHandler(request, context) {
    const startTime = Date.now();
    try {
        const body = await request.json();
        if (!body.query) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Query is required'
                }
            };
        }
        context.log(`Executing non-query: ${body.query}`);
        const pool = await (0, connection_1.getConnectionPool)();
        const sqlRequest = pool.request();
        // Note: timeout is configured at pool level in connection.ts
        if (body.params) {
            Object.entries(body.params).forEach(([key, value]) => {
                sqlRequest.input(key, value);
            });
        }
        const result = await sqlRequest.query(body.query);
        const executionTime = Date.now() - startTime;
        context.log(`Execute completed in ${executionTime}ms, rows affected: ${result.rowsAffected}`);
        return {
            status: 200,
            jsonBody: {
                success: true,
                rowsAffected: result.rowsAffected[0],
                executionTime
            }
        };
    }
    catch (error) {
        context.error('Execute failed:', error);
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime
            }
        };
    }
}
functions_1.app.http('execute', {
    methods: ['POST'],
    authLevel: 'function',
    handler: executeHandler
});
//# sourceMappingURL=index.js.map