# Double Authentication System — GitHub Prototype

A browser-based prototype of the project **“Double Authentication System Integrating Face Recognition and Eye Blink Count Recognition.”**

The original project describes a two-layer flow:

1. Face recognition / verification
2. Eye-blink count recognition as a numeric credential
3. Access is granted only after both layers succeed

This prototype keeps that same user flow while making it easy to publish as a static GitHub Pages site.

## Features

- Modern responsive security dashboard UI
- Browser camera access
- Face descriptor enrollment and matching using `face-api.js`
- Eye-blink detection using facial landmarks / eye aspect ratio
- Blink groups become PIN digits
- Example PIN: `123` = 1 blink → pause → 2 blinks → pause → 3 blinks
- Local browser storage for the prototype identity
- Protected “Access Granted” panel
- No Python server required for the GitHub Pages demo

## Important prototype note

This is a **demo/prototype**, not a production biometric security product.

The source project report describes a Python/Flask application, CNN-based face recognition, OpenCV, and eye-blink processing. A GitHub Pages site cannot execute that Python/TensorFlow backend. Therefore this version uses browser-side face descriptor matching so the complete authentication flow can be demonstrated from a static website.

For production use, move the biometric processing to a secure backend, encrypt sensitive data, add proper consent/retention controls, and use a robust liveness/anti-spoofing system.

## Run locally

Because camera access is restricted on ordinary `file://` pages, use a local HTTP server.

### Option 1 — Python

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

### Option 2 — VS Code

Install the **Live Server** extension and open `index.html` with Live Server.

## Deploy to GitHub Pages

### 1. Create a GitHub repository

Example:

```text
double-authentication-system
```

### 2. Upload these files

Upload:

```text
index.html
styles.css
app.js
README.md
```

### 3. Enable GitHub Pages

Go to:

```text
Repository → Settings → Pages
```

Under **Build and deployment**:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

Save.

After GitHub finishes deploying, your website will be available at:

```text
https://YOUR-USERNAME.github.io/double-authentication-system/
```

Camera access works because GitHub Pages uses HTTPS.

## How to test

1. Open the deployed site.
2. Click **Start camera**.
3. Allow camera permission.
4. For the easiest demo, click **Use demo identity**.
5. Enter the blink PIN:
   - blink once → pause
   - blink twice → pause
   - blink three times
6. The protected area changes to **ACCESS GRANTED**.

For a real face-enrollment demo:

1. Click **Enroll face**.
2. Enter your name and a 3-digit blink PIN using digits 1–5.
3. Capture your face.
4. Start a new authentication session.
5. Your enrolled face descriptor is matched before the blink stage is enabled.

## Project structure

```text
double-authentication-system/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Original project alignment

The project report identifies the main application components as the front-end camera, server, CNN model, database, and end result. The authentication sequence first verifies the face and then obtains a numeric password through eye blinks.

The prototype represents those stages visually and implements the authentication interaction in the browser.

## Suggested GitHub repository description

> Browser-based prototype of a double authentication system using face verification and eye-blink count recognition.

## Suggested topics / tags

```text
face-recognition
biometric-authentication
eye-blink-detection
computer-vision
javascript
face-api-js
github-pages
machine-learning
security
prototype
```
