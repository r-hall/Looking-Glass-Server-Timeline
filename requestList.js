const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const Users = require('./db.js').Users;
const Lists = require('./db.js').Lists;
const fetchFriendIds = require('./fetchFriendIds.js');
const calculateNextDate = require('./calculateNextDate.js');
const updateTimeline = require('./config/awsURLs.js').updateTimeline;

const maxLists = 50; // ensure RL for GET lists/statuses not exceeded 
const endpoint = 'friends/ids';
const maxDailyInsertions = 900; // add safe amount to list each day   

const requestList = (sqs, name, userId, viewerId) => {
    return new Promise( async (resolve, reject) => {
        try {
            let viewer = await Users.findOne({id: viewerId});
            if (viewer.numberOfLists < maxLists) {
                let client = new Twitter({
                    consumer_key: authAPI.TWITTER_CONSUMER_KEY,
                    consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
                    access_token_key: viewer.tokenKey,
                    access_token_secret: viewer.tokenSecret
                });
                let params = {
                    'user_id': userId,
                    'count': 5000,
                    'cursor': -1,
                    'stringify_ids': true
                };
                let friends = await fetchFriendIds(client, endpoint, params, []);
                const batches = Math.ceil(friends.length / maxDailyInsertions);
                let query = { 'id': name };
                let updateObject = {
                    'id': name,
                    'done': false,
                    'batches': batches,
                    'friends': friends,
                    'currentBatch': 0
                }
                let listResponse = await Lists.findOneAndUpdate(query, updateObject, {new: true, upsert: true});
                console.log('listResponse from inserting into Lists', response);
                let nextDate = calculateNextDate(batches);
                let message = `${name}.${viewerId}`;
                // make call to AWS SQS to build list
				let sqsParams = {
					DelaySeconds: 10,
					MessageBody: message,
					QueueUrl: updateTimeline
				 };
				 sqs.sendMessage(sqsParams, function(err, data) {
					 if (err) {
						 console.log("Error in request list", err);
					 } else {
						 console.log("Success in request list", data.MessageId);
					 }
				 });
            }
        } catch(err) {
            console.log('error in requestList', err);
            reject(err);
        }
    })
}

module.exports = requestList;