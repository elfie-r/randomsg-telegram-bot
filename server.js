const morgan = require('morgan');
const express = require('express');
const cors = require('cors');
const bot = require('./bot');
const bus = require('./busUtil');
const emoji = require('node-emoji');
const moment = require('moment');


const app = express();
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

const PORT = process.argv[2] || process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const setWebhook = bot('setWebHook', TELEGRAM_TOKEN);
const sendMessage = bot('sendMessage', TELEGRAM_TOKEN);
const sendPhoto = bot('sendPhoto', TELEGRAM_TOKEN);
const WEBHOOK = `${process.argv[2]}/${TELEGRAM_TOKEN}`;

//format the incoming data from Telegram
const botMessage = (req, resp, next) => {

    let m = {};
    if (('edited_message' in req.body) || ('message' in req.body)) {
        m = req.body.edited_message || req.body.message;
        req.telegram = {
            type: '',
            message_id: m.message_id,
            chat_id: m.chat.id,
            first_name: m.chat.first_name,
            date: m.date,
            text: m.text,
            entities: m.entities
        }
    } else if ('callback_query' in req.body) {
        m = req.body.callback_query
        req.telegram = {
            type: 'callback',
            message_id: m.message.message_id,
            chat_id: m.message.chat.id,
            first_name: m.from.first_name,
            date: m.message.date,
            itemId: parseInt(m.data)
        }
    }

    if (!req.telegram.type) {
        if (req.telegram.text == '/start')
            req.telegram.type = 'start';
        else if (req.telegram.text.startsWith('/bus'))
            req.telegram.type = 'bus';
        else
            req.telegram.type = 'error';
    }

    next();
}



app.post(`/${TELEGRAM_TOKEN}`, botMessage,
    (req, resp) => {

        switch (req.telegram.type) {

            case 'error':
                sendMessage({
                    chat_id: `${req.telegram.chat_id}`,
                    text: emoji.emojify(`*Not sure how to handle that :shrug: *`),
                    parse_mode: "Markdown"
                })
                    .then((result) => {
                        console.log('Returned unsure response');
                    })
                    .catch(error => {
                        console.log(error);
                    })
                break;
            case 'bus':
                const busId = req.telegram.text.substring(5);

                bus(busId)
                    .then((result) => {
                        const services = result.Services;
                        const processed = services
                            .map(v => {
                                return ({
                                    serviceNo: v.ServiceNo,
                                    nextBus: v.NextBus.EstimatedArrival
                                })
                            })
                        console.log(processed);
                        for (let i in processed) {
                            let rawArrivalTime = moment(processed[i].nextBus)
                            let formattedArrivalTime = rawArrivalTime.format('HH:mm:ss');
                            let seconds = rawArrivalTime.diff(moment(), 'seconds');
                            let minutes = Math.floor(seconds / 60);
                            seconds = seconds % 60;
                            console.log(minutes);
                            var text;
                            if (minutes >= 0) {
                                text = `Bus *${processed[i].serviceNo}* coming at *${formattedArrivalTime}* (${minutes} minutes ${seconds} seconds)`;
                            } else {
                                text = `Bus *${processed[i].serviceNo}* coming at *${formattedArrivalTime}* (a lil late?)`;
                            }

                            var message = {
                                chat_id: req.telegram.chat_id,
                                text: text,
                                parse_mode: 'Markdown',
                            }
                            sendMessage(message)
                                .then(result => console.log(result))
                                .catch(error => console.log(error));
                        }
                    })
                    .catch(error => {
                        console.log(error);
                    })
                break;

            case 'start':
                sendPhoto({
                    chat_id: `${req.telegram.chat_id}`,
                    photo: `https://randomsg-telegram-bot.herokuapp.com/assets/logo`
                })
                    .then(result => {
                        console.log('sent logo');
                        sendMessage({
                            chat_id: `${req.telegram.chat_id}`,
                            text: `
                                <b>Your Random SG Service Bot</b>\n<code>Enter /bus &lt;busStopNumber&gt; to get bus arrival times.</code>`,
                            parse_mode: "HTML"

                        })
                            .then(result => console.log('sent logo:', result))
                            .catch(error => console.log(error));
                    })
                    .catch(error => console.log(error));

                break;
            default:

                break;

        }
        console.info(req.telegram);
        resp.status(200).json({});
    })


app.get('/assets/logo', (req, resp) => {
    resp.status(200).type('png').sendFile(__dirname + '/public/assets/sgbotlogo2.png');
})

bus(64069)
    .then((result) => {
        const services = result.Services;
        const processed = services
            .map(v => {
                return ({
                    serviceNo: v.ServiceNo,
                    nextBus: v.NextBus.EstimatedArrival
                })
            })
        console.log(processed);
        
    })
    .catch(error => {
        console.log(error);
    })

//register the webhook
// setWebhook({ url: WEBHOOK })
//     .then((result) => {
//         console.log(result);
//         //success, so start the server
//         app.listen(PORT, () => {
//             console.log(`app listening on ${PORT} at ${new Date()}`);
//         })
//     })
//     .catch(error => {
//         console.log(error);
//     })


app.listen(PORT || 3000, () => {
    console.log(`app listening on ${PORT} at ${new Date()}`);
});
