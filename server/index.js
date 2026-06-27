require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, customerId } = req.body;
    
    // In a real app, you would create a Stripe Customer first if they don't have one
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // success_url: 'http://localhost:5173/account?success=true',
      success_url: req.headers.origin + '/account?success=true',
      cancel_url: req.headers.origin + '/account?canceled=true',
      customer: customerId // Optional, if they are an existing customer
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;
    // Create a SetupIntent to save a card without charging
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const { customerId } = req.query;
    if (!customerId) return res.json({ data: [] });
    
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
