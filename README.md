Slack Backend API
Backend API for Slack Connect integration. Handles authentication, messaging, scheduling, and AI-based message generation.

Setup & Run Locally
1. Clone the repository
git clone <your-repo-url>
cd <your-repo-folder>
2. Install dependencies
npm install
3. Configure environment variables
Create a .env file in the root folder and add the following variables (replace placeholder values with your own):

env

DATABASE_URL="your-mongodb-connection-string"
JWT_SECRET="your-jwt-secret"
PORT=4000

HF_API_TOKEN="your-huggingface-api-token"

FRONTEND_URL="http://localhost:3000"
BACKEND_URL="https://your-backend-url/api"

SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_REDIRECT_URI="https://your-backend-url/api/slack/callback"
4. Initialize the database with Prisma
Run one of the following commands (depending on your Prisma schema changes):

Push the schema to your database (no migration history):

npx prisma db push
Or run migrations (if you have migration files):

npx prisma migrate dev

Generate Prisma client:

npx prisma generate

5. Start the development server

npm run dev
The API should now be running on http://localhost:4000 (or the port you specified).

Notes
Ensure your MongoDB Atlas cluster allows connections from your IP.

Replace all sensitive values in .env with your own secrets — do not share or commit them publicly.

The backend expects the frontend to be running on the URL specified in FRONTEND_URL.

Slack OAuth callbacks and API URLs should correspond to your deployed backend or local dev URL with tunneling if needed (e.g., using ngrok).

Useful commands
npm run dev — start dev server

npx prisma generate — regenerate Prisma client

npx prisma db push — push schema to database without migrations

npx prisma migrate dev — run migrations and generate client

All slack Apis used in project postman link - https://slack-connect-9789.postman.co/workspace/slack-connect-Workspace~d18dd739-7da4-401f-836b-64b6296dd714/collection/36428315-3a8eec3f-41a8-49d6-a38f-b24b7f0b3bc2?action=share&creator=36428315
