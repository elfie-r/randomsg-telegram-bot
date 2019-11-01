const request = require('request-promise-native');
const BUS_API_URI = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=';
const LTA_TOKEN = require('./config').LTA_TOKEN;

module.exports = (stopid) => {
    const options = {
        url: BUS_API_URI,
        headers: {
          'AccountKey': LTA_TOKEN
        },
        qs : { 
           'BusStopCode' : stopid + ''
        }
      }
    return (request.get(options).then(r => JSON.parse(r)))
}