"use strict";
// Azure Function: Query Executor
// Handles SQL queries to OneLake using Managed Identity
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryHandler = queryHandler;
const functions_1 = require("@azure/functions");
const connection_1 = require("../lib/connection");
async function queryHandler(request, context) {
    const startTime = Date.now();
    try {
        // Parse request body
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
        context.log(`Executing query: ${body.query}`);
        // Get connection pool
        const pool = await (0, connection_1.getConnectionPool)();
        // Create request
        const sqlRequest = pool.request();
        // Note: timeout is configured at pool level in connection.ts
        // Add parameters if provided
        if (body.params) {
            Object.entries(body.params).forEach(([key, value]) => {
                sqlRequest.input(key, value);
            });
        }
        // Execute query
        const result = await sqlRequest.query(body.query);
        const executionTime = Date.now() - startTime;
        context.log(`Query executed successfully in ${executionTime}ms`);
        // Return results
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: result.recordset,
                rowCount: result.recordset.length,
                executionTime
            }
        };
    }
    catch (error) {
        context.error('Query execution failed:', error);
        const executionTime = Date.now() - startTime;
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: error.message,
                executionTime
            }
        };
    }
}
// Register HTTP trigger
functions_1.app.http('query', {
    methods: ['POST'],
    authLevel: 'function',
    handler: queryHandler
});
//# sourceMappingURL=index.js.map