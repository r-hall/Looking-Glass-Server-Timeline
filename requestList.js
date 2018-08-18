const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const Users = require('./db.js').Users;
const Lists = require('./db.js').Lists;
const fetchFriendIds = require('./fetchFriendIds.js');
const calculateNextDate = require('./calculateNextDate.js');

const maxLists = 50; // ensure RL for GET lists/statuses not exceeded 
const endpoint = 'friends/ids';
const maxDailyInsertions = 900; // add safe amount to list each day, assuming some added by user outside of this app

const requestList = async (sqs, name, userId, viewerId) => {
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
            let currentDate = new Date();
            let dateUsed = currentDate > viewer.lastListBuild ? currentDate : lastDate;
            let endBuildDate = calculateNextDate(dateUsed, batches);
            let listQuery = { 'id': name };
            let listUpdateObject = {
                'id': name,
                'done': false,
                'batches': batches,
                'friends': friends,
                'currentBatch': 0,
            }
            Lists.findOneAndUpdate(listQuery, listUpdateObject, {upsert: true});
            let userQuery = { 'id': viewerId };
            let userUpdateObject = { 'lastListBuild': endBuildDate };
            Users.findOneAndUpdate(userQuery, userUpdateObject);
            scheduleJobs(sqs, name, viewerId, dateUsed, batches); // schedule messages to lambda function that will build list
        }
    } catch(err) {
        console.log('error in requestList', err);
        reject(err);
    }
}

module.exports = requestList;