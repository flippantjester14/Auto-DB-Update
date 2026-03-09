"""Unit tests for drive_downloader.py."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from drive_downloader import (
    build_direct_download_url,
    download_file,
    download_submission_files,
    extract_file_id,
    get_mission_stem,
)
from models import SubmissionPayload


class TestExtractFileId:
    """Test Google Drive URL parsing."""

    def test_standard_share_url(self):
        url = "https://drive.google.com/file/d/1aBcDeFgHiJkLmN/view?usp=sharing"
        assert extract_file_id(url) == "1aBcDeFgHiJkLmN"

    def test_open_url(self):
        url = "https://drive.google.com/open?id=1aBcDeFgHiJkLmN"
        assert extract_file_id(url) == "1aBcDeFgHiJkLmN"

    def test_id_param_url(self):
        url = "https://drive.google.com/uc?export=download&id=1aBcDeFgHiJkLmN"
        assert extract_file_id(url) == "1aBcDeFgHiJkLmN"

    def test_bare_file_id(self):
        assert extract_file_id("1aBcDeFgHiJkLmNoPqRsTuVwXyZ") == "1aBcDeFgHiJkLmNoPqRsTuVwXyZ"

    def test_invalid_url(self):
        assert extract_file_id("https://example.com/nothing") is None

    def test_empty_string(self):
        assert extract_file_id("") is None


class TestBuildDownloadUrl:
    def test_correct_format(self):
        url = build_direct_download_url("abc123")
        assert url == "https://drive.google.com/uc?export=download&id=abc123"


class TestGetMissionStem:
    def test_waypoints_extension(self):
        assert get_mission_stem("HQ-DEMO-180m.waypoints") == "HQ-DEMO-180m"

    def test_no_extension(self):
        assert get_mission_stem("mission") == "mission"


class TestDownloadFile:
    """Test file download with mocked HTTP."""

    @pytest.mark.asyncio
    async def test_successful_download(self, tmp_path: Path):
        mock_response = MagicMock()
        mock_response.content = b"fake file data"
        mock_response.raise_for_status = MagicMock()

        with patch("drive_downloader.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            dest = tmp_path / "test.waypoints"
            result = await download_file(
                "https://drive.google.com/file/d/abc123/view", dest
            )
            assert result == dest
            assert dest.read_bytes() == b"fake file data"

    @pytest.mark.asyncio
    async def test_invalid_drive_link(self, tmp_path: Path):
        with pytest.raises(ValueError, match="Could not extract file ID"):
            await download_file("https://example.com/nothing", tmp_path / "out.bin")


class TestDownloadSubmissionFiles:
    """Test full submission file download."""

    @pytest.mark.asyncio
    async def test_filename_construction(self, test_repo_path: Path, sample_payload: SubmissionPayload):
        """Test that files are saved with correct names."""
        with patch("drive_downloader.download_file", new_callable=AsyncMock) as mock_dl:
            mock_dl.return_value = Path("/fake/path")

            result = await download_submission_files(sample_payload, test_repo_path)

            assert result.success
            assert mock_dl.call_count == 3

            # Check mission file path
            call_args = mock_dl.call_args_list
            mission_dest = call_args[0][0][1]
            assert str(mission_dest).endswith("missions/HQ-DEMO-180m.waypoints")

            # Check elevation image path
            elev_dest = call_args[1][0][1]
            assert "HQ-DEMO-180m elevation graph.png" in str(elev_dest)

            # Check route image path
            route_dest = call_args[2][0][1]
            assert "HQ-DEMO-180m flight route.png" in str(route_dest)

    @pytest.mark.asyncio
    async def test_download_failure_returns_error(self, test_repo_path: Path, sample_payload: SubmissionPayload):
        with patch("drive_downloader.download_file", new_callable=AsyncMock) as mock_dl:
            mock_dl.side_effect = Exception("Network error")

            result = await download_submission_files(sample_payload, test_repo_path)
            assert not result.success
            assert "Network error" in result.error
