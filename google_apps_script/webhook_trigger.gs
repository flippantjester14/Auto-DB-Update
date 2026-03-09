/**
 * Google Apps Script — RedWing DB Automation Webhook Trigger
 *
 * Attach this script to the Google Sheet linked to your Google Form.
 * Set up an onFormSubmit trigger to call this function.
 *
 * Configuration:
 *   1. Replace WEBHOOK_URL with your backend's URL
 *   2. Replace WEBHOOK_SECRET with your shared secret
 *   3. Map column names in COLUMN_MAP to match your Google Form questions
 */

// ── Configuration ─────────────────────────────────────────────────────────

const WEBHOOK_URL = "https://your-backend-url.com/webhook/new-submission";
const WEBHOOK_SECRET = "changeme"; // Must match .env WEBHOOK_SECRET
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ── Custom Menu (for manual row sync) ───────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🦅 RedWing")
    .addItem("Sync Selected Row", "syncSelectedRow")
    .addToUi();
}

/**
 * Manually sync the active row to the backend.
 */
function syncSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Please select a data row (not the header).");
    return;
  }

  // Reuse onFormSubmit logic by mocking the event object
  const mockEvent = {
    range: sheet.getRange(row, 1, 1, sheet.getLastColumn())
  };

  onFormSubmit(mockEvent);
  SpreadsheetApp.getUi().alert(`Sync triggered for row ${row}`);
}

// Map Google Form column headers → JSON field names
const COLUMN_MAP = {
  "Network Name": "network_name",
  "Source Location Name": "source_location_name",
  "Source Takeoff Zone Name": "source_takeoff_zone_name",
  "Source Takeoff Zone Latitude": "source_latitude",
  "Source Takeoff Zone Longitude": "source_longitude",
  "Destination Location Name": "destination_location_name",
  "Destination Landing Zone Name": "destination_landing_zone_name",
  "Destination Landing Zone Latitude": "destination_latitude",
  "Destination Landing Zone Longitude": "destination_longitude",
  "Takeoff Direction in Degrees": "takeoff_direction",
  "Approach Direction in Degrees": "approach_direction",
  "Mission File Name": "mission_filename",
  "Mission File Google Drive Link": "mission_drive_link",
  "Upload the respective elevation graph and route images of the mission": "images_drive_link"
};

// Numeric fields for parsing
const NUMERIC_FIELDS = [
  "source_latitude", "source_longitude",
  "destination_latitude", "destination_longitude",
  "takeoff_direction", "approach_direction"
];

// ── Trigger Function ──────────────────────────────────────────────────────

/**
 * Core function to send data to the backend.
 * Returns true if successful, or the error message if failed.
 */
function processSubmission(e) {
  try {
    const sheet = e.range.getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = e.range.getRow();
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Build payload
    const payload = {};
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toString().trim();
        const jsonField = COLUMN_MAP[header];
        if (jsonField) {
          let value = values[i];
          if (NUMERIC_FIELDS.includes(jsonField)) {
            value = parseFloat(value);
            if (isNaN(value)) value = 0;
          } else {
            value = value ? value.toString().trim() : "";
          }

          if (jsonField === "images_drive_link") {
            const links = value.split(",").map(s => s.trim()).filter(s => s.length > 0);
            payload["elevation_image_drive_link"] = links[0] || "";
            payload["route_image_drive_link"] = links[1] || links[0] || "";
          } else {
            payload[jsonField] = value;
          }
        }
    }

    // Validate required fields (images are now optional)
    const requiredFields = [
      "network_name", "source_location_name", "source_takeoff_zone_name",
      "source_latitude", "source_longitude",
      "destination_location_name", "destination_landing_zone_name",
      "destination_latitude", "destination_longitude",
      "takeoff_direction", "approach_direction",
      "mission_filename", "mission_drive_link"
    ];
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === "") {
        return `Missing data for: ${field}`;
      }
    }

    // Ensure image fields exist even if empty
    payload["elevation_image_drive_link"] = payload["elevation_image_drive_link"] || "";
    payload["route_image_drive_link"] = payload["route_image_drive_link"] || "";

    // Send to webhook
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const options = {
          method: "post",
          contentType: "application/json",
          headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        };
        const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        const code = response.getResponseCode();
        if (code === 200) return true;
        lastError = `HTTP ${code}: ${response.getContentText()}`;
      } catch (err) {
        lastError = err.toString();
      }
      if (attempt < MAX_RETRIES) Utilities.sleep(RETRY_DELAY_MS * attempt);
    }
    return lastError;
  } catch (err) {
    return `Fatal: ${err.toString()}`;
  }
}

function onFormSubmit(e) {
  const result = processSubmission(e);
  if (result === true) {
    Logger.log("Submission successful");
  } else {
    Logger.log("Submission failed: " + result);
  }
}

function syncSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Select a data row.");
    return;
  }

  const result = processSubmission({
    range: sheet.getRange(row, 1, 1, sheet.getLastColumn())
  });

  if (result === true) {
    SpreadsheetApp.getUi().alert("✅ Success! Submission reaches backend.");
  } else {
    SpreadsheetApp.getUi().alert("❌ Error: " + result);
  }
}

// ── Manual Test Function ──────────────────────────────────────────────────

function testWebhook() {
  const testPayload = {
    network_name: "Hoskote - Network Zero",
    source_location_name: "HQ - Redwing Techworks",
    source_takeoff_zone_name: "HQ North Pad",
    source_latitude: 13.1637751,
    source_longitude: 77.8672772,
    destination_location_name: "Demo Site Alpha",
    destination_landing_zone_name: "Demo Alpha South Pad",
    destination_latitude: 13.21,
    destination_longitude: 77.91,
    takeoff_direction: 180,
    approach_direction: 90,
    mission_filename: "HQ-DEMO-180m.waypoints",
    mission_drive_link: "https://drive.google.com/file/d/xxxxx",
    elevation_image_drive_link: "https://drive.google.com/file/d/yyyyy",
    route_image_drive_link: "https://drive.google.com/file/d/zzzzz",
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-Webhook-Secret": WEBHOOK_SECRET,
    },
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log(`Test response: ${response.getResponseCode()} - ${response.getContentText()}`);
}
