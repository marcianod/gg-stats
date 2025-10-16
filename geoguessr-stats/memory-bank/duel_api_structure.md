GeoGuessr Duel API Structure

This document outlines the JSON structure for a GeoGuessr duel, providing a quick reference for development.

Root Object

The top-level object contains the core components of the game.

    gameId (string): Unique identifier for the match.

    teams (array): Contains two team objects, 'blue' and 'red'.

    rounds (array): Contains objects for each round of the game.

    currentRoundNumber (integer): The round number that has just concluded.

    status (string): The current state of the game (e.g., "Finished").

    options (object): The settings and rules applied to the game.

    result (object): Contains the final outcome of the match.

Team Object Structure

Each object within the teams array represents a team and its player.

    id (string): Unique team identifier.

    name (string): Team color ('blue' or 'red').

    health (integer): The team's remaining health. 0 indicates elimination.

    players (array): Contains a single object with the player's data.

        playerId (string): The player's unique ID.

        guesses (array): A list of all guesses made by the player, one object per round. Each guess object contains:

            roundNumber (integer)

            lat, lng (float): Coordinates of the guess.

            distance (float): Distance from the correct location in meters.

            score (integer): Points awarded for the guess.

        rating (integer): The player's skill rating.

        countryCode (string): The player's country.

        progressChange (object): Details on XP awarded for the match.

    roundResults (array): A list of objects detailing the outcome of each round for the team.

        roundNumber (integer)

        score (integer): The score achieved in that round.

        healthBefore, healthAfter (integer): Health points at the start and end of the round.

Round Object Structure

Each object within the rounds array provides details about a specific round's location and rules.

    roundNumber (integer): The sequence number of the round.

    panorama (object): Contains information about the Google Street View location.

        panoId (string): The panorama identifier.

        lat, lng (float): The actual coordinates of the location.

        countryCode (string): The country of the location.

    multiplier, damageMultiplier (float): The multipliers applied to score and damage for that round. These increase in later rounds (e.g., 1.0, 1.5, 2.0...).

Options & Result

These objects define the game's configuration and final outcome.

    options (object):

        initialHealth (integer): The starting health for each team (e.g., 6000).

        roundTime (integer): Time limit per round in seconds.

        movementOptions (object): Booleans for forbidMoving, forbidZooming, forbidRotating.

        mapSlug (string): Identifier for the map used.

    result (object):

        isDraw (boolean): Indicates if the game was a tie.

        winningTeamId (string): The ID of the winning team.

        winnerStyle (string): The outcome description (e.g., "Victory").

###EXAMPLE OBJECT:

{
  "gameId": "015e9400-2f52-477e-9341-4e76b8946f1c",
  "teams": [
    {
      "id": "fcb19e5a-6621-49c3-a865-c954b86acf55",
      "name": "blue",
      "health": 0,
      "players": [
        {
          "playerId": "608a7f9394d95300015224ac",
          "guesses": [
            {
              "roundNumber": 1,
              "lat": 61.165582511318384,
              "lng": 15.47443754726971,
              "distance": 338558.5297016898,
              "created": "2025-09-08T11:50:43.904+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 4165
            },
            {
              "roundNumber": 2,
              "lat": 7.748233829350191,
              "lng": 7.3041430718900235,
              "distance": 326527.4304657011,
              "created": "2025-09-08T11:51:13.672+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 4193
            },
            {
              "roundNumber": 3,
              "lat": 23.970018343274244,
              "lng": 90.68617514172642,
              "distance": 17885997.39914326,
              "created": "2025-09-08T11:52:05.315+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 0
            },
            {
              "roundNumber": 4,
              "lat": 17.459083290495194,
              "lng": 81.40852245078514,
              "distance": 1013911.0576338202,
              "created": "2025-09-08T11:52:34.7+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 2894
            },
            {
              "roundNumber": 5,
              "lat": -5.215214141394395,
              "lng": 120.19837982358449,
              "distance": 3232839.479971608,
              "created": "2025-09-08T11:53:06.798+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 874
            },
            {
              "roundNumber": 6,
              "lat": -12.615918581338917,
              "lng": -74.26118102282288,
              "distance": 2673045.613246939,
              "created": "2025-09-08T11:53:58.616+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 1183
            }
          ],
          "rating": 700,
          "countryCode": "sr",
          "progressChange": {
            "xpProgressions": [
              {
                "xp": 531545,
                "currentLevel": {
                  "level": 109,
                  "xpStart": 529370
                },
                "nextLevel": {
                  "level": 110,
                  "xpStart": 542440
                },
                "currentTitle": {
                  "id": 310,
                  "tierId": 110
                }
              },
              {
                "xp": 531610,
                "currentLevel": {
                  "level": 109,
                  "xpStart": 529370
                },
                "nextLevel": {
                  "level": 110,
                  "xpStart": 542440
                },
                "currentTitle": {
                  "id": 310,
                  "tierId": 110
                }
              }
            ],
            "awardedXp": {
              "totalAwardedXp": 65,
              "xpAwards": [
                {
                  "xp": 40,
                  "reason": "DuelCompleted",
                  "count": 1
                },
                {
                  "xp": 25,
                  "reason": "Marathon",
                  "count": 1
                }
              ]
            },
            "medal": "None",
            "competitiveProgress": null,
            "rankedSystemProgress": {
              "points": {},
              "totalWeeklyPoints": 0,
              "weeklyCap": 0,
              "gamesPlayedWithinWeeklyCap": 0,
              "positionBefore": 25,
              "positionAfter": 26,
              "ratingBefore": 983,
              "ratingAfter": 971,
              "winStreak": 0,
              "bucketSortedBy": "Rating",
              "gameMode": "NoMoveDuels",
              "gameModeRatingBefore": 873,
              "gameModeRatingAfter": 863,
              "gameModeGamesPlayed": 2477,
              "gameModeGamesRequired": 10,
              "placementGamesPlayed": 0,
              "placementGamesRequired": 0
            },
            "rankedTeamDuelsProgress": null
          },
          "pin": null,
          "helpRequested": false,
          "isSteam": false
        }
      ],
      "roundResults": [
        {
          "roundNumber": 1,
          "score": 4165,
          "healthBefore": 6000,
          "healthAfter": 6000,
          "bestGuess": {
            "roundNumber": 1,
            "lat": 61.165582511318384,
            "lng": 15.47443754726971,
            "distance": 338558.5297016898,
            "created": "2025-09-08T11:50:43.904+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 4165
          }
        },
        {
          "roundNumber": 2,
          "score": 4193,
          "healthBefore": 6000,
          "healthAfter": 6000,
          "bestGuess": {
            "roundNumber": 2,
            "lat": 7.748233829350191,
            "lng": 7.3041430718900235,
            "distance": 326527.4304657011,
            "created": "2025-09-08T11:51:13.672+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 4193
          }
        },
        {
          "roundNumber": 3,
          "score": 0,
          "healthBefore": 6000,
          "healthAfter": 4796,
          "bestGuess": {
            "roundNumber": 3,
            "lat": 23.970018343274244,
            "lng": 90.68617514172642,
            "distance": 17885997.39914326,
            "created": "2025-09-08T11:52:05.315+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 0
          }
        },
        {
          "roundNumber": 4,
          "score": 2894,
          "healthBefore": 4796,
          "healthAfter": 4796,
          "bestGuess": {
            "roundNumber": 4,
            "lat": 17.459083290495194,
            "lng": 81.40852245078514,
            "distance": 1013911.0576338202,
            "created": "2025-09-08T11:52:34.7+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 2894
          }
        },
        {
          "roundNumber": 5,
          "score": 874,
          "healthBefore": 4796,
          "healthAfter": 4796,
          "bestGuess": {
            "roundNumber": 5,
            "lat": -5.215214141394395,
            "lng": 120.19837982358449,
            "distance": 3232839.479971608,
            "created": "2025-09-08T11:53:06.798+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 874
          }
        },
        {
          "roundNumber": 6,
          "score": 1183,
          "healthBefore": 4796,
          "healthAfter": 0,
          "bestGuess": {
            "roundNumber": 6,
            "lat": -12.615918581338917,
            "lng": -74.26118102282288,
            "distance": 2673045.613246939,
            "created": "2025-09-08T11:53:58.616+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 1183
          }
        }
      ]
    },
    {
      "id": "a0b028bc-e934-48cb-a0a8-26270f2574e4",
      "name": "red",
      "health": 408,
      "players": [
        {
          "playerId": "669ffa8aad2cbc9f50d6552d",
          "guesses": [
            {
              "roundNumber": 1,
              "lat": 67.8482640771517,
              "lng": 20.300472319565316,
              "distance": 1088865.0528968808,
              "created": "2025-09-08T11:50:52.804+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 2779
            },
            {
              "roundNumber": 2,
              "lat": 5.848960190894197,
              "lng": -4.687351299054836,
              "distance": 1224215.4475378746,
              "created": "2025-09-08T11:51:25.795+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 2583
            },
            {
              "roundNumber": 3,
              "lat": -24.6767548158822,
              "lng": -51.35404074120507,
              "distance": 2640008.081945667,
              "created": "2025-09-08T11:52:11.882+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 1204
            },
            {
              "roundNumber": 4,
              "lat": 23.951389490285678,
              "lng": 89.68140332210957,
              "distance": 2102528.855539671,
              "created": "2025-09-08T11:52:40.602+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 1609
            },
            {
              "roundNumber": 5,
              "lat": -1.3756580319195097,
              "lng": -80.06612903619146,
              "distance": 17813175.175005633,
              "created": "2025-09-08T11:53:18.861+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 0
            },
            {
              "roundNumber": 6,
              "lat": -38.80360484872878,
              "lng": -72.48335354398247,
              "distance": 244506.6972635524,
              "created": "2025-09-08T11:53:57.515+00:00",
              "isTeamsBestGuessOnRound": true,
              "score": 4382
            }
          ],
          "rating": 855,
          "countryCode": "nl",
          "progressChange": {
            "xpProgressions": [
              {
                "xp": 294335,
                "currentLevel": {
                  "level": 87,
                  "xpStart": 288900
                },
                "nextLevel": {
                  "level": 88,
                  "xpStart": 298020
                },
                "currentTitle": {
                  "id": 270,
                  "tierId": 90
                }
              },
              {
                "xp": 294402,
                "currentLevel": {
                  "level": 87,
                  "xpStart": 288900
                },
                "nextLevel": {
                  "level": 88,
                  "xpStart": 298020
                },
                "currentTitle": {
                  "id": 270,
                  "tierId": 90
                }
              }
            ],
            "awardedXp": {
              "totalAwardedXp": 67,
              "xpAwards": [
                {
                  "xp": 40,
                  "reason": "DuelCompleted",
                  "count": 1
                },
                {
                  "xp": 2,
                  "reason": "HpBonus",
                  "count": 408
                },
                {
                  "xp": 25,
                  "reason": "Marathon",
                  "count": 1
                }
              ]
            },
            "medal": "None",
            "competitiveProgress": null,
            "rankedSystemProgress": {
              "points": {},
              "totalWeeklyPoints": 0,
              "weeklyCap": 0,
              "gamesPlayedWithinWeeklyCap": 0,
              "positionBefore": 11,
              "positionAfter": 11,
              "ratingBefore": 1072,
              "ratingAfter": 1084,
              "winStreak": 2,
              "bucketSortedBy": "Rating",
              "gameMode": "NoMoveDuels",
              "gameModeRatingBefore": 1001,
              "gameModeRatingAfter": 1011,
              "gameModeGamesPlayed": 1583,
              "gameModeGamesRequired": 10,
              "placementGamesPlayed": 0,
              "placementGamesRequired": 0
            },
            "rankedTeamDuelsProgress": null
          },
          "pin": {
            "lat": 37.826655,
            "lng": -122.42289
          },
          "helpRequested": false,
          "isSteam": false
        }
      ],
      "roundResults": [
        {
          "roundNumber": 1,
          "score": 2779,
          "healthBefore": 6000,
          "healthAfter": 4614,
          "bestGuess": {
            "roundNumber": 1,
            "lat": 67.8482640771517,
            "lng": 20.300472319565316,
            "distance": 1088865.0528968808,
            "created": "2025-09-08T11:50:52.804+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 2779
          }
        },
        {
          "roundNumber": 2,
          "score": 2583,
          "healthBefore": 4614,
          "healthAfter": 3004,
          "bestGuess": {
            "roundNumber": 2,
            "lat": 5.848960190894197,
            "lng": -4.687351299054836,
            "distance": 1224215.4475378746,
            "created": "2025-09-08T11:51:25.795+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 2583
          }
        },
        {
          "roundNumber": 3,
          "score": 1204,
          "healthBefore": 3004,
          "healthAfter": 3004,
          "bestGuess": {
            "roundNumber": 3,
            "lat": -24.6767548158822,
            "lng": -51.35404074120507,
            "distance": 2640008.081945667,
            "created": "2025-09-08T11:52:11.882+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 1204
          }
        },
        {
          "roundNumber": 4,
          "score": 1609,
          "healthBefore": 3004,
          "healthAfter": 1719,
          "bestGuess": {
            "roundNumber": 4,
            "lat": 23.951389490285678,
            "lng": 89.68140332210957,
            "distance": 2102528.855539671,
            "created": "2025-09-08T11:52:40.602+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 1609
          }
        },
        {
          "roundNumber": 5,
          "score": 0,
          "healthBefore": 1719,
          "healthAfter": 408,
          "bestGuess": {
            "roundNumber": 5,
            "lat": -1.3756580319195097,
            "lng": -80.06612903619146,
            "distance": 17813175.175005633,
            "created": "2025-09-08T11:53:18.861+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 0
          }
        },
        {
          "roundNumber": 6,
          "score": 4382,
          "healthBefore": 408,
          "healthAfter": 408,
          "bestGuess": {
            "roundNumber": 6,
            "lat": -38.80360484872878,
            "lng": -72.48335354398247,
            "distance": 244506.6972635524,
            "created": "2025-09-08T11:53:57.515+00:00",
            "isTeamsBestGuessOnRound": true,
            "score": 4382
          }
        }
      ]
    }
  ],
  "rounds": [
    {
      "roundNumber": 1,
      "panorama": {
        "panoId": "644D77467057325F3442393738533044437A67674177",
        "lat": 58.86623368482232,
        "lng": 11.47754328905505,
        "countryCode": "se",
        "heading": 70,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 1,
      "damageMultiplier": 1,
      "startTime": "2025-09-08T11:50:41.601+00:00",
      "endTime": "2025-09-08T11:50:58.904+00:00",
      "timerStartTime": "2025-09-08T11:50:43.904+00:00"
    },
    {
      "roundNumber": 2,
      "panorama": {
        "panoId": "536E645F786A45624F4F6A476D425548305565327651",
        "lat": 4.973498029956622,
        "lng": 6.336810079707806,
        "countryCode": "ng",
        "heading": 127,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 1,
      "damageMultiplier": 1,
      "startTime": "2025-09-08T11:51:05.316+00:00",
      "endTime": "2025-09-08T11:51:28.672+00:00",
      "timerStartTime": "2025-09-08T11:51:13.672+00:00"
    },
    {
      "roundNumber": 3,
      "panorama": {
        "panoId": "33505348513456414F35383250637247356F32454151",
        "lat": -12.63570847756035,
        "lng": -73.01832917166585,
        "countryCode": "pe",
        "heading": 26,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 1,
      "damageMultiplier": 1,
      "startTime": "2025-09-08T11:51:37.831+00:00",
      "endTime": "2025-09-08T11:52:20.315+00:00",
      "timerStartTime": "2025-09-08T11:52:05.315+00:00"
    },
    {
      "roundNumber": 4,
      "panorama": {
        "panoId": "4A6239625252673954645354654F5A51752D78346D41",
        "lat": 9.380908005161418,
        "lng": 77.05623138066281,
        "countryCode": "in",
        "heading": 94,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 1,
      "damageMultiplier": 1,
      "startTime": "2025-09-08T11:52:24.017+00:00",
      "endTime": "2025-09-08T11:52:49.7+00:00",
      "timerStartTime": "2025-09-08T11:52:34.7+00:00"
    },
    {
      "roundNumber": 5,
      "panorama": {
        "panoId": "4452624E63317A475A503144475871634B4C74756C51",
        "lat": 20.277877955281497,
        "lng": 105.97368320160597,
        "countryCode": "vn",
        "heading": 246,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 1.5,
      "damageMultiplier": 1.5,
      "startTime": "2025-09-08T11:52:53.073+00:00",
      "endTime": "2025-09-08T11:53:21.798+00:00",
      "timerStartTime": "2025-09-08T11:53:06.798+00:00"
    },
    {
      "roundNumber": 6,
      "panorama": {
        "panoId": "5A6C5461473057356B6F384E4D33323331794E386341",
        "lat": -36.60506212412368,
        "lng": -72.53357002335198,
        "countryCode": "cl",
        "heading": 283,
        "pitch": 0,
        "zoom": 0
      },
      "hasProcessedRoundTimeout": true,
      "isHealingRound": false,
      "multiplier": 2,
      "damageMultiplier": 2,
      "startTime": "2025-09-08T11:53:30.921+00:00",
      "endTime": "2025-09-08T11:54:12.515+00:00",
      "timerStartTime": "2025-09-08T11:53:57.515+00:00"
    }
  ],
  "currentRoundNumber": 6,
  "status": "Finished",
  "version": 42,
  "options": {
    "initialHealth": 6000,
    "individualInitialHealth": false,
    "initialHealthTeamOne": 6000,
    "initialHealthTeamTwo": 6000,
    "roundTime": 15,
    "maxRoundTime": 0,
    "gracePeriodTime": 1,
    "gameTimeOut": 7200,
    "maxNumberOfRounds": 0,
    "healingRounds": [
      5
    ],
    "movementOptions": {
      "forbidMoving": true,
      "forbidZooming": false,
      "forbidRotating": false
    },
    "mapSlug": "668ea3252973190af74233b5",
    "isRated": true,
    "map": {
      "name": "A Competitive World",
      "slug": "668ea3252973190af74233b5",
      "bounds": {
        "min": {
          "lat": -84.99784921796194,
          "lng": -170.832231289269
        },
        "max": {
          "lat": 81.68091458260601,
          "lng": 178.5147748068589
        }
      },
      "maxErrorDistance": 18539857
    },
    "duelRoundOptions": [],
    "roundsWithoutDamageMultiplier": 4,
    "disableMultipliers": false,
    "multiplierIncrement": 5,
    "disableHealing": true,
    "isTeamDuels": false,
    "gameContext": {
      "type": "None",
      "id": ""
    },
    "roundStartingBehavior": "Default",
    "flashbackRounds": [],
    "competitiveGameMode": "NoMoveDuels",
    "countAllGuesses": false,
    "masterControlAutoStartRounds": false,
    "consumedLocationsIdentifier": "",
    "useCuratedLocations": false,
    "extraWaitTimeBetweenRounds": 0,
    "roundCountdownDelay": 4,
    "botBehaviors": null
  },
  "movementOptions": {
    "forbidMoving": true,
    "forbidZooming": false,
    "forbidRotating": false
  },
  "mapBounds": {
    "min": {
      "lat": -84.99784921796194,
      "lng": -170.832231289269
    },
    "max": {
      "lat": 81.68091458260601,
      "lng": 178.5147748068589
    }
  },
  "initialHealth": 6000,
  "maxNumberOfRounds": 0,
  "result": {
    "isDraw": false,
    "winningTeamId": "a0b028bc-e934-48cb-a0a8-26270f2574e4",
    "winnerStyle": "ComebackVictory"
  },
  "isPaused": false,
  "gameServerNodeId": null
}