/**
 * Simple test script to verify Stripe integration
 * Run this with: node test-stripe-integration.js
 */

const API_BASE_URL = 'https://ampac-brain-381306899120.us-central1.run.app/api/v1';

async function testStripeIntegration() {
    console.log('🧪 Testing AmPac Stripe Integration...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing API health...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ API Health:', healthData.status);

        // Test 2: Test application fee session creation
        console.log('\n2. Testing application fee session creation...');
        const applicationFeeResponse = await fetch(`${API_BASE_URL}/stripe/application-fee-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: In production, you'd need proper authentication headers
            },
            body: JSON.stringify({
                application_id: 'test_app_001',
                amount: 5000, // $50.00
                description: 'Test SBA 504 Loan Application Processing Fee',
                customer_email: 'test@ampac-business.com'
            })
        });

        if (applicationFeeResponse.ok) {
            const sessionData = await applicationFeeResponse.json();
            console.log('✅ Application fee session created successfully');
            console.log('   Session ID:', sessionData.session_id);
            console.log('   Amount:', `$${sessionData.amount / 100}`);
            console.log('   Checkout URL:', sessionData.url);
        } else {
            const error = await applicationFeeResponse.text();
            console.log('❌ Application fee session failed:', error);
        }

        // Test 3: Test payment status check
        console.log('\n3. Testing payment status check...');
        const statusResponse = await fetch(`${API_BASE_URL}/stripe/application-status/test_app_001`, {
            headers: {
                // Note: In production, you'd need proper authentication headers
            }
        });

        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ Payment status check successful');
            console.log('   Status:', statusData.status);
        } else {
            const error = await statusResponse.text();
            console.log('❌ Payment status check failed:', error);
        }

        console.log('\n🎉 Stripe integration test completed!');
        console.log('\n📱 Next steps:');
        console.log('   1. Run the mobile app: cd apps/mobile && npm start');
        console.log('   2. Navigate to the Payment screen');
        console.log('   3. Test the payment buttons');
        console.log('   4. Check the Stripe Dashboard for test payments');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Make sure the AI Brain is running');
        console.log('   2. Check your Stripe API keys in the .env file');
        console.log('   3. Verify the API URL is correct');
    }
}

// Run the test
testStripeIntegration();