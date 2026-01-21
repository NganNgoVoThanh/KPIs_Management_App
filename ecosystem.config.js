module.exports = {
    apps: [
        {
            name: 'kpi-management-system',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 1, // Or 'max' to use all CPU cores
            exec_mode: 'fork', // Or 'cluster'
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 50003
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 50003
            }
        }
    ]
};
