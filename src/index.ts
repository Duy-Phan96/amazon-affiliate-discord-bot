import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { AppDatabase } from './persistence/Database.js';
import { ConfigRepository } from './repositories/ConfigRepository.js';
import { DeliveryRepository } from './repositories/DeliveryRepository.js';
import { AmazonDiscordController } from './discord/AmazonDiscordController.js';
import { amazonCommand } from './discord/commands.js';
async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) throw new Error('Missing Discord environment configuration');
  const db = new AppDatabase();
  const client = new Client({ rest: { timeout: 15_000, retries: 0 }, intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  new AmazonDiscordController(client, new ConfigRepository(db), new DeliveryRepository(db)).register();
  client.on('error', () => console.warn(JSON.stringify({ event: 'discord_client_error' })));
  client.once('ready', () => console.log(JSON.stringify({ event: 'bot_ready', mode: 'api_free' })));
  const shutdown = () => { client.destroy(); db.close(); process.exit(0); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  try {
    const route = process.env.DISCORD_GUILD_ID ? Routes.applicationGuildCommands(clientId, process.env.DISCORD_GUILD_ID) : Routes.applicationCommands(clientId);
    await new REST({ version: '10', timeout: 15_000, retries: 0 }).setToken(token).put(route, { body: [amazonCommand.toJSON()] });
    await client.login(token);
  } catch { client.destroy(); db.close(); throw new Error('Startup failed'); }
}
void main().catch(() => {
  // Do not expose raw Discord request URLs, response bodies or credentials.
  console.error('Startup failed. Check local Discord environment values, database access and network connectivity.');
  process.exitCode = 1;
});
