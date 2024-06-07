require('dotenv').config();

const telegramBot = require("node-telegram-bot-api");
const axios = require('axios');
const FormData = require('form-data');
const request = require('request');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new telegramBot(botToken,{polling:true})

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || 'there';

    if (msg.photo) {
        try{
            bot.sendMessage(chatId, `📸 Hey ${firstName}! I'll find some cool images for you. Just chill...`);

            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const fileUrl = await bot.getFileLink(fileId);

            const imageBuffer = await downloadImage(fileUrl);
            const imageResponse = await faceCheckAPI(imageBuffer);
            const validData = imageResponse.data.filter(item=>!validateUrl(item.url));
            if (validData) {
                bot.sendMessage(chatId, `🌟 Sweet! I found some awesome pics for you, ${firstName}! Check these out:`);
                for (const item of validData) {
                    try {
                        await bot.sendPhoto(chatId, item.url);
                    } catch (error) {
                        console.error('Error sending photo:',item.url);
                    }
                }
            } else {
                bot.sendMessage(chatId, `😕 My bad, ${firstName}. Couldn't find any cool images. Want to try another pic? 🤷‍♂️`);
            }   
        }catch(error){
            console.error('Error processing photo:', error);
            bot.sendMessage(chatId, `😕 Oops! Something went wrong while processing the photo. Please try again later.`);
        }
    } else {
        bot.sendMessage(chatId, `👋 Hey ${firstName}! Send me a pic and I'll hook you up with similar images.`);
    }
});


async function downloadImage(url){
    return new Promise((resolve,reject)=>{
        request({url, encoding:null},(err,res,body)=>{
            if(err) reject(err);
            else resolve(body);
        });
    });
}

function validateUrl(url) {
    const socialMediaPlatforms = [
        'facebook.com',
        'twitter.com',
        'instagram.com',
    ];
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.pathname;
    return socialMediaPlatforms.some(platform => {
        return hostname.includes(platform) || path.endsWith('.html');
    });
}

async function faceCheckAPI(imageBuffer){
    try {
        const apiToken = process.env.FACECHECK_TOKEN+"="
        const uploadData = new FormData();
        uploadData.append('images',imageBuffer,{filename:'image.jpg'});
        uploadData.append('id_search','NEW')
        const uploadImage = await axios.post(
            "https://facecheck.id/api/upload_pic",
            uploadData,
            {headers:{
                ...uploadData.getHeaders(),
                "Authorization":apiToken
            }});
        if(uploadImage.data.id_search){
            const jason_Data ={
                id_search :uploadImage.data.id_search,
                wiht_progress:true,
                status_only:false,
                demo:true
            }
            const headers = {
                accept:'application/json',
                Authorization:apiToken
            }
            const response = await axios.post("https://facecheck.id/api/search",jason_Data,{headers:headers});
            if(response.data.output){
                return {"data":response.data.output.items}
            }
        }else{
            return {error:"Faild to upload data"}
        }
    }catch(error){
        console.error("Error calling the API : ",error.response ? error.response.data : error.message);
        throw error;
    }
}
