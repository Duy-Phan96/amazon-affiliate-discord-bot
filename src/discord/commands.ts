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
  .addSubcommandGroup(g => g.setName('queue').setDescription('Manage scheduled Amazon affiliate posts')
    .addSubcommand(s => s.setName('manage').setDescription('Open the queue dashboard'))
    .addSubcommand(s => s.setName('add').setDescription('Add an Amazon product to the posting queue')
      .addStringOption(o => o.setName('url').setDescription('Full Amazon product URL').setRequired(true).setMaxLength(1500))
      .addStringOption(o => o.setName('title').setDescription('Optional title').setRequired(false).setMaxLength(120))
      .addStringOption(o => o.setName('text').setDescription('Optional text').setRequired(false).setMaxLength(500))
      .addStringOption(o => o.setName('style').setDescription('Post style').setRequired(false).addChoices(
        { name: 'Auto', value: 'AUTO' },
        { name: 'Button only', value: 'BUTTON' },
        { name: 'Embed', value: 'EMBED' }
      )))
    .addSubcommand(s => s.setName('start').setDescription('Start or reconfigure the queue')
      .addChannelOption(o => o.setName('channel').setDescription('Configured Amazon channel').setRequired(true))
      .addIntegerOption(o => o.setName('interval').setDescription('Hours between posts').setRequired(true).addChoices(
        { name: 'Every 12 hours', value: 12 },
        { name: 'Every 24 hours', value: 24 }
      )))
    .addSubcommand(s => s.setName('edit').setDescription('Edit a pending queue item')
      .addIntegerOption(o => o.setName('id').setDescription('Queue item ID from /amazon queue status').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('title').setDescription('New title; leave empty to keep current').setRequired(false).setMaxLength(120))
      .addStringOption(o => o.setName('text').setDescription('New description; leave empty to keep current').setRequired(false).setMaxLength(500))
      .addStringOption(o => o.setName('style').setDescription('New post style').setRequired(false).addChoices(
        { name: 'Auto', value: 'AUTO' },
        { name: 'Button only', value: 'BUTTON' },
        { name: 'Embed', value: 'EMBED' }
      )))
    .addSubcommand(s => s.setName('preview').setDescription('Preview a pending queue item')
      .addIntegerOption(o => o.setName('id').setDescription('Queue item ID from /amazon queue status').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('status').setDescription('Show queue status and pending items'))
    .addSubcommand(s => s.setName('next').setDescription('Post the next queue item now'))
    .addSubcommand(s => s.setName('pause').setDescription('Pause automatic queue posting'))
    .addSubcommand(s => s.setName('resume').setDescription('Resume automatic queue posting'))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a pending queue item')
      .addIntegerOption(o => o.setName('id').setDescription('Queue item ID from /amazon queue status').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('skip').setDescription('Skip a pending queue item but keep it in history')
      .addIntegerOption(o => o.setName('id').setDescription('Queue item ID from /amazon queue status').setRequired(true).setMinValue(1))))
  .addSubcommand(s => s.setName('setup').setDescription('Configure Affiliate or Basic mode, stores and channels'))
  .addSubcommand(s => s.setName('product').setDescription('Preview and publish your affiliate product link with optional text'))
  .addSubcommand(s => s.setName('programs').setDescription('Create and manage Amazon program affiliate posts and templates'))
  .addSubcommand(s => s.setName('settings').setDescription('Show saved Amazon settings'))
  .addSubcommand(s => s.setName('guide').setDescription('Explain tracking IDs, OneLink and disclosures'))
  .addSubcommand(s => s.setName('status').setDescription('Show API-free bot and delivery status'));
