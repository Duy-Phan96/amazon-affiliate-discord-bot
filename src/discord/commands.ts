import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const amazonCommand = new SlashCommandBuilder()
 .setName('amazon').setDescription('Configure Amazon affiliate features')
 .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
 .addSubcommand(s=>s.setName('setup').setDescription('Start the guided Amazon setup'))
 .addSubcommand(s=>s.setName('settings').setDescription('Show Amazon bot settings'))
 .addSubcommand(s=>s.setName('status').setDescription('Show bot and provider status'));
