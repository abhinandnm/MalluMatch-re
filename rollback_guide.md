# MalluMatch Rollback & Version Control Guide 🛠️

If any future updates break the site, you can revert to this stable version using the following methods:

## 1. Using Git (The Safest Way)
I have just created a **Git Tag** called `stable-v1`. This marks the current "Perfect" state of your code.

**To rollback via command line:**
```powershell
git checkout stable-v1
git push origin stable-v1 --force
```

## 2. Vercel Rollback (Frontend)
1. Go to your [Vercel Dashboard](https://vercel.com/abhinandnms-projects/mallu-match).
2. Click on the **Deployments** tab.
3. Find the deployment from today (March 16).
4. Click the three dots `...` and select **"Rollback"**.
5. This will instantly make this version live again without any code changes.

## 3. Render Rollback (Backend)
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Select your `mallumatch-api` service.
3. Go to the **Events** or **Deployments** tab.
4. Click on the commit hash `74094f9` (the one labeled "privacy, terms, contact").
5. Click **"Deploy this revision"**.

## 🚀 Future Safeguard
Always keep the `master` or `main` branch synced. If things break, simply tell me: *"Rollback to the version from March 16th"* and I will execute the git commands for you!
