const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Ping に応答するルート
app.get("/", (req, res) => {
  res.status(200).send("Bot is alive!");
});

// Web サーバー起動
app.listen(PORT, () => {
  console.log(`🌐 Web server is running at http://localhost:${PORT}`);
});



const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const { fetchPairData } = require('./utils');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] 
});
const dotenv = require('dotenv');

dotenv.config()

TASK_QUEUE = []

const registTask = async () => {
  if (process.env.UPDATE_STATUS == 'on') {
    TASK_QUEUE.push(updateStatus);
  }

  if (process.env.BOARDCAST == 'on') {
    TASK_QUEUE.push(boardcast);
  }
}

const doTask = async () => {
  await TASK_QUEUE.forEach(async (task) => {
    await task();
  });
}

const updateStatus = async () => {
  const data = await fetchPairData()
  client.user.setActivity(`$${data.pair.priceUsd}`, { type: ActivityType.Watching })
}

const boardcast = async () => {
  const data = await fetchPairData()

  // Send message to all channels from specific channel ids
  const channelIds = process.env.TARGET_CHANNEL_IDS.split(',');

  if (process.env.MESSAGE_TYPE === 'text') {
    _boardcastText(channelIds, data);
  } else {
    _boardcastEmbed(channelIds, data);
  }
}

const _boardcastEmbed = async (channelIds, data) => {
  for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId);

    // [Optional] Let the chaanel only keep latest message
    const messages = await channel.messages.fetch({ limit: 100 });

    let targetMsg = null;
    // let ftPriceField = null;
    let m5ChangeField = null;

    for (const message of messages.values()) {
      const embedMsg = message.embeds[0];
      if (embedMsg) {
        m5ChangeField = embedMsg.fields.find(field => field.name === '5M');

        if (m5ChangeField) {
          targetMsg = message;
          break;
        }
      }
    }
    // If you can't see any message, please check the bot's permission
    // console.log(messages)

    if (m5ChangeField &&
        m5ChangeField.value === `${data.pair.priceChange.m5}%`) {
      // same 5m change rate, no need to update
      continue;
    } else if (m5ChangeField && m5ChangeField.value !== `$${data.pair.priceChange.m5}`) {
      // price changed, delete the old message
      await targetMsg.delete();
    }

    // no existed message or price changed, send a new message
    const embedMsg = new EmbedBuilder()
      .setTitle('RFG Price')
      .setURL(`https://dexscreener.com/${process.env.CHAIN}/${process.env.PAIR_HASH}`)
      .setAuthor({ name: '価格通知Bot', iconURL: 'https://msp.c.yimg.jp/images/v2/FUTi93tXq405grZVGgDqG89bROBufukzpZv-TsvVVRGEWhhDN4FyA1SiRXUMZG1BgWUzViHC_5ipbYlfIZ87-qNWBlwb6w8-t1qo5-AJ3wmKMqSnsNLVUcqRsq8ZgS8pHJlm19kok8R1IxGwnHXYzXgK6WnLdUC2uTHXJrtIjN1wg3MR1ILq42RjgYWf6rPOnyPlvRNjFtR6CFMBiCdz0EpMlFJf44NvzzUu7VR-JF4=/nc293780?errorImage=false', url: 'https://twitter.com/mmq88x' })
      .setDescription('現在のRFG価格をお知らせします')
      .addFields(
        { name: '🟢 RFG Price', value: `$${data.pair.priceUsd}` },
        { name: '5M', value: `${data.pair.priceChange.m5}%`, inline: true },
        { name: '1H', value: `${data.pair.priceChange.h1}%`, inline: true },
        { name: '6H', value: `${data.pair.priceChange.h6}%`, inline: true },
        { name: '24H', value: `${data.pair.priceChange.h24}%`, inline: false },
        { name: '💧 Liquidity', value: `$${data.pair.liquidity.usd}`, inline: true },
        { name: '💎 Market cap', value: `$${data.pair.fdv}`, inline: true },

      )
      .setThumbnail('https://pbs.twimg.com/media/GoOTG5FbYAEmUcO?format=jpg&name=360x360')
      .setFooter({ text: 'Update time', iconURL: 'https://pbs.twimg.com/profile_images/1934711848416497666/dNKeAuZl_400x400.jpg' })
      .setColor([227, 23, 13])
      .setTimestamp();

    await channel.send({ embeds: [embedMsg] });

  }
}

const _boardcastText = async (channelIds, data) => {
  for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId);

    // [Optional] Let the chaanel only keep latest message
    const messages = await channel.messages.fetch({ limit: 100 });

    // If you can't see any message, please check the bot's permission
    // console.log(messages)
    const price = data.pair.priceUsd;
    const priceSameMsg = messages.find(
      (msg) => msg.content === `RFG Price: $${price}`
    );

    if (priceSameMsg) {
      continue;
    }

    const priceDifferentMsg = messages.find(
      (msg) => msg.content.startsWith('RFG Price:') && msg.content !== `RFG Price: $${price}`
    );

    if (priceDifferentMsg) {
      await priceDifferentMsg.edit(`RFG Price: ${price}`);
      continue;
    }

    // No existed message from the bot, send a new message
    await channel.send(`RFG Price: $${price}`);
  }
}

client.on('ready', () => {
  client.user.setActivity('RFG Price', { type: ActivityType.Watching })
  console.log(`Logged in as ${client.user.tag}!`);
  registTask();

  setInterval(async () => {
    doTask();
  }, process.env.UPDATE_FREQUENCY);
});

client.login(process.env.DISCORD_TOKEN);

