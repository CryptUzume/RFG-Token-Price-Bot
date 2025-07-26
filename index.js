const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const { fetchPairData } = require('./utils');
const dotenv = require('dotenv');

dotenv.config();

// Webサーバー
app.get("/", (req, res) => {
  res.status(200).send("Bot is alive!");
});
app.listen(PORT, () => {
  console.log(`🌐 Web server is running at http://localhost:${PORT}`);
});

// Discord Bot クライアント初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

let TASK_QUEUE = [];

const registTask = async () => {
  console.log("🔁 registTask 実行");
  if (process.env.UPDATE_STATUS === 'on') {
    TASK_QUEUE.push(updateStatus);
    console.log("✅ updateStatus 登録");
  }
  if (process.env.BOARDCAST === 'on') {
    TASK_QUEUE.push(boardcast);
    console.log("✅ boardcast 登録");
  }
};

const doTask = async () => {
  console.log("🕒 doTask 実行開始");
  for (const task of TASK_QUEUE) {
    console.log(`➡️ タスク実行: ${task.name}`);
    try {
      await task();
    } catch (err) {
      console.error(`❌ ${task.name} エラー:`, err.message);
    }
  }
};

const updateStatus = async () => {
  console.log("🔄 updateStatus 開始");
  const data = await fetchPairData();
  if (!data?.pair?.priceUsd) {
    console.log("⚠️ 価格取得失敗 (updateStatus)");
    return;
  }
  await client.user.setActivity(`$${data.pair.priceUsd}`, { type: ActivityType.Watching });
  console.log("✅ ステータス更新: $", data.pair.priceUsd);
};

const boardcast = async () => {
  console.log("📢 boardcast 開始");
  const data = await fetchPairData();
  if (!data?.pair?.priceUsd) {
    console.log("⚠️ データ取得失敗 (boardcast)");
    return;
  }

  const channelIds = process.env.TARGET_CHANNEL_IDS.split(',').map(id => id.trim());

  if (process.env.MESSAGE_TYPE === 'text') {
    await _boardcastText(channelIds, data);
  } else {
    await _boardcastEmbed(channelIds, data);
  }
};

const _boardcastEmbed = async (channelIds, data) => {
  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      const embedMsg = new EmbedBuilder()
        .setTitle('RFG Price')
        .setURL(`https://dexscreener.com/${process.env.CHAIN}/${process.env.PAIR_HASH}`)
        .setAuthor({
          name: '価格通知Bot',
          iconURL: 'https://media.discordapp.net/attachments/1243501933155717130/1398544287767203840/Tadokami_Tips_5.png?format=webp&quality=lossless&width=721&height=541'
        })
        .setDescription('現在のRFG価格をお知らせします')
        .addFields(
          { name: '🟢 RFG Price', value: `$${data.pair.priceUsd}` },
          { name: '5M', value: `${data.pair.priceChange.m5}%`, inline: true },
          { name: '1H', value: `${data.pair.priceChange.h1}%`, inline: true },
          { name: '6H', value: `${data.pair.priceChange.h6}%`, inline: true },
          { name: '24H', value: `${data.pair.priceChange.h24}%`, inline: true },
          { name: '💧 Liquidity', value: `$${data.pair.liquidity.usd}`, inline: true },
          { name: '💎 Market cap', value: `$${data.pair.fdv}`, inline: true }
        )
        .setThumbnail('https://pbs.twimg.com/media/GoOTG5FbYAEmUcO?format=jpg&name=240x240')
        .setFooter({
          text: 'Update time',
          iconURL: 'https://pbs.twimg.com/profile_images/1934711848416497666/dNKeAuZl_400x400.jpg'
        })
        .setColor([227, 23, 13])
        .setTimestamp();

      await channel.send({ embeds: [embedMsg] });
      console.log(`✅ 通知送信完了: ${channelId}`);
    } catch (err) {
      console.error(`❌ 通知エラー(${channelId}):`, err.message);
    }
  }
};

const _boardcastText = async (channelIds, data) => {
  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      const content = `RFG Price: $${data.pair.priceUsd}`;
      await channel.send(content);
      console.log(`✅ テキスト送信完了: ${content}`);
    } catch (err) {
      console.error(`❌ テキスト送信エラー:`, err.message);
    }
  }
};

// 🔹 Bot起動時
client.once("ready", async () => {
  console.log(`🚀 Bot 起動成功: ${client.user.tag}`);
  await registTask();
  await doTask();  // 🔸 即時実行
  const interval = Number(process.env.UPDATE_FREQUENCY);
  console.log(`⏳ ${interval}ms ごとにdoTaskを実行します`);
  setInterval(doTask, interval);
});

client.login(process.env.DISCORD_TOKEN);
