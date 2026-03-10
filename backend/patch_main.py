import re

with open("main.py", "r") as f:
    content = f.read()

# Add imports
if "from auth import" not in content:
    content = content.replace(
        "from config import Settings, get_settings",
        "from config import Settings, get_settings\nfrom auth import get_current_user, require_role"
    )

# Endpoints needing get_current_user
user_endpoints = [
    r'(async def list_submissions\(\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def get_submission\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def get_waypoint_data\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),\n?\s*settings: Settings = Depends\(get_settings\),?\n?\s*\):)',
    r'(async def resolve_preview\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),\n?\s*settings: Settings = Depends\(get_settings\),?\n?\s*\):)',
    r'(async def get_stats\(\n?\s*settings: Settings = Depends\(get_settings\),\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def get_pipeline_status\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def get_cesium_token\(settings: Settings = Depends\(get_settings\)\):)'
]

for pat in user_endpoints:
    match = re.search(pat, content)
    if match:
        orig = match.group(1)
        if "):" in orig:
            # properly insert before the final closing paren
            new_str = orig.replace("):", ", user: dict = Depends(get_current_user)):")
            content = content.replace(orig, new_str)

# Endpoints needing require_role('operator')
operator_endpoints = [
    r'(async def update_review_state\(\n?\s*submission_id: str,\n?\s*request: ReviewStateUpdateRequest,\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def update_submission_status\(\n?\s*submission_id: str,\n?\s*body: StatusUpdateRequest,\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def mark_as_duplicate\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),?\n?\s*\):)',
    r'(async def download_files\(\n?\s*submission_id: str,\n?\s*store: SubmissionStore = Depends\(get_store\),\n?\s*settings: Settings = Depends\(get_settings\),?\n?\s*\):)',
    r'(async def approve_submission\(\n?\s*submission_id: str,\n?\s*body: ApprovalRequest,\n?\s*store: SubmissionStore = Depends\(get_store\),\n?\s*settings: Settings = Depends\(get_settings\),?\n?\s*\):)'
]

for pat in operator_endpoints:
    match = re.search(pat, content)
    if match:
        orig = match.group(1)
        if "):" in orig:
            new_str = orig.replace("):", ", user: dict = Depends(require_role('operator'))):")
            content = content.replace(orig, new_str)

with open("main.py", "w") as f:
    f.write(content)

print("Patching complete.")
