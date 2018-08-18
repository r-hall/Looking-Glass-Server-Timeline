/*
    input: date when current scheduled builds will end, number of batches for current requested build
    output: new date when all scheduled builds (including new one) will end
*/
const calculateNextDate = (dateUsed, batches) => {
    const year = dateUsed.getUTCFullYear();
    const month = dateUsed.getUTCMonth();
    const day = dateUsed.getUTCDate();
    const hours = dateUsed.getUTCHours();
    const minutes = dateUsed.getUTCMinutes();
    const seconds = dateUsed.getUTCSeconds();
    const milliseconds = dateUsed.getUTCMilliseconds();
    return new Date(year, month, day + batches, hours, minutes, seconds, milliseconds);
}

module.exports = calculateNextDate;