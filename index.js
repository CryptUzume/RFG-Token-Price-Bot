const _boardcastEmbed = async (channelIds, data) => {
  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      const embedMsg = new EmbedBuilder()
        .setTitle('RFG Price')
        .setURL(`https://dexscreener.com/${process.env.CHAIN}/${process.env.PAIR_HASH}`)
        .setAuthor({ 
          name: '価格通知Bot', 
          iconURL: 'https://media.discordapp.net/attachments/1243501933155717130/1398544287767203840/Tadokami_Tips_5.png?ex=6885bf5d&is=68846ddd&hm=2b8568fec06db9ea39df557ad93a99070310a98493192df14b0d8e33f6586343&=&format=webp&quality=lossless&width=721&height=541' 
        })
        .setDescription('現在のRFG価格をお知らせします')
        .setThumbnail('https://pbs.twimg.com/media/GoOTG5FbYAEmUcO?format=jpg&name=240x240')  // ✅ サムネイル追加
        .addFields(
          { name: '🟢 RFG Price', value: `$${data.pair.priceUsd}` },
          { name: '5M', value: `${data.pair.priceChange.m5}%`, inline: true },
          { name: '1H', value: `${data.pair.priceChange.h1}%`, inline: true },
          { name: '6H', value: `${data.pair.priceChange.h6}%`, inline: true },
          { name: '24H', value: `${data.pair.priceChange.h24}%`, inline: true },
          { name: '💧 Liquidity', value: `$${data.pair.liquidity.usd}`, inline: true },
          { name: '💎 Market cap', value: `$${data.pair.fdv}`, inline: true }
        )
        .setImage('https://pbs.twimg.com/profile_images/1934711848416497666/dNKeAuZl_400x400.jpg')  // ✅ 本文下画像追加
        .setColor([227, 23, 13])
        .setTimestamp();

      await channel.send({ embeds: [embedMsg] });
      console.log(`✅ 通知送信完了: ${channelId}`);
    } catch (err) {
      console.error(`❌ 通知エラー(${channelId}):`, err.message);
    }
  }
};
