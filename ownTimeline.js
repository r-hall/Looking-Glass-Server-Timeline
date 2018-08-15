const Timelines = require('./db.js').Timelines;

const twitterFetchOwnTimeline = (client, endpoint, params, results) => {
	return new Promise( async (resolve, reject) => {
		try {
			let response = await client.get(endpoint, params);
			resolve(response);
	      } catch(error) {
		    console.log('error in twitterFetchOwnTimeline', error)
		    reject(error);
		  }
		
	})
}

const getOwnTimeline = (client, userId) => {
	return new Promise( async (resolve, reject) => {
		try {
			let user = await Timelines.findOne({id: userId});
			if (user && user.timeline && user.timeline.length) {
				let minutes = Math.abs(user.refreshedTimelineDate - new Date()) / 60000;
				if (minutes < 15) {
					resolve(JSON.stringify(user.timeline));
				}
			}
			let timelineEndpoint = 'statuses/home_timeline'; 
			let timelineParams = {
				'count': 200,
				'tweet_mode': 'extended'
			};
			let timeline = await twitterFetchOwnTimeline(client, timelineEndpoint, timelineParams, []);
			let query = {};
			query['id'] = userId;
			let updateObject = {};
			updateObject['id'] = userId;
			updateObject['timeline'] = timeline;
			updateObject['refreshedTimelineDate'] = new Date();
			Timelines.findOneAndUpdate(query, updateObject, {upsert: true});
			resolve(JSON.stringify(timeline));
		} catch(error) {
			console.log('ERROR in getOwnTimeline', error);
			reject(error);
		}
	})
}

module.exports = getOwnTimeline;