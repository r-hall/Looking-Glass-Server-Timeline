const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const Users = require('./db.js').Users;

/*

*/
const endpoint = 'lists/statuses';

const getListTimeline = (list) => {
    return new Promise( async (resolve, reject) => {
        try {
            const listOwner = list.owner_id;
            const user = Users.findOne({id: listOwner});
            let client = new Twitter({
                consumer_key: authAPI.TWITTER_CONSUMER_KEY,
                consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
                access_token_key: user.tokenKey,
                access_token_secret: user.tokenSecret
            });
            let params = {
                'slug': list.slug,
                'owner_screen_name': list.owner_screen_name
            }
            let timeline = await client.get(endpoint, params);
            resolve(JSON.stringify(timeline));
        } catch(err) {
            console.log('error in getListTimeline', err);
            reject(err);
        }
    })
}

module.exports = getListTimeline;