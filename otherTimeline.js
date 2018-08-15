const Friends = require('./db.js').Friends;
const Timelines = require('./db.js').Timelines;
const axios = require('axios');
const authAPI = require('./config/twitter.js');
const Twitter = require('twitter');
const updateTimeline = require('./config/awsURLs.js').updateTimeline;
const fetchTweets = require('./config/awsURLs.js').fetchTweets;

const twitterFetchFriendIds = (client, endpoint, params, results) => {
  return new Promise( async (resolve, reject) => {
    try {
      let response = await client.get(endpoint, params);
      // add ids to friends for that user
      response.ids.forEach(user => {
        results.push(user);
      });
      // make API call again if next cursor !== 0
      let nextCursor = response.next_cursor_str;
      if (nextCursor !== "0") {
        params.cursor = nextCursor;
        results = results.concat(await twitterFetchFriendIds(client, endpoint, params, []));
        resolve(results);
      } else {
        resolve(results);
      } 
    } catch(error) {
      console.log('error in twitterFetchFriendIds', error);
      reject(error);
    }
  });
}

const combineTimelines = (timelines) => [].concat(...timelines);

const sortTimeline = (timeline) => {
	return timeline.sort(function(a,b) {
		return (
				((a.id_str.length < b.id_str.length) || (a.id_str < b.id_str))
				? 1 
				: ((b.id_str.length < a.id_str.length) || (b.id_str < a.id_str))
					? -1 
					: 0
		);
	}); 
};

// function will invoke two above helper functions to return all friend user objects for a given userId
const getOtherTimeline = (tokenKey, tokenSecret, userId, sqs) => {
	return new Promise( async (resolve, reject) => {
		try {
			const maxFriends = 100;
			let user = await Timelines.findOne({id: userId});
			if (user && user.timeline && user.timeline.length) {
				let minutes = Math.abs(user.refreshedTimelineDate - new Date()) / 60000;
				if (minutes < 15) {
					resolve(JSON.stringify(user.timeline));
				}
				// make call to AWS SQS to build updated timeline
				let sqsParams = {
					DelaySeconds: 10,
					MessageBody: userId,
					QueueUrl: updateTimeline
				 };
				 sqs.sendMessage(sqsParams, function(err, data) {
					 if (err) {
						 console.log("Error in update-timeline", err);
					 } else {
						 console.log("Success in update-timeline", data.MessageId);
					 }
				 });
				resolve(JSON.stringify(user.timeline));
			}
			let client = new Twitter({
				consumer_key: authAPI.TWITTER_CONSUMER_KEY,
				consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
				access_token_key: tokenKey,
				access_token_secret: tokenSecret
			});
			const batchSize = 20;
			user = await Friends.findOne({id: userId});
			let promiseArray = [];
			if (user && user.friends && user.friends.length) {
				// iterate over friends and call lambda function
				let friends = user.friends.slice(0, maxFriends);
				let numBatches = Math.ceil(friends.length / batchSize);
				for (let i = 0; i < numBatches; i++) {
					let currentFriends = friends.slice(batchSize * i, batchSize * (i + 1));
					let idArray = [];
					for (let j = 0; j < currentFriends.length; j++) {
						idArray.push(currentFriends[j]['id_str']);
					}
					let friendIds = idArray.join(',');
					promiseArray.push(axios.get(`${fetchTweets}/${tokenKey}/${tokenSecret}/${friendIds}`));
				}
			} else {
				let friendsEndpoint = 'friends/ids'; 
				let friendParams = {
					'user_id': userId,
					'count': 5000,
					'cursor': -1,
					'stringify_ids': true
				};
				let friends = await twitterFetchFriendIds(client, friendsEndpoint, friendParams, []);
				friends = friends.slice(0, maxFriends);
				// iterate over friends and call lambda function
				let numBatches = Math.ceil(friends.length / batchSize);
				for (let i = 0; i < numBatches; i++) {
					let currentFriends = friends.slice(batchSize * i, batchSize * (i + 1));
					let idArray = [];
					for (let j = 0; j < currentFriends.length; j++) {
						idArray.push(currentFriends[j]['id_str']);
					}
					let friendIds = idArray.join(',');
					promiseArray.push(axios.get(`${fetchTweets}/${tokenKey}/${tokenSecret}/${friendIds}`))
				}
			}
			let returnedTimelines = await Promise.all(promiseArray);
			let timelines = [];
			for (let i = 0; i < returnedTimelines.length; i++) {
				timelines = timelines.concat(returnedTimelines[i]['data']);
			}
			let combinedTimeline = combineTimelines(timelines);
			let sortedTimeline = sortTimeline(combinedTimeline);
			let sqsParams = {
				DelaySeconds: 10,
				MessageBody: userId,
				QueueUrl: updateTimeline
			 };
			 sqs.sendMessage(sqsParams, function(err, data) {
				 if (err) {
					 console.log("Error in update-timeline", err);
				 } else {
					 console.log("Success in update-timeline", data.MessageId);
				 }
			 });
			resolve(JSON.stringify(sortedTimeline.slice(0,200)));
		} catch(error) {
			console.log('ERROR in getOtherTimeline', error);
			reject(error);
		}
	});
};

module.exports = getOtherTimeline;