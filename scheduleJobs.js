const schedule = require('node-schedule');
const calculateNextDate = require('./calculateNextDate.js');
const listQueueURL = require('./config/awsURLs.js').buildList;
/*
    Schedule all necessary jobs to build a list
    One user can only add 1,000 members to a list per day so list building
    must be spread out over more than one day if list members will exceed 1,000
    
    input: sqs object, starting date when building list, number of batches (days)
    output: none
*/
const scheduleJobs = (sqs, name, user, date, batches) => {
    for (let i = 0; i < batches; i++) {
        schedule.scheduleJob(date, function(){
            let params = {
                DelaySeconds: 10,
                MessageBody: `${name}.${user}`,
                QueueUrl: listQueueURL
            };
            sqs.sendMessage(params, function(err, data) {
                if (err) {
                console.log("Error in scheduleJobs in request-list", err);
                } else {
                console.log("Success in scheduleJobs in request-list", data.MessageId);
                }
            });
        });
        date = calculateNextDate(date, 1); // gets date one day from now
    }
}

module.exports = scheduleJobs;