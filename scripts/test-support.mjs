/** Pure local configuration helpers. Never return secrets in diagnostic messages. */
export function environmentChecks(env) {
  return ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'].map(key => {
    const value = typeof env[key] === 'string' ? env[key].trim() : '';
    const ok = key === 'DISCORD_TOKEN'
      ? value.length > 0 && !/\s/.test(value) && !/^(your_|paste_|replace_|<)/i.test(value)
      : /^\d{17,20}$/.test(value);
    return { key, ok };
  });
}
export function readTestConfig(env) {
  const missing = environmentChecks(env).filter(c => !c.ok).map(c => c.key);
  if (missing.length) throw new Error(`Missing or invalid local fields: ${missing.join(', ')}. Do not share their values.`);
  return { token: env.DISCORD_TOKEN.trim(), clientId: env.DISCORD_CLIENT_ID.trim(), guildId: env.DISCORD_GUILD_ID.trim() };
}
export function supportedNode(version) {
  const [major, minor] = version.split('.').map(Number);
  return Number.isInteger(major) && Number.isInteger(minor) && (major > 22 || (major === 22 && minor >= 12));
}
export function inviteUrl(config) {
  if (!/^\d{17,20}$/.test(config.clientId) || !/^\d{17,20}$/.test(config.guildId)) throw new Error('Valid application and test server IDs are required.');
  const url = new URL('https://discord.com/oauth2/authorize');
  // View Channel + Send Messages + Embed Links + Read Message History. No Administrator.
  url.search = new URLSearchParams({ client_id: config.clientId, guild_id: config.guildId,
    disable_guild_select: 'true', integration_type: '0', scope: 'bot applications.commands', permissions: '84992' }).toString();
  return url.toString();
}
/** Explicit guild-only upsert of /amazon; never bulk overwrite commands or write global commands. */
export async function registerGuildCommand(rest, config, command) {
  if (!/^\d{17,20}$/.test(config.clientId) || !/^\d{17,20}$/.test(config.guildId)) throw new Error('A valid test server is required.');
  if (command.name !== 'amazon') throw new Error('Only the amazon command may be registered by this script.');
  const application = await rest.get('/oauth2/applications/@me');
  if (application.id !== config.clientId) throw new Error('Token and application ID do not match.');
  await rest.post(`/applications/${config.clientId}/guilds/${config.guildId}/commands`, { body: command });
}
