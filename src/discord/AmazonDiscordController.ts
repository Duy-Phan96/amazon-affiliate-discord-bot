import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ChatInputCommandInteraction, Client, EmbedBuilder, Events, Interaction, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ConfigRepository } from '../repositories/ConfigRepository.js';
import type { MarketplaceCode } from '../domain/amazon.js';
import { AmazonAffiliateService } from '../services/AmazonAffiliateService.js';

const LABELS:Record<MarketplaceCode,string>={DE:'🇩🇪 Amazon.de',US:'🇺🇸 Amazon.com',UK:'🇬🇧 Amazon.co.uk'};
export class AmazonDiscordController {
 private affiliate:AmazonAffiliateService;
 constructor(private client:Client,private repo:ConfigRepository){this.affiliate=new AmazonAffiliateService(repo)}
 register(){this.client.on(Events.InteractionCreate,i=>void this.onInteraction(i));this.client.on(Events.MessageCreate,m=>void this.onMessage(m))}
 private async onInteraction(i:Interaction){
  if(i.isChatInputCommand()&&i.commandName==='amazon') return this.command(i);
  if(!i.guildId)return;
  if(i.isStringSelectMenu()&&i.customId==='amazon:setup:marketplaces'){
   const rows=i.values.map(code=>new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(`tag_${code}`).setLabel(`${LABELS[code as MarketplaceCode]} tracking ID`).setPlaceholder(code==='US'?'example-20':'example-21').setRequired(true).setStyle(TextInputStyle.Short)));
   const modal=new ModalBuilder().setCustomId(`amazon:setup:tags:${i.values.join(',')}`).setTitle('Amazon tracking IDs').addComponents(...rows);return i.showModal(modal);
  }
  if(i.isModalSubmit()&&i.customId.startsWith('amazon:setup:tags:')){
   const codes=i.customId.split(':')[3].split(',') as MarketplaceCode[];for(const c of codes)this.repo.setMarketplace(i.guildId,c,i.fields.getTextInputValue(`tag_${c}`));
   const oneLink=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('amazon:setup:onelink:yes').setLabel('OneLink configured (Recommended)').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId('amazon:setup:onelink:no').setLabel('Use individual IDs').setStyle(ButtonStyle.Secondary));
   return i.reply({ephemeral:true,content:'**Step 2 / 4 — International links**\nUse Amazon OneLink if you have linked your international Associates accounts. The bot never derives IDs by changing `-20` / `-21`.',components:[oneLink]});
  }
  if(i.isButton()&&i.customId.startsWith('amazon:setup:onelink:')){
   const enabled=i.customId.endsWith(':yes');for(const m of this.repo.listMarketplaces(i.guildId))this.repo.setMarketplace(i.guildId,m.marketplace,m.affiliate_tag,enabled);
   const row=new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId('amazon:setup:channel').setPlaceholder('Select affiliate-link channel').setChannelTypes(ChannelType.GuildText));
   return i.update({content:'**Step 3 / 4 — Channel**\nChoose where automatic Amazon affiliate-link handling is allowed.',components:[row]});
  }
  if(i.isChannelSelectMenu()&&i.customId==='amazon:setup:channel'){
   this.repo.setLinkChannel(i.guildId,i.values[0]);const row=new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('amazon:setup:mode').setPlaceholder('Select link mode').addOptions({label:'Button (Recommended)',value:'BUTTON',description:'Compact affiliate button; original message stays untouched'},{label:'Reply',value:'REPLY',description:'Reply with the affiliate URL'},{label:'Off',value:'OFF'}));return i.update({content:'**Step 4 / 4 — Link behavior**\nThe bot never edits or impersonates member messages.',components:[row]});
  }
  if(i.isStringSelectMenu()&&i.customId==='amazon:setup:mode'){
   this.repo.setLinkMode(i.guildId,i.values[0] as any);return i.update({content:this.settingsText(i.guildId)+'\n\n✅ **Configuration saved.**',components:[]});
  }
 }
 private async command(i:ChatInputCommandInteraction){if(!i.guildId)return;i.commandName;const sub=i.options.getSubcommand();if(sub==='setup'){
  const row=new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('amazon:setup:marketplaces').setPlaceholder('Select Amazon marketplaces').setMinValues(1).setMaxValues(3).addOptions({label:'Germany',emoji:'🇩🇪',value:'DE'},{label:'United States',emoji:'🇺🇸',value:'US'},{label:'United Kingdom',emoji:'🇬🇧',value:'UK'}));return i.reply({ephemeral:true,content:'**Amazon Bot Setup — Step 1 / 4**\nSelect every marketplace for which you have a real Amazon Associates tracking ID.',components:[row]});}
  if(sub==='settings')return i.reply({ephemeral:true,content:this.settingsText(i.guildId)});
  return i.reply({ephemeral:true,content:'**Amazon Bot Status**\n🟢 Bot online\n🟢 Database connected\n⚪ Live price provider not configured\n⚪ Automatic deal discovery requires a price-capable/Creators API provider'});
 }
 private settingsText(guildId:string){const g=this.repo.getGuild(guildId);const ms=this.repo.listMarketplaces(guildId);const channels=this.repo.listLinkChannels(guildId);return `**Amazon Bot Settings**\n\n**Marketplaces**\n${ms.length?ms.map(m=>`${LABELS[m.marketplace as MarketplaceCode]} — Enabled${m.onelink_enabled?' · OneLink':''}`).join('\n'):'None configured'}\n\n**Automatic affiliate links**\nMode: ${g.link_mode}\nChannels: ${channels.length?channels.map(c=>`<#${c.channel_id}>`).join(', '):'None'}\n\n**Disclosure**\n${g.disclosure}`}
 private async onMessage(m:any){if(m.author.bot||!m.guildId||!this.repo.isLinkChannel(m.guildId,m.channelId))return;const mode=this.repo.getGuild(m.guildId).link_mode;if(mode==='OFF')return;const urls=(m.content.match(/https?:\/\/[^\s<>]+/g)??[]);for(const url of urls){try{const result=this.affiliate.generate(m.guildId,url);const disclosure=this.repo.getGuild(m.guildId).disclosure;if(mode==='REPLY')await m.reply({content:`🛒 ${result.affiliateUrl}\n_${disclosure}_`,allowedMentions:{repliedUser:false}});else if(mode==='BUTTON'){const row=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel('View on Amazon').setStyle(ButtonStyle.Link).setURL(result.affiliateUrl));await m.reply({content:`🛒 **Amazon affiliate link**\n_${disclosure}_`,components:[row],allowedMentions:{repliedUser:false}})}break}catch{/* ignore non-Amazon/unsupported links */}}
 }
}
