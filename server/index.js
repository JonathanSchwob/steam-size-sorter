import 'dotenv/config'

const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const app = express();
const port = 3000;
const config = {
  steamAPIKey: process.env.STEAM_API_KEY
};


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/ping', (req, res) => {
  res.send('pong!')
})

passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000/',
  apiKey: config.steamAPIKey,
},
function(identifier, profile, done) {
  User.findByOpenID({ openId: identifier }, function (err, user) {
    return done(err, user);
  });
}
));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
