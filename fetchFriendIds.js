// get the userIds of all friends of a given userId
const fetchFriendIds = (client, endpoint, params, results) => {
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
          results = results.concat(await fetchFriendIds(client, endpoint, params, []));
          resolve(results);
        } else {
          resolve(results);
        } 
      } catch(error) {
        console.log('error in fetchFriendIds', error);
        reject(error);
      }
    });
}

module.exports = fetchFriendIds