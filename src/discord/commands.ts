import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const amazonCommand = new SlashCommandBuilder()
  .setName('amazon').setDescription('Generate affiliate links and share Amazon products — no product API required')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('link').setDescription('Turn a full Amazon product URL into your link, privately')
    .addStringOption(o => o.setName('url').setDescription('Full amazon.de / amazon.com / amazon.co.uk product URL, not a short link').setRequired(true).setMaxLength(1500)))
  .addSubcommand(s => s.setName('post').setDescription('Post an Amazon affiliate link in this channel')
    .addStringOption(o => o.setName('url').setDescription('Full Amazon product URL').setRequired(true).setMaxLength(1500))
    .addStringOption(o => o.setName('title').setDescription('Optional title; otherwise a safe title may be inferred from the URL').setRequired(false).setMaxLength(120))
    .addStringOption(o => o.setName('text').setDescription('Optional description; no product facts are fetched without API access').setRequired(false).setMaxLength(500))
    .addStringOption(o => o.setName('style').setDescription('How the post should look').setRequired(false).addChoices(
      { name: 'Auto', value: 'AUTO' },
      { name: 'Button only', value: 'BUTTON' },
      { name: 'Embed', value: 'EMBED' }
    )))
  .addSubcommand(s => s.setName('setup').setDescription('Configure Affiliate or Basic mode, stores and channels'))
  .addSubcommand(s => s.setName('product').setDescription('Preview and publish your affiliate product link with optional text'))
  .addSubcommand(s => s.setName('programs').setDescription('Create and manage Amazon program affiliate posts and templates'))
  .addSubcommand(s => s.setName('settings').setDescription('Show saved Amazon settings'))
  .addSubcommand(s => s.setName('guide').setDescription('Explain tracking IDs, OneLink and disclosures'))
  .addSubcommand(s => s.setName('status').setDescription('Show API-free bot and delivery status'));
