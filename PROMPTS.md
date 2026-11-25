# What I asked the AI

Keep a short log. One entry per prompt is enough.

| What I asked (paste or summarize) | What happened | What I had to fix or check |

1a. What I asked: Read AGENTS.md and README.md, then get my laptop ready for this project, one step at a time, explaining each step: check that Node.js 20 or newer is installed (if not, tell me exactly how to install it on my operating system), run npm install, create .env from .env.example (ask me for the password, and set DB_NAME to (irmarahm_myapp)), run npm run create-db, then run npm run check. If anything fails, help me fix it.

1b. What happened: The prompt was not pasted in properly so the query did not execute properly. 

1c. What I had to fix: I reran the query with the proper spacing and ensuring that nothing was missing.

2a. What I asked: Read AGENTS.md and IDEA.md. Write web/index.html, a simple, good-looking page for my user story with an input for what the user picks or types and a results table filled with 3 made-up rows for now. Write server/server.js, an Express server that serves the web/ folder. No database yet.

2b. What happened: I tested the website based on what was made by the Copilot Agent. 

2c. What I had to fix: I made minor corrections on the layout until I liked what was given.

3a. What I asked: Read AGENTS.md, IDEA.md, server/server.js, and web/index.html. Design tables for my user story with primary and foreign keys and write db/schema.sql. Write db/load.js to create the tables in my database and fill them with about 20 realistic made-up rows per table. Write db/queries.sql with the query that answers my story, using a parameter for what the user picks or types. Add an /api route to server/server.js that runs that query, and change web/index.html to show the real rows instead of the made-up ones. Then tell me exactly how to run it. (Instead changed to include the link to the penguin palmer database rather than 20 made-up rows per table.)

3b. There were penguins of different species from different islands that could now be compared to each other.