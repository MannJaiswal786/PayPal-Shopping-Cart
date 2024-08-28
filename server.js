const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const PAYPAL_CLIENT_ID = 'ARfLHOvowzuMOtmoxHZbzikVl4M1tot7r2OY8uPlcofGYKRlCSZrytxcQJ4zLhskxW8ZMiJO3xL0QMtI';
const PAYPAL_CLIENT_SECRET = 'ECwzwk7CF72Qdm6VNKCbzZFK7NKtdjgk4s5JLNxk8pAbLsXgoECnFwXArBAsFvD5iM57vcrONOn-i3bx';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use sandbox for testing

// Route to render the shopping cart page
app.get('/', (req, res) => {
    res.render('index');
});

// Create an order on the server side
app.post('/create-order', async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const order = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
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
                    given_name: req.body.firstName,
                    surname: req.body.lastName
                }
            }
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        res.json({ orderID: order.data.id });
    } catch (error) {
        console.error('Error creating order:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error creating order' });
    }
});

// Capture payment after buyer approves
app.post('/capture-order', async (req, res) => {
    const { orderID } = req.body;

    try {
        const accessToken = await getAccessToken();

        const capture = await axios.post(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        res.json({ captureID: capture.data.purchase_units[0].payments.captures[0].id });
    } catch (error) {
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
            username: PAYPAL_CLIENT_ID,
            password: PAYPAL_CLIENT_SECRET
        }
    });
    return response.data.access_token;
}

// Route for the thank-you page
app.get('/thank-you', (req, res) => {
    const transactionId = req.query.transactionId;
    res.send(`<h1>Thank you for your purchase!</h1><p>Transaction ID: ${transactionId}</p>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
