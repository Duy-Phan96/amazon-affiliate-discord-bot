import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const amazonCommand = new SlashCommandBuilder()
  .setName('amazon').setDescription('Generate affiliate links and share Amazon products — no product API required')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(s => s.setName('post').setDescription('Publish an Amazon product in this channel')
    .addStringOption(o => o.setName('url').setDescription('Full Amazon product URL').setRequired(true).setMaxLength(1500))
    .addStringOption(o => o.setName('title').setDescription('Optional title').setRequired(false).setMaxLength(120))
    .addStringOption(o => o.setName('text').setDescription('Optional description').setRequired(false).setMaxLength(500))
    .addStringOption(o => o.setName('style').setDescription('Post style').setRequired(false).addChoices(
      { name: 'Auto — recommended', value: 'AUTO' },
      { name: 'Button only', value: 'BUTTON' },
      { name: 'Embed', value: 'EMBED' }
    )))
  .addSubcommandGroup(g => g.setName('queue').setDescription('Scheduled Amazon posts')
    .addSubcommand(s => s.setName('manage').setDescription('Open the queue dashboard'))
    .addSubcommand(s => s.setName('import').setDescription('Import multiple Markdown posts from a JSON file')
      .addAttachmentOption(o => o.setName('file').setDescription('JSON queue file').setRequired(true))))
  .addSubcommand(s => s.setName('programs').setDescription('Create and manage Amazon program posts'))
  .addSubcommand(s => s.setName('settings').setDescription('Tracking IDs, primary marketplace and bot settings'))
  .addSubcommand(s => s.setName('setup').setDescription('First-time Amazon bot setup'));
