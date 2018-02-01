// ---------------------- How to configure a Discord bot: ----------------------
// 1: Create an app : https://discordapp.com/developers/applications/me
// 2: When app is created, click on "Create a Bot User"
// 3: Name bot, copy the Token, paste them into config.json (see example config file)
// 4: Go to this URL (replace the Client ID)
//    https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=3072
// 5: Choose the server you want to give your bot access to and click OK (or wtv the button is named)
// 6: Go on Discord and give permission to your bot to read and write msgs
// 7: Copy Channel ID and paste it into the config.json channel mapping (see example config file)

// ----------------------- How to configure a Slack bot: ------------------------
// 1: Go to https://YOUR_SERVER.slack.com/apps/manage/custom-integrations
// 2: Click on Bots
// 3: Click on Add Integration
// 4: Name your bot, copy the Token and paste it in the config.json (see example config file)
// 5: Invite the bot to the wanted channel (/invite @my-l33t-bot)
// 6: Copy the channel name and ID into the config.json channel mapping (see example config file)


// -----------------------------Configurable section-----------------------------

const DEBUG = true;
const config = require("./config.json")

// ------------------------------------------------------------------------------

if (config.discord_token     === "" ||
    config.slack_token       === "") {
	console.log("You need to configure your Discord and Slack tokens and channels" +
	            "in the file config.json.");
	process.exit(1);
}

// Build a reverse-lookup map from configured Discord->Slack channel map
var discord_to_slack_map = config.discord_to_slack_channel_map;
var slack_to_discord_map = {}
Object.keys(discord_to_slack_map).forEach(function(discordChannel) {
   slackChannelEntry = discord_to_slack_map[discordChannel];
   slack_to_discord_map[slackChannelEntry.slack_id] = discordChannel;
   debug("Slack: " + slackChannelEntry.slack_channel + " <=> Discord: " + slack_to_discord_map[slackChannelEntry.slack_id])
})

const Discord = require('discord.js');
const discord_client = new Discord.Client();
const SlackBot = require('slackbots');
const slack_client = new SlackBot({token: config.slack_token, name: 'discord_bridge'});

function debug(msg) {
	if (DEBUG) { console.log(msg); }
}

//Let's configure events:

discord_client.on('ready', function(){
	//Finding the right channel where to send the messages
	console.log("Discord connected");
});

slack_client.on('start', function() {
	console.log("Slack connected");
});

//Redirect Discord messages to Slack
discord_client.on('message', function(message) {
	//Avoiding re-sending a message we just received from Slack
	//(event gets triggered even if it's a msg *we* sent to the chat)
	if (message.author.username != discord_client.user.username)
	{
                // Find the slack channel
                var slack_channel_entry = discord_to_slack_map[message.channel.name]
                var slack_channel = slack_channel_entry.slack_channel
                var slack_channel_private = slack_channel_entry.hidden
                
		//Check for atachements (files/images/etc.)
		var content = message.content;
		if (message.attachments != null) {
			var attachments = message.attachments.array();
			attachments.forEach(a => { content += "\n" + a.url; });	
		}
		debug("Discord --> (" + message.channel.id + ") " + message.author.username + ": " + content);
		if (slack_channel_private) {
			slack_client.postMessageToGroup(slack_channel, message.author.username + ": " + content);
		} else {
			slack_client.postMessageToChannel(slack_channel, message.author.username + ": " + content);
		}
	}
});

//Redirect Slack client to Discord
slack_client.on('message', function(message) {
	if (message.type == "message")
	{
                // Find the discord channel
                var channelId = slack_to_discord_map[message.channel]
                debug("Discord channel: " + channelId)
	        discord_channel = discord_client.channels.findAll("name", channelId)[0];
		//Unlike Discord, event doesn't get triggered if it is a msg we sent

		//We have to find the user name/nickname by ourselves though
		slack_client.getUsers()._value.members.forEach(function(elem){
			if (elem.id == message.user)
			{
				username = elem.name;
				realname = elem.real_name;
				debug("Slack  --> " + realname + " (" + username + ") : " + message.text);
				discord_channel.send(realname + " :  " + message.text);
			}
		});
	}
});

discord_client.login(config.discord_token);
