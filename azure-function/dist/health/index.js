"use strict";
// Azure Function: Health Check
// Tests connection to OneLake and returns status
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthHandler = healthHandler;
const functions_1 = require("@azure/functions");
const connection_1 = require("../lib/connection");
async function healthHandler(request, context) {
    try {
        const status = (0, connection_1.getConnectionStatus)();
        // Try a simple query
        const pool = await (0, connection_1.getConnectionPool)();
        const result = await pool.request().query('SELECT 1 AS test');
        return {
            status: 200,
            jsonBody: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                connection: {
                    isConnected: status.isConnected,
                    server: process.env.ONELAKE_SERVER,
                    database: process.env.ONELAKE_DATABASE,
                    poolSize: status.poolSize
                },
                test: result.recordset[0]
            }
        };
    }
    catch (error) {
        context.error('Health check failed:', error);
        return {
            status: 503,
            jsonBody: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            }
        };
    }
}
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: healthHandler
});
//# sourceMappingURL=index.js.map