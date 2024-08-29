// Import the Express Framework
const express = require('express');
// Import body-parser for parsing request bodies
const bodyParser = require('body-parser');
// Import axios for making HTTP requests
const axios = require('axios');

// Create an instance of an Express application
const app = express();

// Middleware to parse incoming JSON and URL encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set the view engine to EJS for rendering HTML templates
app.set('view engine', 'ejs');

// Serve static files (CSS styles and images) from the current directory
app.use(express.static(__dirname));

// PayPal Sandbox Credentials and API endpoint
const PAYPAL_CLIENT_ID = 'ARfLHOvowzuMOtmoxHZbzikVl4M1tot7r2OY8uPlcofGYKRlCSZrytxcQJ4zLhskxW8ZMiJO3xL0QMtI';
const PAYPAL_CLIENT_SECRET = 'ECwzwk7CF72Qdm6VNKCbzZFK7NKtdjgk4s5JLNxk8pAbLsXgoECnFwXArBAsFvD5iM57vcrONOn-i3bx';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use sandbox for testing

// Route to render the shopping cart page (index.ejs)
app.get('/', (req, res) => {
    res.render('index');
});

// Route to create an order on the server side
app.post('/create-order', async (req, res) => {
    try {
        // Get an access token from PayPal
        const accessToken = await getAccessToken();

        // Create an order with the given amount and payer information
        const order = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
            // Set the intent to capture payment
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    // Specify the currency
                    currency_code: 'USD',
                    // Specify the amount
                    value: '20.00'
                },
                shipping: {
                    name: {
                        full_name: `${req.body.firstName} ${req.body.lastName}`
                    }
                }
            }],
            payer: {
                name: {
                    // Set the payer's first name
                    given_name: req.body.firstName,
                    // Set the payer's last name
                    surname: req.body.lastName
                }
            }
        }, {
            headers: {
                // Include the access token in the request headers
                Authorization: `Bearer ${accessToken}`
            }
        });
// Send the order ID back to the client
        res.json({ orderID: order.data.id });
    } catch (error) {
        // Handle any errors that occur during creation
        console.error('Error creating order:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error creating order' });
    }
});

//Route to capture the payment after buyer approves
app.post('/capture-order', async (req, res) => {
    // Extract the order ID from the request body
    const { orderID } = req.body;

    try {
        // Get an access token from PayPal
        const accessToken = await getAccessToken();

        // Capture the payment for the order
        const capture = await axios.post(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {}, {
            headers: {
                // Include the access token in the request headers
                Authorization: `Bearer ${accessToken}`
            }
        });

        // Send the capture ID back to the client
        res.json({ captureID: capture.data.purchase_units[0].payments.captures[0].id });
    } catch (error) {
        // handle any errors that occur during capturing the payment
        console.error('Error capturing order:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error capturing order' });
    }
});

// Function to get an access token from PayPal
async function getAccessToken() {
    const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            // Use Paypal client ID for authentication
            username: PAYPAL_CLIENT_ID,
            // Use PayPal client secret for authentication
            password: PAYPAL_CLIENT_SECRET
        }
    });
    // Return the access token from the response
    return response.data.access_token;
}

// Route for the thank-you page after successful purchase
app.get('/thank-you', (req, res) => {
    // Include transaction ID from query parameters 
    const transactionId = req.query.transactionId;
    // Display a }Thank you message and the transaction ID
    res.send(`<h1>Thank you for your purchase!</h1><p>Transaction ID: ${transactionId}</p>`);
});

// Start the Express server on the specified port ( locsalhost 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
