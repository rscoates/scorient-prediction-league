I would like to build a prediction website for football tournaments, beginning with the 2026 World Cup.

The website should be authenticated, using a Google account.

There should be an admin area, with certain users being able to access this using an admin flag.

### Tech Stack
You should use FastAPI, Alembic and SQLAlchemy on the backend
You should use react on the frontend
Everything should be Dockerized

### Functionality
The main functionality should be as follows:
1. There will be 6 rounds of predictions: "Matchday" (Nickname 'Group'), "Round of 32", "Round of 16", "Quarter-Final",  "Semi-Final" and "Final" (which will include match for 3rd place)
1. Users should be prompted by email to fill in their predictions by a certain deadline for each of the 6 rounds. These deadlines will be set by the admins.
1. Users will be able to fill in predictions for each of the 72 games, and then for each of the subsequent 16, 8, 4, 2, 2 games between the deadlines.
1. In addition, users will be able to fill in an entire prediction for the knockout stage at the beginning (qualifiers for round of 32, round of 16, quarter finals, semi finals, final and winner) as well as top goalscorer, player with most assists, total number of goals, number of red cards, and the final referee.
1. There should be a live score chart, updated after every data ingest.
1. There will be a scheduled job that will pull the data into the JSON using cURL / wget
1. When there is an update to this JSON file, a migration will run to load that data into the Database.
1. There may separately be an API call to get this data (not yet implemented)
1. Admins should be able to input results that have not yet come through the API, and these should take precedence over the API results.
1. Scoring Rules are outlined in the Scoring-Rules.md file.
1. Tournament Rules are outlined in the Tournament-Rules.md file.

### Backend
1. This should be reusable for multiple tournaments, so the tournament name should be keyed.
1. While initially only for a small group in a single league, multiple prediction leagues should be allowed, and separate from each other, but a single user might be in many leagues, and obviously each league has many users.
1. Selections before a deadline should be private, but public once the deadline has passed.
1. Once a deadline has passed, no changes can be made to a prediction.
1. Once public, points for each result should be displayed with a RAG highlight (Red: wrong winner, Amber: right winner, Green: right score) or not highlighted if the data has not been ingested.
1. Scoring should be recalculated when data is ingested.
1. Data should be downloadable as CSV and JSON for backup.
1. There should be comprehensive tests, using PyTest.

### UI
1. The UI should be responsive, and use the phone number input for numbers (A T9 keypad) on mobile.
1. All 72 games should be visible on a single page on desktop, and layed out sensibly on mobile.
1. For the initial prediction, the knockout rounds should be on a separate tab to the group games.
1. The frontend should support easy tabbing between boxes
1. Once a deadline has passed, no changes can be made to a prediction.
1. There should be a button for generating the Top 32 teams given the group stage results inputted.
1. For the initial prediction, there is no requirement for the knockout predictions to be consistent, so there should be an intuitive UI for assuming that, but allowing the user to deviate
1. The knockout rounds (for predicting each knockout round as it happens) should be a bracket, on which users can click to "advance" a team.
1. Please use Tailwind CSS, but make it look nice, not the standard fonts and don't use over-use emojis.
1. The logo for the club can be found in scorient-logo.png, and the slogan is "Dignitatem in Proelio"
1. There should be comprehensive tests, using both Puppeteer and Jest.
1. Changes should be saved onChange.