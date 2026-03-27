# Standard Operating Procedure (SOP) for Auto-DB-Updater

## 1. Purpose
This document outlines the standard workflow for operators using the RedWing DB Automation tool to review, verify, and approve new flight route submissions. The goal is to ensure that incoming routes are safe, accurate, and correctly appended to the central database.

## 2. Accessing the System
1. **Frontend Dashboard**: Navigate to the provided URL for the operator dashboard (typically `http://localhost:5173` or the production equivalent).
2. **Login**: Authenticate using your operator credentials. You must have the `operator` role to approve or reject submissions.

## 3. Daily Workflow: The Inbox
Upon logging in, you will land on the **Inbox Page**. This acts as your primary queue.
* **Pending Submissions**: Look for rows with the status `pending` (indicated by a dot on the left).
* **Information Displayed**: You can see the Route (Source → Destination), the Mission File name, Network Name, and when it was received.
* **Action**: Click on any pending submission row to open the **Submission Detail** view.

## 4. Submission Review Process

Once inside a submission, you must pass **Two Gates** before you can approve it. The system strictly enforces this order.

### Gate 1: Waypoint Verification
By default, the **Waypoint Viewer Tab** is open.
1. **Review on Map**: Inspect the 3D Cesium viewer. Ensure the flight path matches the intended source and destination locations without intersecting terrain or no-fly zones.
2. **Review Elevation Profile**: Check the elevation graph below the map to ensure the drone maintains a safe altitude along the route.
3. **Verify Checks**: At the bottom of the screen (the specific verification footer), you must manually check off three boxes indicating you have:
   * [x] Reviewed route on map
   * [x] Reviewed elevation profile
   * [x] Route matches source → destination
4. **Mark as Verified**: Once all three boxes are checked, click the **"Mark Route as Verified"** button. This unlocks the next tab.

### Gate 2: ID Resolution
After verifying the waypoints, click on the newly unlocked **ID Resolution Tab**.
1. **Review Excel Preview**: The system runs a dry-run against `Flight_data_updated.xlsx`. It shows you what changes will be made to the database.
2. **Entity Action Analysis**: Look closely at the `Action` for networks, locations, and landing zones. 
   * `EXISTING`: The system found a match in the database.
   * `NEW`: The system did not find a match and **will create a new entry**.
3. **Confirm New Entities**: Note which entities are marked as `NEW`. When you approve the submission, the system will inherently trust that these new entries are intended and not typos.

### Optional: Files Tab
You can click the **Files Tab** at any time to inspect the raw `.waypoints` file and snapshot images of the flight path sourced from Google Drive.

## 5. Final Actions

Located at the top right of the Submission Detail view, you have three primary actions:

### Approve
* **When to select**: The route is safe, the waypoint logic is verified, and you are comfortable with the database changes outlined in the ID Resolution tab.
* **Requirement**: You must have `operator` permissions, and BOTH gates (Waypoint Verified and ID Resolution expected) must be cleared.
* **Result**: The backend locks the Excel sheet, appends the new route parameters, synchronizes the database, and flags the submission as `approved`.

### Reject
* **When to select**: The route is unsafe, data is missing, or the waypoint file is corrupt.
* **Action**: Click **"Reject"**. A modal will appear requiring a reason (minimum 10 characters). Provide a clear explanation so the pilot can correct the issue.
* **Result**: The submission state is moved to `rejected`, and no database mutations occur.

### Duplicate
* **When to select**: The exact route submission already exists, or the pilot accidentally double-submitted. (Note: The system also auto-detects some exact duplicates upon ingestion).
* **Action**: Click **"Duplicate"** and confirm the prompt.
* **Result**: The submission state is moved to `duplicate`.

## 6. Edge Cases & Troubleshooting
* **"Submission not found" Error**: The record may have been deleted or the ID is invalid. Return to the Inbox and refresh.
* **"Pipeline Error" Banner**: If a red pipeline error banner shows at the top of a submission, the automated download phase from Google Drive failed (e.g., bad link or permissions issue). You must Reject the submission and notify the pilot to check their linked files.
* **UI Locked / Cannot Approve**: Ensure you have checked off the three boxes on the Waypoint Viewer tab and subsequently inspected the ID Resolution tab. The `Approve` button tooltip will state which gate is blocking you.
