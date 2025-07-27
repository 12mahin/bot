const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'mu';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        handleMessage(sender_psid, webhook_event.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(sender_psid, received_message) {
  const user_input = received_message.text.toLowerCase();

  if (user_input.includes("quote")) {
    axios.get('https://api.quotable.io/random')
      .then(res => {
        const quote = res.data.content;
        callSendAPI(sender_psid, { text: `📝 আজকের উক্তি:\n\"${quote}\"` });
      })
      .catch(err => {
        console.error('API error:', err);
        callSendAPI(sender_psid, { text: '❌ উক্তি আনতে সমস্যা হয়েছে।' });
      });
  } else {
    const response = { text: `✅ আপনি লিখেছেন: \"${user_input}\"` };
    callSendAPI(sender_psid, response);
  }
}

function callSendAPI(sender_psid, response) {
  const request_body = {
    recipient: { id: sender_psid },
    message: response
  };

  request({
    uri: 'https://graph.facebook.com/v18.0/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('✅ Message sent!');
    } else {
      console.error('❌ Error sending message:', err);
    }
  });
}

app.listen(3000, () => {
  console.log('🚀 Server is running on port 3000');
});
