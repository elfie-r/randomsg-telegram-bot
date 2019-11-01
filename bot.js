const request = require('request-promise-native');
const TELEGRAM_URL = `https://api.telegram.org/bot`;

module.exports = (method, token) => {
    return (params) => {
        return(
            request
            .post(`${TELEGRAM_URL}${token}/${method}`)
            .form(params)
        ); 
    }
}