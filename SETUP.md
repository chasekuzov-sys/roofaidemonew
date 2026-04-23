# Get your RoofAI demo live in 20 minutes
# Follow every step exactly. Don't skip anything.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — GitHub account (3 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to: github.com
2. Click "Sign up"
3. Enter your email, create a password, pick a username
4. Verify your email when they send you a code
5. On the welcome screen just click "Skip personalization" at the bottom


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — Create your repository (2 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A repository is just a folder on GitHub that holds your code.

1. Click the green "New" button on the left side
   (or go to: github.com/new)
2. Repository name: roofai-demo
3. Make sure "Public" is selected
4. Scroll down and click "Create repository" (green button)

You'll see an empty repository page. Leave this tab open.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — Upload your files (8 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You need to upload 8 files. Here's the easiest way:

1. On your empty repository page, click "uploading an existing file"
   (it's a small link in the middle of the page)

2. Open Finder on your Mac and find the roofai folder you downloaded
   (the zip file — unzip it first by double-clicking it)

3. Drag ALL the files and folders into the GitHub upload window

4. Scroll down, click "Commit changes" (green button)

Wait for it to upload. You'll see all your files listed in the repository.

If drag and drop doesn't work, use the manual method:
- Click "Create new file"
- Type the filename exactly (e.g. "api/claude.js")
- Paste the file contents
- Click "Commit new file"
- Repeat for each file

Files to upload:
  package.json          (root level)
  vite.config.js        (root level)
  vercel.json           (root level)
  index.html            (root level)
  src/main.jsx          (inside src folder)
  src/App.jsx           (inside src folder)
  api/claude.js         (inside api folder)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — Get your API key (2 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to: console.anthropic.com
2. Log in with the same email you use for Claude
3. Click "API Keys" in the left sidebar
4. Click "Create Key"
5. Name it: roofai-demo
6. COPY THE KEY RIGHT NOW — you cannot see it again after closing

It looks like this: sk-ant-api03-xxxxxxxxxxxxxxxxxxxx

Save it in your Notes app on your phone so you don't lose it.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — Deploy on Vercel (5 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vercel is free and will host your app permanently.

1. Go to: vercel.com
2. Click "Sign Up"
3. Click "Continue with GitHub" — log in with your GitHub account
4. Click "Add New..." → "Project"
5. Find "roofai-demo" in the list and click "Import"

IMPORTANT — before you click Deploy:
6. Find the "Environment Variables" section
7. Click "Add"
8. Name:  ANTHROPIC_API_KEY
   Value: paste your API key from Step 4
9. Click "Save"

10. NOW click "Deploy" (big black button)

Vercel will build your app. This takes about 60 seconds.
You'll see a success screen with a preview of your site.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — Get your URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. On the success screen, click "Continue to Dashboard"
2. Your URL is shown at the top — looks like:
   roofai-demo.vercel.app
   or
   roofai-demo-yourname.vercel.app

3. Click it to open your live app
4. Test Quick SMS — it should generate a real message
5. Test the estimate builder — should build a full estimate

If everything works: YOU'RE DONE. 🎉

Bookmark that URL. Text it to yourself. Put it in your email.
That's your permanent demo link — works on any device, AI fully working,
API key completely private and secure.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick SMS says "connection error":
→ Your API key probably wasn't saved correctly
→ Go to vercel.com → your project → Settings → Environment Variables
→ Check ANTHROPIC_API_KEY is there with your key
→ Go to Deployments → click the 3 dots → Redeploy

App shows blank white screen:
→ Check that src/App.jsx and src/main.jsx uploaded correctly
→ In Vercel go to your deployment → View Function Logs

Build failed:
→ Check that package.json and vite.config.js are in the root folder
→ Make sure there are no extra folders inside src/

Still stuck:
→ Go back to Claude and describe exactly what you see
→ I'll tell you exactly what to do
