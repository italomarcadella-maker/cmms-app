# CMMS Application Installation Instructions

## Requirements
- A Windows PC (can also run on Linux/Mac with slight command adjustments)
- **Node.js**: You must install Node.js (Version 18 or newer - LTS recommended).
  - Download from: https://nodejs.org/

## Installation Step-by-Step

1. **Copy Files**:
   Copy this entire folder to the target computer (e.g., `C:\cmms`).

2. **Database Setup**:
   The application uses a local file-based database (`prisma/dev.db`).
   On the first run, the system will attempt to create this database automatically using `npx prisma db push`.
   *Note: This requires an internet connection for the first run to download the Prisma engine if not present.*

3. **Configuration (Optional)**:
   Open the `.env` file in a text editor.
   - You can change `AUTH_SECRET` to a random string for better security.

4. **Running the Application**:
   Double-click `start.bat`.
   
   A black terminal window will open showing "Server running at http://localhost:3000".
   Do not close this window while you are using the program.

5. **Accessing the App**:
   Open your web browser (Chrome, Edge, etc.) and visit:
   `http://localhost:3000`

## Troubleshooting

- **"Node is not recognized"**: Install Node.js from the link above and restart the computer.
- **Database errors**: Ensure you have write permissions to the folder. Try running `start.bat` as Administrator right-click -> Run as Administrator.
