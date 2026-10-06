# Using the Amazon Bot Without Creators API Access

You do **not** need Amazon Creators API / Product Advertising API access to use the core affiliate and queue features of this bot.

The API is only needed later for live Amazon product data such as verified prices, discounts, images, availability, and product search. Until API access is available, the bot can still generate affiliate links, publish posts, and automatically work through a queue.

## Recommended API-free workflow

The easiest workflow is:

1. Collect Amazon product links manually or with external research.
2. Write the Discord post text yourself or use an AI assistant to prepare it.
3. Put multiple products into one JSON file.
4. Upload that file with `/amazon queue import`.
5. Review the queue with `/amazon queue manage`.
6. Choose the Discord channel and posting interval.
7. Start the queue.

The bot then publishes the queued posts automatically at the configured interval.

## JSON queue import

Example:

```json
{
  "version": 1,
  "interval_hours": 3,
  "posts": [
    {
      "url": "https://www.amazon.com/dp/EXAMPLE001",
      "name": "Gaming Mouse",
      "markdown": "🖱️ **Gaming Mouse**\nA lightweight wireless option for a clean gaming setup.\n👉 {affiliate_link}"
    },
    {
      "url": "https://www.amazon.com/dp/EXAMPLE002",
      "name": "Gaming Headset",
      "markdown": "🎧 **Gaming Headset**\nA comfortable headset for gaming sessions and team voice chat.\n👉 {affiliate_link}"
    }
  ]
}
```

Upload the file in Discord with:

`/amazon queue import`

The bot validates every entry before importing it. A queue can hold up to **100 pending posts**.

## Supported JSON fields

### Top level

- `version`: currently `1`
- `interval_hours`: optional whole number from **1 to 168**
- `posts`: list of posts to add to the queue (up to **100** in one import)

### Each post

- `url`: full Amazon product URL
- `name`: optional internal queue name
- `markdown`: the Discord post text

Use this placeholder inside the Markdown:

`{affiliate_link}`

The bot replaces it when previewing or publishing the post.

This is important because the current affiliate tracking ID is resolved at publishing time rather than permanently hard-coded into the JSON file.

## Posting intervals

The queue supports custom whole-hour intervals from **1 to 168 hours**.

Examples:

- 3 = every 3 hours
- 6 = every 6 hours
- 12 = every 12 hours
- 24 = once per day
- 48 = every 2 days
- 168 = once per week

You can also change the interval later from:

`/amazon queue manage` → **Queue Settings**

Quick buttons are available for common intervals, plus a **Custom Interval** option.

## Affiliate links and marketplaces

Product links always remain on their original Amazon marketplace.

Examples:

- Amazon.de stays Amazon.de
- Amazon.com stays Amazon.com
- Amazon.co.uk stays Amazon.co.uk

The bot does **not** rewrite an ASIN onto another Amazon marketplace because the same ASIN may not exist there or may point to a different listing.

The matching tracking ID for the source marketplace is added when the post is generated.

For content research, Amazon.com can be used as the preferred source when English product pages and English descriptions are desired. If you supply a .com product link, the bot keeps it as a .com link.

OneLink remains an optional Amazon-side feature. The bot does not claim to control or verify OneLink redirection.

## English posts without API access

The Discord post text can still be completely English even when the product URL points to Amazon.de or Amazon.co.uk.

For example:

```md
🖱️ **Logitech Gaming Mouse**
A lightweight wireless option for players who want a clean gaming setup and responsive controls.
👉 {affiliate_link}
```

The bot can publish this English Markdown while keeping the product link on its original marketplace.

Discord's native Amazon link preview may still use the language of the linked Amazon marketplace. The custom Markdown text is therefore the reliable way to keep the server content consistently English.

## What the bot can do without the API

Without Creators API access, the bot can still:

- generate affiliate links from full Amazon product URLs
- use the correct configured tracking ID for the source marketplace
- publish manual product posts
- create and manage a persistent posting queue
- import many posts from one JSON file
- publish queued posts automatically
- use custom posting intervals
- preview and edit queued Markdown posts
- automatically insert the current affiliate link
- automatically add the required short affiliate disclosure used by this project
- continue the queue after bot/VPS restarts

## What the bot should not invent without the API

Without verified product data, automated posts should not claim:

- a specific current price
- a specific discount percentage
- that an item is currently in stock
- that a deal is the lowest price
- current ratings or review counts
- live product specifications that have not been independently verified

A safe post can instead say things such as:

- "Check the current price on Amazon."
- "View current availability and product details on Amazon."
- "Check available variants on Amazon."

## Recommended workflow with an AI assistant

A practical workflow is:

1. Ask an AI assistant to research or prepare a list of products.
2. Ask it to create concise English Discord Markdown for each product.
3. Ask it to export the result in the queue JSON format.
4. Upload the JSON file to Discord.
5. Review the imported items.
6. Start the queue.

This makes bulk posting possible even before Amazon grants Creators API product-data access.

When API access becomes available later, live product data can be added as an optional enhancement without replacing this API-free workflow.
