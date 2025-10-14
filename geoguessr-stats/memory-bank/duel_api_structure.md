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