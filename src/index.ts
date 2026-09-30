import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { AppDatabase } from './persistence/Database.js';
import { ConfigRepository } from './repositories/ConfigRepository.js';
import { DeliveryRepository } from './repositories/DeliveryRepository.js';
import { AmazonProgramTemplateRepository } from './repositories/AmazonProgramTemplateRepository.js';
import { AmazonDiscordController } from './discord/AmazonDiscordController.js';
async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !clientId || !/^\d{17,20}$/.test(clientId) || (guildId && !/^\d{17,20}$/.test(guildId))) throw new Error('Invalid Discord environment configuration');
  const db = new AppDatabase();
  const client = new Client({ rest: { timeout: 15_000, retries: 0 }, intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  new AmazonDiscordController(client, new ConfigRepository(db), new DeliveryRepository(db), guildId, new AmazonProgramTemplateRepository(db)).register();
  client.on('error', () => console.warn(JSON.stringify({ event: 'discord_client_error' })));
  client.once('ready', () => {
    if (client.user?.id !== clientId) {
      console.error('Discord token and application ID do not match. Stop and check your local .env.');
      client.destroy(); db.close(); process.exitCode = 1; return;
    }
    console.log(JSON.stringify({ event: 'bot_ready', mode: 'api_free', scope: guildId ? 'test_guild_only' : 'configured_guilds' }));
  });
  let closed = false;
  const shutdown = () => { if (!closed) { closed = true; client.destroy(); db.close(); } process.exit(0); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  try {
    // Registration is an explicit, guild-only operation: npm run commands:register.
    // Starting/restarting the bot never bulk-overwrites Discord commands.
    await client.login(token);
  } catch { client.destroy(); db.close(); throw new Error('Startup failed'); }
}
void main().catch(() => {
  console.error('Startup failed. Check local Discord configuration, Message Content Intent, database access and network connectivity. Never share your token.');
  process.exitCode = 1;
});
