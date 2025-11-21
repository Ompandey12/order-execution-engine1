// Simple WebSocket Test Script
// Run this in Node.js to test WebSocket connection
// Simple WebSocket Test Script
// Run this in Node.js to test WebSocket connection

const WebSocket = require('ws');

// STEP 1: Replace this with your actual orderId from Postman response
const orderId = '20073705-5a80-4384-b6d5-20f64bef616c';

// STEP 2: Connect to WebSocket (using 127.0.0.1 to avoid IPv6 issues)
const ws = new WebSocket(`ws://127.0.0.1:3000/ws/orders/${orderId}`);

ws.on('open', () => {
    console.log('✅ Connected to WebSocket!');
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('\n📨 Received update:');
    console.log(`   Status: ${message.status}`);
    if (message.data) {
        console.log(`   Data:`, JSON.stringify(message.data, null, 2));
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
});

console.log(`🔗 Connecting to order: ${orderId}...`);
