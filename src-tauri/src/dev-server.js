const { spawn } = require('child_process');
const path = require('path');

// Start the main server
const server = spawn('node', ['main.js'], {
    stdio: 'inherit',
    shell: true
});

// Handle server process events
server.on('error', (err) => {
    console.error('Failed to start server:', err);
});

server.on('exit', (code, signal) => {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
    console.log('Press any key to exit...');
});

// Keep the process alive
process.stdin.resume();

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.kill();
    process.exit();
}); 