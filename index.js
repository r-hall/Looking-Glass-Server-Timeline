const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const Users = require('./db.js').Users;
const Lists = require('./db.js').Lists;
const Tokens = require('./db.js').Tokens;
const TokenTracker = require('./db.js').TokenTracker;
const getOwnTimeline = require('./ownTimeline.js');
const getOtherTimeline = require('./otherTimeline.js');
const getListTimeline = require('./getListTimeline.js');
const requestList = require('./requestList.js');
const port = process.env.PORT || 3001;

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var app = express();

// Logging and parsing
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/health', (req, res) => {
  res.writeHead(200);
  res.end('healthy');
})

app.get('/timeline/:userId/:userScreenName/:viewerId', async (req, res) => {
    try {
      let userId = req.params.userId;
      let name = req.params.userScreenName;
      let viewerId = req.params.viewerId;
      let list = await Lists.findOne({id: name});
      if (list && list.done) {
        let timeline = await getListTimeline(list);
        res.writeHead(200);
        res.end(timeline);
      } else {
        await requestList(sqs, name, userId, viewerId);
        let user = await Users.findOne({id: userId});
        if (user && user.twitterTokenKey) {
          let tokenKey = user.twitterTokenKey;
          let tokenSecret = user.twitterTokenSecret;
          let client = new Twitter({
            consumer_key: authAPI.TWITTER_CONSUMER_KEY,
            consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
            access_token_key: tokenKey,
            access_token_secret: tokenSecret
          });
          let timeline = await getOwnTimeline(client, userId);
          res.writeHead(200);
          res.end(timeline);
        } else {
          let tokenInfo = await TokenTracker.findOne({id: 1});
          let currentToken = tokenInfo.currentToken;
          let totalTokens = tokenInfo.totalTokens;
          let updateObject = {};
          let newCurrentToken = currentToken === totalTokens ? 1 : currentToken + 1;
          updateObject['currentToken'] = newCurrentToken;
          let query = {'id': 1};
          TokenTracker.findOneAndUpdate(query, updateObject);
          let token = await Tokens.findOne({id: currentToken});
          let tokenKey = token.twitterTokenKey;
          let tokenSecret = token.twitterTokenSecret;
          let timeline = await getOtherTimeline(tokenKey, tokenSecret, userId, sqs);
          res.writeHead(200);
          res.end(timeline);
        }
      }
    } catch(err) {
      console.log('error in /timeline/:userId/:userScreenName/:viewerId', err);
      res.writeHead(404);
      res.end(err);
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
})
