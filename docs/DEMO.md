# Pitchside demo walkthrough

## Start

1. In VS Code, open this project folder.
2. Open one terminal and run `npm start`.
3. Open http://localhost:3000. Use the home page, not the old `/tasks` URL.
4. Create an account or sign in. Existing accounts from the earlier to-do prototype still work.

The two records titled “Demo:” are sample sessions for demonstrating the interface, not a claim about training you have actually completed. You can edit or delete them.

## A two-minute demonstration

**Introduction:** “I built Pitchside, a soccer training planner. Players can plan sessions, organize drills, and track training. It uses a Node.js/Express backend and a persistent MongoDB database.”

1. **Create:** click **New session**. Enter “Passing before match day”, choose **Passing**, set **45 minutes**, pick a date, and add a location and notes. Save it.
2. **Read:** show the new session in your training plan and on the weekly calendar.
3. **Update:** click its pencil icon, change the duration to **60 minutes**, and save.
4. **Complete:** click the round check button. Show **Completed** and **Minutes trained** changing. Click it again to mark the session planned.
5. **Delete:** create a temporary session, click its bin icon, then confirm deletion.
6. **Persistence:** refresh the page. The saved sessions remain. If time permits, stop with Ctrl+C and run `npm start` again to demonstrate persistence across restarts.
7. **Authentication:** show the sign-out button and explain that sessions belong to the signed-in account. Automated tests verify that another account cannot access them.
8. **Backend:** show `src/routes/training.js` and the route table in README. Every API route returns JSON.

## What the pieces do

- The browser displays the app and sends HTTP requests using `fetch`.
- Express handles routes and checks authentication and input.
- MongoDB stores users, hashed login sessions, and training records.
- Passwords use salted scrypt hashes; session cookies are HttpOnly and SameSite.
- MongoDB queries include the signed-in user's ID so data stays private.
- `.env` holds local configuration and database credentials. It is ignored by Git.

## If something goes wrong

- **Connection refused:** run `npm start` and leave that terminal open.
- **Port already in use:** stop your previous server with Ctrl+C. Avoid running multiple `npm start` / `npm run dev` terminals.
- **Old page appears:** refresh the browser at http://localhost:3000.
- **Empty plan:** accounts have separate plans. Check that you signed in with the intended account.
- **First start is slow:** MongoDB downloads once; subsequent starts reuse it.
- **No public link:** this demo runs locally on your Mac. GitHub stores the code; it does not host this Node.js/MongoDB app automatically.
