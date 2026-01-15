const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    let updated = false;

    const newLines = lines.map(line => {
        if (line.trim().startsWith('DATABASE_URL=')) {
            // Check if SSL is already configured
            if (!line.includes('sslaccept=strict') && !line.includes('ssl=') && !line.includes('tls=')) {
                updated = true;

                // Parse the line to handle quotes and existing query params
                // Regex to match DATABASE_URL="url" or DATABASE_URL='url' or DATABASE_URL=url
                // groups: 1=quote, 2=url, 3=quote
                const match = line.match(/^DATABASE_URL=(["']?)(.*?)(["']?)$/);

                if (match) {
                    const quote = match[1] || '';
                    const url = match[2];
                    const endQuote = match[3] || '';

                    const separator = url.includes('?') ? '&' : '?';
                    return `DATABASE_URL=${quote}${url}${separator}sslaccept=strict${endQuote}`;
                }
            }
        }
        return line;
    });

    if (updated) {
        fs.writeFileSync(envPath, newLines.join('\n'));
        console.log('Successfully updated DATABASE_URL in .env to enforce strict SSL.');
    } else {
        console.log('DATABASE_URL in .env already appears to have SSL settings or was not found.');
    }

} catch (err) {
    console.error('Error processing .env file:', err);
}
