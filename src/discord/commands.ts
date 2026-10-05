import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const amazonCommand = new SlashCommandBuilder()
  .setName('amazon').setDescription('Generate affiliate links and share Amazon products — no product API required')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('link').setDescription('Turn a full Amazon product URL into your link, privately')
    .addStringOption(o => o.setName('url').setDescription('Full amazon.de / amazon.com / amazon.co.uk product URL, not a short link').setRequired(true).setMaxLength(1500)))
  .addSubcommand(s => s.setName('setup').setDescription('Configure Affiliate or Basic mode, stores and channels'))
  .addSubcommand(s => s.setName('product').setDescription('Preview and publish your affiliate product link with optional text'))
  .addSubcommand(s => s.setName('settings').setDescription('Show saved Amazon settings'))
  .addSubcommand(s => s.setName('guide').setDescription('Explain tracking IDs, OneLink and disclosures'))
  .addSubcommand(s => s.setName('status').setDescription('Show API-free bot and delivery status'));
