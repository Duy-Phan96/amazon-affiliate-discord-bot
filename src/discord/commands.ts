import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const amazonCommand = new SlashCommandBuilder()
  .setName('amazon').setDescription('Amazon product links — no product API required')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('setup').setDescription('Configure Basic or Affiliate mode, stores and channels'))
  .addSubcommand(s => s.setName('product').setDescription('Compose, preview and publish a product recommendation'))
  .addSubcommand(s => s.setName('settings').setDescription('Show saved Amazon settings'))
  .addSubcommand(s => s.setName('guide').setDescription('Explain tracking IDs, OneLink and disclosures'))
  .addSubcommand(s => s.setName('status').setDescription('Show API-free bot and delivery status'));
