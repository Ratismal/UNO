# Privacy Policy

Last updated: January 18, 2022

Disclaimer: I am not a lawyer. I am just a developer, and this is a hobby project. And as such, I cannot afford to hire a laywer. I'm writing this Privacy Policy to the best of my abilities. If there are any flaws, or things that need to be changed, please let me know!

By adding and using UNO, you agree to everything within this Privacy Policy. If you disagree, please remove UNO and request that your data be deleted.

## Definitions

For the purposes of this Privacy Policy:

- **Discord** refers to the chat platform created and operated by Discord, Inc.
- **User** or **Account** ("you") means a unique account created by you on the Discord chat platform.
- **Guild** or **Server** means a server or guild on the Discord chat platform.
- **UNO** ("we", "I") is a bot that interacts with Discord in order to provide functionality to the user.
    - Note: For the purposes of this Privacy Policy, **UNO** does *not* refer to the card game created by Mattel. This bot is completely unaffiliated with Mattel. Please do not sue me.

## Information We Collect

We do not collect any user data. The only information stored is:
- Channel rule configurations
- In-progress games

In-progress games are stored every minute, so that they can be restored in the event of bot downtime. Please refer to the Example Stored Data section for exactly what this involves.

## Usage of Information

Channel rule configurations are used so that users may configure a specific ruleset to always be used by default on a given channel.

In-progress games are stored every minute, so that they can be restored in the event of bot downtime. Please refer to the Example Stored Data section for exactly what this involves.

## Information Lifespan

Channel rule configurations are stored forever, or until the lifespan of UNO has been exceeded. It can be requested to be deleted at any point. See the Information Deletion section.

In-progress games are deleted immediately after a game is finished.

## Information Deletion

To request that information is deleted, please either:
- contact me via email at: cat@blargbot.xyz
- contact me via discord at `stupid cat#8160` - [support server](https://discord.gg/H8KADM4)

## Example Stored Data

An example of game data that gets stored is as follows:

```json
{
  "channel": "1010101010101010",
  "players": {
    "111111111111111": {
      "id": "111111111111111",
      "hand": [
        {
          "id": "4",
          "wild": false,
          "color": "G"
        },
        {
          "id": "WILD",
          "wild": true
        },
        // etc...
      ],
      "called": false,
      "finished": false,
      "cardsPlayed": 0
    },
    "222222222222222": {
      "id": "222222222222222",
      "hand": [
        {
          "id": "+2",
          "wild": false,
          "color": "Y"
        },
        {
          "id": "REVERSE",
          "wild": false,
          "color": "B"
        },
        // etc...
      ],
      "called": false,
      "finished": false,
      "cardsPlayed": 0
    }
  },
  "queue": [
    "111111111111111",
    "222222222222222"
  ],
  "deck": [
    {
      "id": "REVERSE",
      "wild": false,
      "color": "Y"
    },
    {
      "id": "4",
      "wild": false,
      "color": "G"
    },
    // etc...
  ],
  "discard": [
    {
      "id": "8",
      "wild": false,
      "color": "G"
    }
  ],
  "finished": [],
  "dropped": [],
  "started": true,
  "confirm": false,
  "lastChange": 1642560988185,
  "rules": {
    "DECKS": 1,
    "INITIAL_CARDS": 7,
    "DRAW_SKIP": true,
    "REVERSE_SKIP": true,
    "MUST_PLAY": false,
    "CALLOUTS": true,
    "CALLOUT_PENALTY": 2,
    "FALSE_CALLOUT_PENALTY": 2,
    "DRAW_AUTOPLAY": false,
    "AUTOPASS": true,
    "OUTPUT_SCORE": false,
    "TRANSCRIPT": false
  },
  "timeStarted": 1642560860548,
  "drawn": 14,
  "transcript": []
}
```