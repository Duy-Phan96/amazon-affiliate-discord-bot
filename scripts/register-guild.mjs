import 'dotenv/config';
import { REST } from 'discord.js';
import { readTestConfig, registerGuildCommand } from './test-support.mjs';

try {
  const config = readTestConfig(process.env);
  const { amazonCommand } = await import('../dist/discord/commands.js');
  const rest = new REST({ version: '10', timeout: 15_000, retries: 0 }).setToken(config.token);
  await registerGuildCommand(rest, config, amazonCommand.toJSON());
  console.log('OK: /amazon registered for the configured test server. No global commands or other named commands were changed. Run npm start.');
} catch {
  // SDK exceptions can contain authorization data and HTTP request bodies.
  console.error('Registration failed. Build first; check your local token, matching application ID and test server ID, bot invite and network. Nothing was registered globally. Do not share credentials.');
  process.exitCode = 1;
}
