/*

*/

const calculateNextDate = (batches) => {
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth();
    const day = currentDate.getUTCDate();
    const hours = currentDate.getUTCHours();
    const minutes = currentDate.getUTCMinutes();
    const seconds = currentDate.getUTCSeconds();
    const milliseconds = currentDate.getUTCMilliseconds();
    const newDate = new Date(year, month, day, hours, minutes, seconds, milliseconds)
}

module.exports = calculateNextDate;